import { z } from "zod";
import { identityServiceById, type IdentityServiceId } from "@paylane/shared";

const serviceField = z
  .string()
  .trim()
  .refine((value): value is IdentityServiceId => Boolean(identityServiceById(value)), {
    message: "Choose a valid identity service.",
  });

const fieldValues = z.record(z.string(), z.string().max(500)).default({});

export const identityRequestSchema = z.object({
  service: serviceField,
  fields: fieldValues,
  consent: z.boolean(),
  pin: z.string().regex(/^\d{4}$/, "Enter your 4-digit transaction PIN.").optional(),
});

export const apiIdentityRequestSchema = z.object({
  fields: fieldValues,
  consent: z.boolean(),
});

export const adminIdentityQuerySchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REFUNDED"]).optional(),
  service: z.string().trim().max(60).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const updateIdentityProductSchema = z
  .object({
    priceKobo: z.coerce.number().int().min(1_000).max(50_000_000).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
    turnaroundLabel: z.string().trim().min(2).max(60).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to update.",
  });

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2, "Give the key a name.").max(60, "That name is too long."),
  environment: z.enum(["LIVE", "TEST"]).default("LIVE"),
});
