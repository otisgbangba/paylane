import { z } from "zod";
import { LIMITS } from "@paylane/shared";

export const fundWalletSchema = z.object({
  amountKobo: z
    .number()
    .int("Enter a whole naira amount.")
    .min(LIMITS.walletFunding.minKobo, "Minimum funding is ₦500.")
    .max(LIMITS.walletFunding.maxKobo, "Maximum funding per top-up is ₦500,000."),
  method: z.enum(["CARD", "BANK_TRANSFER"]),
});

const transactionTypeValues = [
  "AIRTIME",
  "DATA",
  "CABLE",
  "ELECTRICITY",
  "WALLET_FUNDING",
] as const;

const transactionStatusValues = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;

export const transactionQuerySchema = z.object({
  status: z.enum(transactionStatusValues).optional(),
  type: z.enum(transactionTypeValues).optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
