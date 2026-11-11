import type { ServiceProviderRow } from "../../db/schema";

export type VendorService = "AIRTIME" | "DATA" | "CABLE" | "ELECTRICITY";

export interface PurchaseCommand {
  reference: string;
  service: VendorService;
  amountKobo: number;
  /** Phone number, smartcard number or meter number. */
  customer: string;
  itemCode?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface VendorPurchaseResult {
  status: "success" | "pending" | "failed";
  providerRef: string;
  message: string;
  httpStatus?: number;
  raw?: Record<string, unknown>;
}

export interface VerifyCommand {
  reference: string;
  service: "CABLE" | "ELECTRICITY";
  customer: string;
  itemCode?: string;
}

export interface VendorCustomerResult {
  valid: boolean;
  customerName: string;
  customerAddress?: string;
  message: string;
  httpStatus?: number;
  raw?: Record<string, unknown>;
}

export interface VtuAdapter {
  purchase(command: PurchaseCommand): Promise<VendorPurchaseResult>;
  verifyCustomer(command: VerifyCommand): Promise<VendorCustomerResult>;
}

/** Thrown when the vendor cannot be reached or returns a 5xx. Triggers retry/fallback. */
export class VendorTransportError extends Error {
  readonly httpStatus?: number;

  constructor(message: string, httpStatus?: number) {
    super(message);
    this.name = "VendorTransportError";
    this.httpStatus = httpStatus;
  }
}

export interface RegistryResult<T> {
  result: T;
  provider: ServiceProviderRow;
  attempts: number;
}
