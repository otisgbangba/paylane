import { eq, ne, and, or } from "drizzle-orm";
import type { UserDTO } from "@paylane/shared";
import { db } from "../../db/client";
import { users, wallets, type UserRow } from "../../db/schema";
import { buildUserDTO, getSectionGrants, sectionsFor } from "../../lib/accounts";
import { AppError, errorFactory, isUniqueViolation } from "../../lib/errors";
import { hashPassword, hashPin, signSession, verifyPassword, verifyPinHash } from "../../lib/security";
import type { z } from "zod";
import type {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  setPinSchema,
} from "./auth.schema";

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type ProfileInput = z.infer<typeof profileSchema>;
type SetPinInput = z.infer<typeof setPinSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export async function registerUser(
  input: RegisterInput,
): Promise<{ user: UserDTO; token: string }> {
  const [existing] = await db
    .select({ email: users.email, phone: users.phone })
    .from(users)
    .where(or(eq(users.email, input.email), eq(users.phone, input.phone)))
    .limit(1);

  if (existing) {
    throw errorFactory.conflict(
      existing.email === input.email ? "EMAIL_TAKEN" : "PHONE_TAKEN",
      existing.email === input.email
        ? "An account with this email already exists."
        : "An account with this phone number already exists.",
    );
  }

  const [passwordHash, pinHash] = await Promise.all([
    hashPassword(input.password),
    hashPin(input.pin),
  ]);

  try {
    const created = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          passwordHash,
          pinHash,
        })
        .returning();
      if (!user) throw new Error("User insert returned no row");
      const [wallet] = await tx.insert(wallets).values({ userId: user.id }).returning();
      if (!wallet) throw new Error("Wallet insert returned no row");
      return { user, wallet };
    });

    return {
      user: await buildUserDTO(created.user, []),
      token: signSession(created.user.id, created.user.role),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw errorFactory.conflict(
        "ACCOUNT_EXISTS",
        "An account with these details already exists.",
      );
    }
    throw error;
  }
}

export async function loginUser(
  input: LoginInput,
): Promise<{ user: UserDTO; token: string }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError(401, "AUTH_INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  if (!user.isActive) {
    throw new AppError(403, "AUTH_FORBIDDEN", "This account has been deactivated.");
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const sections = await sectionsFor(user);

  return {
    user: await buildUserDTO(user, sections),
    token: signSession(user.id, user.role),
  };
}

export async function updateProfile(
  user: UserRow,
  input: ProfileInput,
): Promise<UserDTO> {
  const [clash] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.phone, input.phone), ne(users.id, user.id)))
    .limit(1);
  if (clash) {
    throw errorFactory.conflict("PHONE_TAKEN", "That phone number is linked to another account.");
  }

  const [updated] = await db
    .update(users)
    .set({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();
  if (!updated) throw errorFactory.notFound("Account not found.");
  return buildUserDTO(updated, await getSectionGrants(updated.id));
}

export async function setTransactionPin(
  user: UserRow,
  input: SetPinInput,
): Promise<void> {
  if (user.pinHash) {
    if (!input.currentPin) {
      throw new AppError(422, "VALIDATION_ERROR", "Enter your current PIN to change it.");
    }
    await assertTransactionPin(user, input.currentPin);
  }

  await db
    .update(users)
    .set({
      pinHash: await hashPin(input.pin),
      pinAttempts: 0,
      pinLockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
}

export async function changePassword(
  user: UserRow,
  input: ChangePasswordInput,
): Promise<void> {
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError(401, "AUTH_INVALID_CREDENTIALS", "Your current password is incorrect.");
  }
  if (await verifyPassword(input.newPassword, user.passwordHash)) {
    throw new AppError(422, "VALIDATION_ERROR", "Choose a password you have not used before.");
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() })
    .where(eq(users.id, user.id));
}

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 10;

/** Verifies a transaction PIN, enforcing a temporary lock after repeated misses. */
export async function assertTransactionPin(user: UserRow, pin: string): Promise<void> {
  if (!user.pinHash) {
    throw new AppError(
      409,
      "AUTH_PIN_NOT_SET",
      "Set a 4-digit transaction PIN before making payments.",
    );
  }

  const now = new Date();
  if (user.pinLockedUntil && user.pinLockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((user.pinLockedUntil.getTime() - now.getTime()) / 60_000));
    throw new AppError(
      423,
      "AUTH_PIN_LOCKED",
      `Too many incorrect PIN attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      { unlocksAt: user.pinLockedUntil.toISOString() },
    );
  }

  if (await verifyPinHash(pin, user.pinHash)) {
    if (user.pinAttempts > 0 || user.pinLockedUntil) {
      await db
        .update(users)
        .set({ pinAttempts: 0, pinLockedUntil: null })
        .where(eq(users.id, user.id));
    }
    return;
  }

  const attempts = user.pinAttempts + 1;
  const locked = attempts >= PIN_MAX_ATTEMPTS;
  await db
    .update(users)
    .set({
      pinAttempts: locked ? 0 : attempts,
      pinLockedUntil: locked ? new Date(now.getTime() + PIN_LOCK_MINUTES * 60_000) : null,
    })
    .where(eq(users.id, user.id));

  if (locked) {
    throw new AppError(
      423,
      "AUTH_PIN_LOCKED",
      `Too many incorrect PIN attempts. Try again in ${PIN_LOCK_MINUTES} minutes.`,
    );
  }

  throw new AppError(
    401,
    "AUTH_PIN_INVALID",
    `Incorrect PIN. ${PIN_MAX_ATTEMPTS - attempts} attempt${PIN_MAX_ATTEMPTS - attempts === 1 ? "" : "s"} left.`,
  );
}
