import { z } from "zod";
import { GRANTABLE_ADMIN_SECTIONS, normalizeNigerianPhone, type AdminSection } from "@paylane/shared";

const sectionValues = GRANTABLE_ADMIN_SECTIONS as [AdminSection, ...AdminSection[]];

const nameField = (label: string) =>
  z.string().trim().min(2, `Enter the ${label}.`).max(60, `The ${label} is too long.`);

const phoneField = z
  .string()
  .trim()
  .refine((value) => normalizeNigerianPhone(value) !== null, {
    message: "Enter a valid Nigerian mobile number.",
  })
  .transform((value) => normalizeNigerianPhone(value) as string);

export const createAdminSchema = z.object({
  firstName: nameField("first name"),
  lastName: nameField("last name"),
  email: z.string().trim().toLowerCase().email("Enter a valid work email."),
  phone: phoneField,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72)
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/\d/, "Include at least one number."),
  sections: z
    .array(z.enum(sectionValues))
    .min(1, "Select at least one section for this administrator."),
  isActive: z.boolean().optional().default(true),
});

export const updateAdminSchema = z
  .object({
    sections: z.array(z.enum(sectionValues)).min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.sections !== undefined || value.isActive !== undefined, {
    message: "Choose a new section scope or activation status.",
  });

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const setWalletStatusSchema = z.object({
  status: z.enum(["ACTIVE", "FROZEN"]),
});

export const adminTransactionQuerySchema = z.object({
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]).optional(),
  type: z
    .enum(["AIRTIME", "DATA", "CABLE", "ELECTRICITY", "WALLET_FUNDING"])
    .optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});
