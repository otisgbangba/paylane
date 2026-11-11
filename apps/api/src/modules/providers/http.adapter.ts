import { createHmac } from "node:crypto";
import type { ServiceProviderRow } from "../../db/schema";
import {
  VendorTransportError,
  type PurchaseCommand,
  type VtuAdapter,
  type VendorCustomerResult,
  type VendorPurchaseResult,
  type VerifyCommand,
} from "./types";

const REQUEST_TIMEOUT_MS = 8_000;

function readSecret(providerCode: string, suffix: string): string {
  return process.env[`${providerCode}_${suffix}`] ?? "";
}

/**
 * Generic HTTP vendor adapter. Contract expected from a vendor:
 *   POST {baseUrl}/purchase  → { status: "success"|"pending"|"failed", reference, message }
 *   POST {baseUrl}/verify    → { valid, customerName, customerAddress?, message }
 * Requests carry an Idempotency-Key and an HMAC-SHA256 signature so retries
 * and failover cannot double-charge. Credentials stay in environment variables.
 */
export class HttpVtuAdapter implements VtuAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly provider: ServiceProviderRow) {
    if (!provider.baseUrl) {
      throw new VendorTransportError(`Provider ${provider.code} has no base URL configured.`);
    }
    this.baseUrl = provider.baseUrl.replace(/\/$/, "");
    this.apiKey = readSecret(provider.code, "API_KEY");
    this.apiSecret = readSecret(provider.code, "API_SECRET");
  }

  private async post(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<{ status: number; body: Record<string, unknown> | null }> {
    if (!this.apiKey) {
      throw new VendorTransportError(`Provider ${this.provider.code} is missing its API key.`);
    }

    const body = JSON.stringify(payload);
    const signature = createHmac("sha256", this.apiSecret).update(body).digest("hex");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
          "x-signature": signature,
          "idempotency-key": String(payload.reference ?? ""),
        },
        body,
        signal: controller.signal,
      });
      const parsed = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (response.status >= 500) {
        throw new VendorTransportError("Vendor returned a server error.", response.status);
      }
      return { status: response.status, body: parsed };
    } catch (error) {
      if (error instanceof VendorTransportError) throw error;
      throw new VendorTransportError(
        error instanceof Error && error.name === "AbortError"
          ? "Vendor request timed out."
          : "Could not reach the vendor.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async purchase(command: PurchaseCommand): Promise<VendorPurchaseResult> {
    const { status, body } = await this.post("/purchase", {
      reference: command.reference,
      service: command.service,
      amount: command.amountKobo,
      customer: command.customer,
      itemCode: command.itemCode,
      description: command.description,
      metadata: command.metadata,
    });

    if (status >= 400) {
      return {
        status: "failed",
        providerRef: String(body?.reference ?? ""),
        message: String(body?.message ?? "Vendor rejected the request."),
        httpStatus: status,
        raw: body ?? undefined,
      };
    }

    const normalised = String(body?.status ?? "").toLowerCase();
    const resultStatus =
      normalised === "success" || normalised === "successful"
        ? "success"
        : normalised === "pending"
          ? "pending"
          : "failed";

    return {
      status: resultStatus,
      providerRef: String(body?.reference ?? ""),
      message: String(body?.message ?? "Vendor responded."),
      httpStatus: status,
      raw: body ?? undefined,
    };
  }

  async verifyCustomer(command: VerifyCommand): Promise<VendorCustomerResult> {
    const { status, body } = await this.post("/verify", {
      reference: command.reference,
      service: command.service,
      customer: command.customer,
      itemCode: command.itemCode,
    });

    if (status >= 400) {
      return {
        valid: false,
        customerName: "",
        message: String(body?.message ?? "Vendor could not verify that customer."),
        httpStatus: status,
        raw: body ?? undefined,
      };
    }

    return {
      valid: Boolean(body?.valid),
      customerName: String(body?.customerName ?? ""),
      customerAddress: body?.customerAddress ? String(body.customerAddress) : undefined,
      message: String(body?.message ?? "Verification complete."),
      httpStatus: status,
      raw: body ?? undefined,
    };
  }
}
