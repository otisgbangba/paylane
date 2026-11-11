import { Router, type Response } from "express";
import { requireAuth } from "../../http/middleware/auth";
import { rateLimiter, validateBody } from "../../http/middleware/core";
import { errorFactory } from "../../lib/errors";
import { requireIdempotencyKey } from "../../lib/idempotency";
import { sendFailure, sendSuccess } from "../../lib/respond";
import {
  airtimePurchaseSchema,
  cablePurchaseSchema,
  cableVerifySchema,
  dataPurchaseSchema,
  electricityPurchaseSchema,
  electricityVerifySchema,
} from "./vtu.schema";
import {
  purchaseAirtime,
  purchaseCable,
  purchaseData,
  purchaseElectricity,
  verifyCableCustomer,
  verifyElectricityCustomer,
  type PurchaseOutcome,
} from "./vtu.service";

export const vtuRouter = Router();

const purchaseLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 45,
  keyPrefix: "purchase",
  message: "You are sending requests too quickly. Please wait a moment and try again.",
});

function respondWithPurchase(res: Response, outcome: PurchaseOutcome): void {
  if (outcome.replay) res.setHeader("Idempotent-Replay", "true");

  if (outcome.kind === "failed") {
    sendFailure(
      res,
      422,
      "PROVIDER_REJECTED",
      outcome.message,
      undefined,
      { transaction: outcome.transaction, wallet: outcome.wallet },
    );
    return;
  }

  sendSuccess(
    res,
    {
      transaction: outcome.transaction,
      wallet: outcome.wallet,
      walletDebited: outcome.kind === "success" || outcome.kind === "pending",
      replay: outcome.replay,
    },
    outcome.message,
    { status: outcome.kind },
  );
}

vtuRouter.post(
  "/airtime",
  purchaseLimiter,
  requireAuth,
  validateBody(airtimePurchaseSchema),
  async (req, res) => {
    if (!req.auth) throw errorFactory.unauthorized();
    const outcome = await purchaseAirtime(req.auth.user, req.body, requireIdempotencyKey(req));
    respondWithPurchase(res, outcome);
  },
);

vtuRouter.post(
  "/data",
  purchaseLimiter,
  requireAuth,
  validateBody(dataPurchaseSchema),
  async (req, res) => {
    if (!req.auth) throw errorFactory.unauthorized();
    const outcome = await purchaseData(req.auth.user, req.body, requireIdempotencyKey(req));
    respondWithPurchase(res, outcome);
  },
);

vtuRouter.post(
  "/cable/verify",
  purchaseLimiter,
  requireAuth,
  validateBody(cableVerifySchema),
  async (req, res) => {
    if (!req.auth) throw errorFactory.unauthorized();
    const verification = await verifyCableCustomer(req.body);
    sendSuccess(res, verification, verification.message);
  },
);

vtuRouter.post(
  "/cable",
  purchaseLimiter,
  requireAuth,
  validateBody(cablePurchaseSchema),
  async (req, res) => {
    if (!req.auth) throw errorFactory.unauthorized();
    const outcome = await purchaseCable(req.auth.user, req.body, requireIdempotencyKey(req));
    respondWithPurchase(res, outcome);
  },
);

vtuRouter.post(
  "/electricity/verify",
  purchaseLimiter,
  requireAuth,
  validateBody(electricityVerifySchema),
  async (req, res) => {
    if (!req.auth) throw errorFactory.unauthorized();
    const verification = await verifyElectricityCustomer(req.body);
    sendSuccess(res, verification, verification.message);
  },
);

vtuRouter.post(
  "/electricity",
  purchaseLimiter,
  requireAuth,
  validateBody(electricityPurchaseSchema),
  async (req, res) => {
    if (!req.auth) throw errorFactory.unauthorized();
    const outcome = await purchaseElectricity(
      req.auth.user,
      req.body,
      requireIdempotencyKey(req),
    );
    respondWithPurchase(res, outcome);
  },
);
