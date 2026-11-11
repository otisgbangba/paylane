import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../http/middleware/auth";
import { validateBody } from "../../http/middleware/core";
import { getWalletSnapshot } from "../../lib/accounts";
import { mapLedgerEntry, mapWallet } from "../../lib/dto";
import { requireIdempotencyKey } from "../../lib/idempotency";
import { sendSuccess } from "../../lib/respond";
import { db } from "../../db/client";
import { ledgerEntries } from "../../db/schema";
import { and, desc, eq } from "drizzle-orm";
import { fundWalletSchema } from "./wallet.schema";
import { fundWallet } from "./wallet.service";
import { AppError } from "../../lib/errors";

export const walletRouter = Router();

const ledgerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

walletRouter.get("/", requireAuth, async (req, res) => {
  const auth = req.auth;
  if (!auth) throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue.");
  const { wallet, ledgerBalanced } = await getWalletSnapshot(auth.user.id);
  sendSuccess(res, { wallet: mapWallet(wallet, ledgerBalanced) }, "Wallet loaded.");
});

walletRouter.get("/ledger", requireAuth, async (req, res) => {
  const auth = req.auth;
  if (!auth) throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue.");
  const { limit } = ledgerQuerySchema.parse(req.query);
  const { wallet } = await getWalletSnapshot(auth.user.id);

  const entries = await db
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.walletId, wallet.id)))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit);

  sendSuccess(res, { entries: entries.map(mapLedgerEntry) }, "Ledger loaded.");
});

walletRouter.post(
  "/fund",
  requireAuth,
  validateBody(fundWalletSchema),
  async (req, res) => {
    const auth = req.auth;
    if (!auth) throw new AppError(401, "AUTH_REQUIRED", "Please sign in to continue.");
    const idempotencyKey = requireIdempotencyKey(req);
    const result = await fundWallet(auth.user, req.body, idempotencyKey);

    if (result.replay) res.setHeader("Idempotent-Replay", "true");
    sendSuccess(
      res,
      { transaction: result.transaction, wallet: result.wallet },
      result.replay ? "This funding request was already processed." : "Wallet funded successfully.",
    );
  },
);
