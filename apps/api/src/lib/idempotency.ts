import type { Request } from "express";
import { AppError } from "./errors";

/**
 * Idempotency keys make retries safe: the same key returns the original
 * transaction instead of charging the wallet twice.
 */
export function requireIdempotencyKey(req: Request): string {
  const key = req.header("idempotency-key")?.trim();
  if (!key || key.length < 8 || key.length > 120) {
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Send an Idempotency-Key header (8–120 characters) with this request.",
    );
  }
  return key;
}
