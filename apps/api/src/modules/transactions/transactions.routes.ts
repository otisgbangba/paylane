import { Router } from "express";
import { requireAuth } from "../../http/middleware/auth";
import { sendSuccess } from "../../lib/respond";
import { getWalletSnapshot } from "../../lib/accounts";
import { mapTransaction } from "../../lib/dto";
import { errorFactory } from "../../lib/errors";
import { transactionQuerySchema } from "../wallet/wallet.schema";
import { findUserTransaction, getUserSummary, listUserTransactions } from "./transactions.service";

export const transactionsRouter = Router();

transactionsRouter.get("/summary", requireAuth, async (req, res) => {
  const auth = req.auth;
  if (!auth) throw errorFactory.unauthorized();
  const summary = await getUserSummary(auth.user.id);
  const { wallet, ledgerBalanced } = await getWalletSnapshot(auth.user.id);
  sendSuccess(res, { summary, ledgerBalanced }, "Summary loaded.");
});

transactionsRouter.get("/", requireAuth, async (req, res) => {
  const auth = req.auth;
  if (!auth) throw errorFactory.unauthorized();
  const query = transactionQuerySchema.parse(req.query);
  const { items, total } = await listUserTransactions(auth.user.id, query);
  sendSuccess(res, { transactions: items, total, limit: query.limit, offset: query.offset });
});

transactionsRouter.get("/:reference", requireAuth, async (req, res) => {
  const auth = req.auth;
  if (!auth) throw errorFactory.unauthorized();
  const reference = String(req.params.reference);
  const transaction = await findUserTransaction(auth.user.id, reference);
  if (!transaction) throw errorFactory.notFound("Transaction not found.");
  sendSuccess(res, { transaction }, "Transaction loaded.");
});
