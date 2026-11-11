import { db } from "../../db/client";
import { vendorLogs, type ServiceProviderRow } from "../../db/schema";
import type { PurchaseCommand, VendorCustomerResult, VendorPurchaseResult } from "./types";

function maskAccount(value: string): string {
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}${"•".repeat(Math.min(value.length - 4, 8))}${value.slice(-2)}`;
}

interface LogInput {
  provider: ServiceProviderRow;
  reference: string;
  service: string;
  attempt: number;
  outcome: string;
  durationMs: number;
  httpStatus?: number;
  request: PurchaseCommand | { customer: string; service: string; itemCode?: string };
  response?: VendorPurchaseResult | VendorCustomerResult;
  error?: string;
}

/**
 * Redacted audit trail for every vendor call. Secrets are never included and
 * customer identifiers are masked before they reach the database.
 */
export async function logVendorAttempt(input: LogInput): Promise<void> {
  try {
    await db.insert(vendorLogs).values({
      providerCode: input.provider.code,
      transactionReference: input.reference,
      service: input.service,
      attempt: input.attempt,
      outcome: input.outcome,
      httpStatus: input.httpStatus ?? null,
      durationMs: Math.max(0, Math.round(input.durationMs)),
      requestPayload: {
        service: input.service,
        customer: maskAccount(input.request.customer),
        itemCode: input.request.itemCode ?? null,
        ...("amountKobo" in input.request ? { amountKobo: input.request.amountKobo } : {}),
        ...("description" in input.request ? { description: input.request.description } : {}),
      },
      responsePayload: input.response
        ? {
            status: "status" in input.response ? input.response.status : "verified",
            providerRef: "providerRef" in input.response ? input.response.providerRef : null,
            valid: "valid" in input.response ? input.response.valid : undefined,
            message: input.response.message,
          }
        : null,
      error: input.error ?? null,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        type: "vendor_log_failed",
        provider: input.provider.code,
        reference: input.reference,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
