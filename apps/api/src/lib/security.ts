import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import type { AdminSection } from "@paylane/shared";
import { env } from "../config/env";
import { AppError } from "./errors";

const PASSWORD_ROUNDS = 12;
const PIN_ROUNDS = 10;

export function hashPassword(value: string): Promise<string> {
  return bcrypt.hash(value, PASSWORD_ROUNDS);
}

export function verifyPassword(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, PIN_ROUNDS);
}

export function verifyPinHash(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

interface SessionClaims {
  sub: string;
  role: string;
}

export function signSession(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    issuer: "paylane",
    audience: "paylane-web",
  });
}

export function verifySession(token: string): SessionClaims | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, {
      issuer: "paylane",
      audience: "paylane-web",
    });
    if (typeof decoded === "string" || !decoded.sub) return null;
    return { sub: String(decoded.sub), role: String(decoded.role ?? "USER") };
  } catch {
    return null;
  }
}

export function readSessionToken(req: Request): string | null {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[env.cookieName];
  if (cookieToken) return cookieToken;
  const header = req.header("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return null;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    path: "/",
  });
}

export function isAdminSection(value: string): value is AdminSection {
  return ["OVERVIEW", "USERS", "WALLETS", "TRANSACTIONS", "AUDIT", "TEAM"].includes(value);
}

export function assertPinShape(pin: string): void {
  if (!/^\d{4}$/.test(pin)) {
    throw new AppError(422, "VALIDATION_ERROR", "Your transaction PIN must be exactly 4 digits.");
  }
}
