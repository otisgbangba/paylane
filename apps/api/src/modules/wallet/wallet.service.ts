import { and, eq } from "drizzle-orm";
import {
  FUNDING_METHOD_LABELS,
  generateReference,
  type TransactionDTO,
  type WalletDTO,
} from "@paylane/shared";
import { db } from "../../db/client";
import { ledgerEntries, transactions, wallets, type UserRow } from "../../db/schema";
import { getWalletSnapshot } from "../../lib/accounts";
import { mapTransaction, mapWallet } from "../../lib/dto";
import { AppError, errorFactory, isUniqueViolation } from "../../lib/errors";
import type { z } from "zod";
import type { fundWalletSchema } from "./wallet.schema";

type FundInput = z.infer<typeof fundWalletSchema>;

export interface FundingResult {
  transaction: TransactionDTO;
  wallet: WalletDTO;
  replay: boolean;
}

export async function findByIdempotencyKey(
  userId: string,
  idempotencyKey: string,
): Promise<{ transaction?: TransactionDTO; wallet: WalletDTO } | null> {
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.idempotencyKey, idempotencyKey)))
    .limit(1);
  if (!existing) return null;
  const { wallet, ledgerBalanced } = await getWalletSnapshot(userId);
  return {
    transaction: mapTransaction(existing),
    wallet: mapWallet(wallet, ledgerBalanced),
  };
}

export async function fundWallet(
  user: UserRow,
  input: FundInput,
  idempotencyKey: string,
): Promise<FundingResult> {
  const existing = await findByIdempotencyKey(user.id, idempotencyKey);
  if (existing?.transaction) {
    return { transaction: existing.transaction, wallet: existing.wallet, replay: true };
  }

  const reference = generateReference("PLF");
  const methodLabel = FUNDING_METHOD_LABELS[input.method];

  try {
    const result = await db.transaction(async (tx) => {
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, user.id))
        .for("update")
        .limit(1);
      if (!wallet) throw errorFactory.notFound("Wallet not found for this account.");
      if (wallet.status === "FROZEN") throw errorFactory.walletFrozen();

      const balanceAfterKobo = Number(wallet.balanceKobo) + input.amountKobo;
      const now = new Date();

      const [transaction] = await tx
        .insert(transactions)
        .values({
          userId: user.id,
          reference,
          idempotencyKey,
          type: "WALLET_FUNDING",
          status: "SUCCESS",
          description: `Wallet funding via ${methodLabel.toLowerCase()}`,
          recipient: "Paylane demo checkout",
          amountKobo: input.amountKobo,
          feeKobo: 0,
          providerCode: "MOCK_CHECKOUT",
          providerRef: `MCK-${reference.slice(-8)}`,
          balanceAfterKobo,
          metadata: { method: input.method, channel: "mock-checkout" },
          completedAt: now,
        })
        .returning();
      if (!transaction) throw new Error("Transaction insert returned no row");

      await tx
        .update(wallets)
        .set({ balanceKobo: balanceAfterKobo, updatedAt: now })
        .where(eq(wallets.id, wallet.id));

      await tx.insert(ledgerEntries).values({
        walletId: wallet.id,
        transactionId: transaction.id,
        type: "CREDIT",
        amountKobo: input.amountKobo,
        balanceAfterKobo,
        description: `Funding via ${methodLabel.toLowerCase()}`,
        reference,
      });

      return transaction;
    });

    const { wallet, ledgerBalanced } = await getWalletSnapshot(user.id);
    return {
      transaction: mapTransaction(result),
      wallet: mapWallet(wallet, ledgerBalanced),
      replay: false,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const raced = await findByIdempotencyKey(user.id, idempotencyKey);
      if (raced?.transaction) {
        return { transaction: raced.transaction, wallet: raced.wallet, replay: true };
      }
      throw new AppError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This payment reference has already been used.",
      );
    }
    throw error;
  }
}
