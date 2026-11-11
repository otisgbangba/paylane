import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { rateLimiter } from "../../http/middleware/core";
import { AppError } from "../../lib/errors";
import { sendSuccess } from "../../lib/respond";
import { settlePendingTransaction } from "../vtu/vtu.service";

export const webhookRouter = Router();

const webhookLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 120,
  keyPrefix: "webhook",
  message: "Webhook rate limit exceeded.",
});

const payloadSchema = z.object({
  event: z.enum(["transaction.success", "transaction.failed"]),
  reference: z.string().min(4),
  providerRef: z.string().max(120).optional(),
  message: z.string().max(300).optional(),
});

function verifySignature(rawBody: Buffer | undefined, signature: string): boolean {
  if (!rawBody || !signature) return false;
  const provided = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = createHmac("sha256", env.webhookSecret).update(rawBody).digest("hex");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
}

webhookRouter.post(
  "/vendor/:providerCode",
  webhookLimiter,
  async (req, res) => {
    const signature = req.header("x-paylane-signature") ?? "";
    if (!verifySignature(req.rawBody, signature)) {
      throw new AppError(401, "AUTH_REQUIRED", "Invalid webhook signature.");
    }

    const payload = payloadSchema.parse(req.body);
    const result = await settlePendingTransaction({
      reference: payload.reference,
      providerCode: String(req.params.providerCode).toUpperCase(),
      success: payload.event === "transaction.success",
      providerRef: payload.providerRef,
      message: payload.message,
    });

    sendSuccess(res, { reference: payload.reference, status: result.status }, "Webhook accepted.");
  },
);
