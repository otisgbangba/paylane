import { z } from "zod";
import { LIMITS, normalizeNigerianPhone } from "@paylane/shared";

const phoneField = z
  .string()
  .trim()
  .refine((value) => normalizeNigerianPhone(value) !== null, {
    message: "Enter a valid Nigerian mobile number.",
  })
  .transform((value) => normalizeNigerianPhone(value) as string);

const pinField = z.string().regex(/^\d{4}$/, "Your transaction PIN must be exactly 4 digits.");
const networkField = z.enum(["MTN", "AIRTEL", "GLO", "ETISALAT"]);
const wholeNaira = (value: number) => value % 100 === 0;

export const airtimePurchaseSchema = z.object({
  network: networkField,
  phone: phoneField,
  amountKobo: z
    .number()
    .int()
    .min(LIMITS.airtime.minKobo, "Minimum airtime is ₦50.")
    .max(LIMITS.airtime.maxKobo, "Maximum airtime per purchase is ₦50,000.")
    .refine(wholeNaira, "Enter a whole naira amount."),
  pin: pinField,
});

export const dataPurchaseSchema = z.object({
  network: networkField,
  phone: phoneField,
  planId: z.string().uuid("Choose a data plan."),
  pin: pinField,
});

const smartcardField = z
  .string()
  .trim()
  .regex(/^\d{10,12}$/, "Smartcard or IUC numbers are 10 to 12 digits.");

export const cableVerifySchema = z.object({
  provider: z.enum(["DSTV", "GOTV", "STARTIMES"]),
  smartcardNumber: smartcardField,
});

export const cablePurchaseSchema = cableVerifySchema.extend({
  planId: z.string().uuid("Choose a cable plan."),
  pin: pinField,
});

const meterField = z
  .string()
  .trim()
  .regex(/^\d{10,13}$/, "Meter numbers are 10 to 13 digits.");

export const electricityVerifySchema = z.object({
  discoCode: z.string().trim().min(2).max(16),
  meterNumber: meterField,
  meterType: z.enum(["PREPAID", "POSTPAID"]),
});

export const electricityPurchaseSchema = electricityVerifySchema.extend({
  amountKobo: z
    .number()
    .int()
    .min(LIMITS.electricity.minKobo, "Minimum electricity purchase is ₦1,000.")
    .max(LIMITS.electricity.maxKobo, "Maximum electricity purchase is ₦200,000.")
    .refine(wholeNaira, "Enter a whole naira amount."),
  phone: phoneField,
  pin: pinField,
});

export type AirtimeInput = z.infer<typeof airtimePurchaseSchema>;
export type DataInput = z.infer<typeof dataPurchaseSchema>;
export type CableVerifyInput = z.infer<typeof cableVerifySchema>;
export type CableInput = z.infer<typeof cablePurchaseSchema>;
export type ElectricityVerifyInput = z.infer<typeof electricityVerifySchema>;
export type ElectricityInput = z.infer<typeof electricityPurchaseSchema>;
