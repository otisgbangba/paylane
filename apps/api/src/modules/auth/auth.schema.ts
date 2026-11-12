import { z } from "zod";
import { normalizeNigerianPhone } from "@paylane/shared";

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `Enter your ${label}.`)
    .max(60, `${label} is too long.`)
    .regex(/^[A-Za-z][A-Za-z' -]*$/, `Enter a valid ${label}.`);

const phoneField = z
  .string()
  .trim()
  .refine((value) => normalizeNigerianPhone(value) !== null, {
    message: "Enter a valid Nigerian mobile number (for example 0803 123 4567).",
  })
  .transform((value) => normalizeNigerianPhone(value) as string);

const passwordField = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Password is too long.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

const pinField = z.string().regex(/^\d{4}$/, "Your transaction PIN must be exactly 4 digits.");

export const registerSchema = z.object({
  firstName: nameField("first name"),
  lastName: nameField("last name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: phoneField,
  password: passwordField,
  pin: pinField,
  accountType: z.enum(["INDIVIDUAL", "AGENT", "ORGANISATION"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const profileSchema = z.object({
  firstName: nameField("first name"),
  lastName: nameField("last name"),
  phone: phoneField,
});

export const setPinSchema = z.object({
  currentPin: pinField.optional(),
  pin: pinField,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: passwordField,
});
