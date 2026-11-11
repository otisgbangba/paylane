import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { serviceProviders, type ServiceProviderRow } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { HttpVtuAdapter } from "./http.adapter";
import { logVendorAttempt } from "./logger";
import { MockVtuAdapter } from "./mock.adapter";
import {
  VendorTransportError,
  type PurchaseCommand,
  type RegistryResult,
  type VtuAdapter,
  type VendorCustomerResult,
  type VendorPurchaseResult,
  type VerifyCommand,
} from "./types";

const MAX_TRANSPORT_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function adapterFor(provider: ServiceProviderRow): VtuAdapter {
  switch (provider.adapter) {
    case "MOCK":
      return new MockVtuAdapter(provider);
    case "HTTP":
      return new HttpVtuAdapter(provider);
    default:
      throw new VendorTransportError(`No adapter is registered for "${provider.adapter}".`);
  }
}

async function providersFor(service: string): Promise<ServiceProviderRow[]> {
  const rows = await db
    .select()
    .from(serviceProviders)
    .where(eq(serviceProviders.status, "ACTIVE"))
    .orderBy(asc(serviceProviders.priority));

  return rows.filter((provider) => {
    const supported = provider.supportedServices as string[];
    return Array.isArray(supported) && supported.includes(service);
  });
}

/**
 * Executes a purchase across the configured provider chain. Transport errors
 * are retried once per provider and then failed over to the next provider.
 * A business decline (failed result) stops the chain immediately.
 */
export async function purchaseViaProviders(
  command: PurchaseCommand,
): Promise<RegistryResult<VendorPurchaseResult>> {
  const providers = await providersFor(command.service);
  if (providers.length === 0) {
    throw new AppError(
      503,
      "PROVIDER_UNAVAILABLE",
      "No provider is currently able to serve this product.",
    );
  }

  let attempts = 0;

  for (const provider of providers) {
    for (let attempt = 1; attempt <= MAX_TRANSPORT_ATTEMPTS; attempt += 1) {
      attempts += 1;
      const startedAt = performance.now();
      try {
        const result = await adapterFor(provider).purchase(command);
        await logVendorAttempt({
          provider,
          reference: command.reference,
          service: command.service,
          attempt,
          outcome: result.status,
          durationMs: performance.now() - startedAt,
          httpStatus: result.httpStatus,
          request: command,
          response: result,
        });
        return { result, provider, attempts };
      } catch (error) {
        await logVendorAttempt({
          provider,
          reference: command.reference,
          service: command.service,
          attempt,
          outcome: "transport_error",
          durationMs: performance.now() - startedAt,
          httpStatus: error instanceof VendorTransportError ? error.httpStatus : undefined,
          request: command,
          error: error instanceof Error ? error.message : String(error),
        });

        if (!(error instanceof VendorTransportError)) throw error;
        if (attempt < MAX_TRANSPORT_ATTEMPTS) await sleep(RETRY_BACKOFF_MS);
      }
    }
  }

  throw new AppError(
    503,
    "PROVIDER_UNAVAILABLE",
    "All service providers are temporarily unavailable. Your wallet has not been charged.",
  );
}

export async function verifyViaProviders(
  command: VerifyCommand,
): Promise<RegistryResult<VendorCustomerResult>> {
  const providers = await providersFor(command.service);
  if (providers.length === 0) {
    throw new AppError(503, "PROVIDER_UNAVAILABLE", "No provider can verify this customer.");
  }

  let attempts = 0;

  for (const provider of providers) {
    for (let attempt = 1; attempt <= MAX_TRANSPORT_ATTEMPTS; attempt += 1) {
      attempts += 1;
      const startedAt = performance.now();
      try {
        const result = await adapterFor(provider).verifyCustomer(command);
        await logVendorAttempt({
          provider,
          reference: command.reference,
          service: command.service,
          attempt,
          outcome: result.valid ? "verified" : "invalid_customer",
          durationMs: performance.now() - startedAt,
          httpStatus: result.httpStatus,
          request: command,
          response: result,
        });
        return { result, provider, attempts };
      } catch (error) {
        await logVendorAttempt({
          provider,
          reference: command.reference,
          service: command.service,
          attempt,
          outcome: "transport_error",
          durationMs: performance.now() - startedAt,
          httpStatus: error instanceof VendorTransportError ? error.httpStatus : undefined,
          request: command,
          error: error instanceof Error ? error.message : String(error),
        });

        if (!(error instanceof VendorTransportError)) throw error;
        if (attempt < MAX_TRANSPORT_ATTEMPTS) await sleep(RETRY_BACKOFF_MS);
      }
    }
  }

  throw new AppError(
    503,
    "PROVIDER_UNAVAILABLE",
    "Customer verification is temporarily unavailable. Please try again.",
  );
}
