import {
  VendorTransportError,
  type PurchaseCommand,
  type VtuAdapter,
  type VendorCustomerResult,
  type VendorPurchaseResult,
  type VerifyCommand,
} from "./types";
import type { ServiceProviderRow } from "../../db/schema";

const CUSTOMER_NAMES = [
  "Adebayo Ogunleye",
  "Chiamaka Nwosu",
  "Ibrahim Musa",
  "Funke Adeyemi",
  "Emeka Obi",
  "Aisha Bello",
  "Tunde Bakare",
  "Ngozi Eze",
  "Yusuf Danjuma",
  "Kemi Alabi",
];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nameFor(value: string, offset = 0): string {
  const digit = Number(value.slice(-1)) || 0;
  return CUSTOMER_NAMES[(digit + offset) % CUSTOMER_NAMES.length] ?? "Paylane Customer";
}

/**
 * Deterministic sandbox vendor used by the seeded providers.
 *
 * Triggers, useful for exercising every branch of the ledger:
 *  - phone ending 0000  → vendor declines (wallet refunded)
 *  - phone ending 1111  → transport error (retry, then failover provider)
 *  - meter ending 00    → purchase accepted but left PENDING
 *  - smartcard ending 000 → verification fails
 */
export class MockVtuAdapter implements VtuAdapter {
  constructor(private readonly provider: ServiceProviderRow) {}

  async purchase(command: PurchaseCommand): Promise<VendorPurchaseResult> {
    const alwaysSucceed = Boolean(
      (this.provider.config as Record<string, unknown> | null)?.alwaysSucceed,
    );
    await wait(160 + Math.floor(Math.random() * 240));

    if (!alwaysSucceed && command.customer.endsWith("1111")) {
      throw new VendorTransportError("Simulated upstream timeout.");
    }

    if (!alwaysSucceed && command.customer.endsWith("0000")) {
      return {
        status: "failed",
        providerRef: `${this.provider.code}-${command.reference.slice(-8)}`,
        message: "Vendor declined: the destination account is barred.",
      };
    }

    if (command.service === "ELECTRICITY" && command.customer.endsWith("00")) {
      return {
        status: "pending",
        providerRef: `${this.provider.code}-${command.reference.slice(-8)}`,
        message: "Vendor accepted the token request; awaiting disco confirmation.",
      };
    }

    return {
      status: "success",
      providerRef: `${this.provider.code}-${command.reference.slice(-8)}`,
      message: "Vendor accepted the request.",
    };
  }

  async verifyCustomer(command: VerifyCommand): Promise<VendorCustomerResult> {
    await wait(120 + Math.floor(Math.random() * 180));

    if (command.customer.endsWith("000")) {
      return {
        valid: false,
        customerName: "",
        message: "No customer record matched that number.",
      };
    }

    if (command.service === "CABLE") {
      return {
        valid: true,
        customerName: nameFor(command.customer),
        message: "Smartcard verified.",
      };
    }

    return {
      valid: true,
      customerName: nameFor(command.customer, 3),
      customerAddress: `${Number(command.customer.slice(-3)) || 12} Adeola Odeku Street, Victoria Island, Lagos`,
      message: "Meter verified.",
    };
  }
}
