import { and, eq } from "drizzle-orm";
import {
  CABLE_PROVIDERS,
  FEES_KOBO,
  NETWORKS,
  generateReference,
  type CustomerLookupDTO,
  type TransactionDTO,
  type TransactionType,
  type WalletDTO,
} from "@paylane/shared";
import { db } from "../../db/client";
import {
  cablePlans,
  dataPlans,
  electricityDiscos,
  ledgerEntries,
  transactions,
  wallets,
  type ServiceProviderRow,
  type TransactionRow,
  type UserRow,
} from "../../db/schema";
import { getWalletSnapshot } from "../../lib/accounts";
import { mapTransaction, mapWallet } from "../../lib/dto";
import { AppError, errorFactory } from "../../lib/errors";
import { findByIdempotencyKey } from "../wallet/wallet.service";
import { assertTransactionPin } from "../auth/auth.service";
import { purchaseViaProviders, verifyViaProviders } from "../providers/registry";
import type { VendorPurchaseResult, VendorService } from "../providers/types";
import type {
  AirtimeInput,
  CableInput,
  CableVerifyInput,
  DataInput,
  ElectricityInput,
  ElectricityVerifyInput,
} from "./vtu.schema";

export type PurchaseKind = "success" | "pending" | "failed";

export interface PurchaseOutcome {
  transaction: TransactionDTO;
  wallet: WalletDTO;
  kind: PurchaseKind;
  message: string;
  replay: boolean;
}

export interface VerificationOutcome {
  valid: boolean;
  customer: CustomerLookupDTO;
  message: string;
}

function networkLabel(network: string): string {
  return NETWORKS.find((item) => item.id === network)?.name ?? network;
}

function cableLabel(provider: string): string {
  return CABLE_PROVIDERS.find((item) => item.id === provider)?.name ?? provider;
}

function maskAccount(value: string): string {
  if (value.length <= 6) return value;
  return `${value.slice(0, 3)}${"•".repeat(Math.min(5, value.length - 5))}${value.slice(-2)}`;
}

function kindForStatus(status: TransactionRow["status"]): PurchaseKind {
  if (status === "SUCCESS") return "success";
  if (status === "PENDING") return "pending";
  return "failed";
}

async function replayIfExists(
  userId: string,
  idempotencyKey: string,
): Promise<PurchaseOutcome | null> {
  const existing = await findByIdempotencyKey(userId, idempotencyKey);
  if (!existing?.transaction) return null;
  const kind = kindForStatus(existing.transaction.status);
  return {
    transaction: existing.transaction,
    wallet: existing.wallet,
    kind,
    message:
      kind === "failed"
        ? (existing.transaction.failureReason ?? "This transaction was refunded.")
        : "This request was already processed.",
    replay: true,
  };
}

async function finishOutcome(
  userId: string,
  transaction: TransactionRow,
  kind: PurchaseKind,
  message: string,
  replay = false,
): Promise<PurchaseOutcome> {
  const { wallet, ledgerBalanced } = await getWalletSnapshot(userId);
  return {
    transaction: mapTransaction(transaction),
    wallet: mapWallet(wallet, ledgerBalanced),
    kind,
    message,
    replay,
  };
}

interface ExecuteInput {
  user: UserRow;
  idempotencyKey: string;
  type: Exclude<TransactionType, "WALLET_FUNDING">;
  service: VendorService;
  amountKobo: number;
  feeKobo: number;
  description: string;
  recipient: string;
  metadata: Record<string, unknown>;
  customer: string;
  itemCode?: string;
  referencePrefix: string;
}

/**
 * Debits the wallet, records the ledger entry, calls the vendor and settles the
 * transaction. A vendor failure is rolled back as a REFUND ledger entry; the
 * wallet row is locked so concurrent requests cannot overdraw it.
 */
async function executePurchase(input: ExecuteInput): Promise<PurchaseOutcome> {
  const reference = generateReference(input.referencePrefix);
  const totalKobo = input.amountKobo + input.feeKobo;
  const now = new Date();

  const transaction = await db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, input.user.id))
      .for("update")
      .limit(1);

    if (!wallet) throw errorFactory.notFound("Wallet not found for this account.");
    if (wallet.status === "FROZEN") throw errorFactory.walletFrozen();
    if (Number(wallet.balanceKobo) < totalKobo) throw errorFactory.insufficientFunds();

    const balanceAfterKobo = Number(wallet.balanceKobo) - totalKobo;

    await tx
      .update(wallets)
      .set({ balanceKobo: balanceAfterKobo, updatedAt: now })
      .where(eq(wallets.id, wallet.id));

    const [created] = await tx
      .insert(transactions)
      .values({
        userId: input.user.id,
        reference,
        idempotencyKey: input.idempotencyKey,
        type: input.type,
        status: "PENDING",
        description: input.description,
        recipient: input.recipient,
        amountKobo: input.amountKobo,
        feeKobo: input.feeKobo,
        balanceAfterKobo,
        metadata: input.metadata,
      })
      .returning();
    if (!created) throw new Error("Transaction insert returned no row");

    await tx.insert(ledgerEntries).values({
      walletId: wallet.id,
      transactionId: created.id,
      type: "DEBIT",
      amountKobo: totalKobo,
      balanceAfterKobo,
      description: input.description,
      reference,
    });

    return created;
  });

  let vendorResult: VendorPurchaseResult;
  let provider: ServiceProviderRow;
  try {
    const routed = await purchaseViaProviders({
      reference,
      service: input.service,
      amountKobo: input.amountKobo,
      customer: input.customer,
      itemCode: input.itemCode,
      description: input.description,
      metadata: input.metadata,
    });
    vendorResult = routed.result;
    provider = routed.provider;
  } catch (error) {
    const reason =
      error instanceof AppError && error.code === "PROVIDER_UNAVAILABLE"
        ? error.message
        : "The provider could not be reached. Your wallet has been refunded.";
    const outcome = await refundPurchase({
      transaction,
      userId: input.user.id,
      totalKobo,
      reason,
      provider: null,
      metadata: input.metadata,
    });
    if (error instanceof AppError) return outcome;
    throw error;
  }

  if (vendorResult.status === "failed") {
    return refundPurchase({
      transaction,
      userId: input.user.id,
      totalKobo,
      reason: vendorResult.message,
      provider,
      metadata: { ...input.metadata, providerMessage: vendorResult.message },
    });
  }

  const completedAt = vendorResult.status === "success" ? new Date() : null;
  const [updated] = await db
    .update(transactions)
    .set({
      status: vendorResult.status === "success" ? "SUCCESS" : "PENDING",
      providerId: provider.id,
      providerCode: provider.code,
      providerRef: vendorResult.providerRef || null,
      completedAt,
      metadata: { ...input.metadata, providerMessage: vendorResult.message },
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, transaction.id))
    .returning();

  if (!updated) throw new Error("Transaction finalisation returned no row");

  return finishOutcome(
    input.user.id,
    updated,
    vendorResult.status === "success" ? "success" : "pending",
    vendorResult.message,
  );
}

async function refundPurchase(args: {
  transaction: TransactionRow;
  userId: string;
  totalKobo: number;
  reason: string;
  provider: ServiceProviderRow | null;
  metadata: Record<string, unknown>;
}): Promise<PurchaseOutcome> {
  const refunded = await db.transaction(async (tx) => {
    const [transaction] = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.id, args.transaction.id))
      .for("update")
      .limit(1);
    if (!transaction) throw errorFactory.notFound("Transaction not found.");

    if (transaction.status !== "PENDING") return transaction;

    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, args.userId))
      .for("update")
      .limit(1);
    if (!wallet) throw errorFactory.notFound("Wallet not found for this account.");

    const balanceAfterKobo = Number(wallet.balanceKobo) + args.totalKobo;
    const now = new Date();

    await tx
      .update(wallets)
      .set({ balanceKobo: balanceAfterKobo, updatedAt: now })
      .where(eq(wallets.id, wallet.id));

    const [updated] = await tx
      .update(transactions)
      .set({
        status: "REFUNDED",
        failureReason: args.reason,
        providerId: args.provider?.id ?? null,
        providerCode: args.provider?.code ?? null,
        balanceAfterKobo,
        completedAt: now,
        metadata: args.metadata,
        updatedAt: now,
      })
      .where(eq(transactions.id, transaction.id))
      .returning();
    if (!updated) throw new Error("Refund update returned no row");

    await tx.insert(ledgerEntries).values({
      walletId: wallet.id,
      transactionId: transaction.id,
      type: "REFUND",
      amountKobo: args.totalKobo,
      balanceAfterKobo,
      description: `Refund: ${transaction.description}`,
      reference: transaction.reference,
    });

    return updated;
  });

  return finishOutcome(args.userId, refunded, "failed", args.reason);
}

/**
 * Settles a transaction that a vendor left pending, via a signed webhook.
 * Success closes the hold that was already debited; failure refunds it.
 */
export async function settlePendingTransaction(input: {
  reference: string;
  providerCode: string;
  success: boolean;
  providerRef?: string;
  message?: string;
}): Promise<{ status: string }> {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.reference, input.reference))
    .limit(1);

  if (!transaction) throw errorFactory.notFound("Webhook references an unknown transaction.");
  if (transaction.providerCode && transaction.providerCode !== input.providerCode) {
    throw errorFactory.forbidden("Webhook provider does not match the transaction.");
  }
  if (transaction.status !== "PENDING") {
    return { status: transaction.status };
  }

  if (input.success) {
    await db
      .update(transactions)
      .set({
        status: "SUCCESS",
        providerRef: input.providerRef ?? transaction.providerRef,
        completedAt: new Date(),
        failureReason: null,
        metadata: {
          ...(transaction.metadata ?? {}),
          providerMessage: input.message ?? "Settled by vendor webhook.",
        },
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transaction.id));
    return { status: "SUCCESS" };
  }

  const outcome = await refundPurchase({
    transaction,
    userId: transaction.userId,
    totalKobo: Number(transaction.amountKobo) + Number(transaction.feeKobo),
    reason: input.message ?? "The vendor could not complete this transaction.",
    provider: null,
    metadata: {
      ...(transaction.metadata ?? {}),
      providerMessage: input.message ?? "Failed by vendor webhook.",
    },
  });
  return { status: outcome.transaction.status };
}

/* ── Airtime ─────────────────────────────────────────────────────────────── */

export async function purchaseAirtime(
  user: UserRow,
  input: AirtimeInput,
  idempotencyKey: string,
): Promise<PurchaseOutcome> {
  const replay = await replayIfExists(user.id, idempotencyKey);
  if (replay) return replay;

  await assertTransactionPin(user, input.pin);

  return executePurchase({
    user,
    idempotencyKey,
    type: "AIRTIME",
    service: "AIRTIME",
    amountKobo: input.amountKobo,
    feeKobo: FEES_KOBO.AIRTIME,
    description: `${networkLabel(input.network)} airtime top-up`,
    recipient: input.phone,
    metadata: { network: input.network, phone: input.phone },
    customer: input.phone,
    itemCode: input.network,
    referencePrefix: "PLA",
  });
}

/* ── Data ────────────────────────────────────────────────────────────────── */

export async function purchaseData(
  user: UserRow,
  input: DataInput,
  idempotencyKey: string,
): Promise<PurchaseOutcome> {
  const replay = await replayIfExists(user.id, idempotencyKey);
  if (replay) return replay;

  const [plan] = await db
    .select()
    .from(dataPlans)
    .where(
      and(eq(dataPlans.id, input.planId), eq(dataPlans.network, input.network), eq(dataPlans.isActive, true)),
    )
    .limit(1);
  if (!plan) throw errorFactory.notFound("That data plan is no longer available.");

  await assertTransactionPin(user, input.pin);

  return executePurchase({
    user,
    idempotencyKey,
    type: "DATA",
    service: "DATA",
    amountKobo: Number(plan.priceKobo),
    feeKobo: FEES_KOBO.DATA,
    description: `${networkLabel(input.network)} ${plan.dataLabel} data bundle`,
    recipient: input.phone,
    metadata: {
      network: input.network,
      phone: input.phone,
      planCode: plan.code,
      planName: plan.name,
      dataLabel: plan.dataLabel,
      validity: plan.validityLabel,
    },
    customer: input.phone,
    itemCode: plan.code,
    referencePrefix: "PLD",
  });
}

/* ── Cable TV ────────────────────────────────────────────────────────────── */

export async function verifyCableCustomer(
  input: CableVerifyInput,
): Promise<VerificationOutcome> {
  const reference = generateReference("PLV");
  const { result } = await verifyViaProviders({
    reference,
    service: "CABLE",
    customer: input.smartcardNumber,
    itemCode: input.provider,
  });

  return {
    valid: result.valid,
    customer: {
      customerName: result.customerName,
      provider: cableLabel(input.provider),
      reference,
    },
    message: result.message,
  };
}

export async function purchaseCable(
  user: UserRow,
  input: CableInput,
  idempotencyKey: string,
): Promise<PurchaseOutcome> {
  const replay = await replayIfExists(user.id, idempotencyKey);
  if (replay) return replay;

  const [plan] = await db
    .select()
    .from(cablePlans)
    .where(
      and(
        eq(cablePlans.id, input.planId),
        eq(cablePlans.provider, input.provider),
        eq(cablePlans.isActive, true),
      ),
    )
    .limit(1);
  if (!plan) throw errorFactory.notFound("That cable plan is no longer available.");

  await assertTransactionPin(user, input.pin);

  const verification = await verifyCableCustomer(input);
  if (!verification.valid) {
    throw new AppError(422, "PROVIDER_REJECTED", verification.message);
  }

  const providerName = cableLabel(input.provider);

  return executePurchase({
    user,
    idempotencyKey,
    type: "CABLE",
    service: "CABLE",
    amountKobo: Number(plan.amountKobo),
    feeKobo: FEES_KOBO.CABLE,
    description: `${providerName} ${plan.name}`,
    recipient: maskAccount(input.smartcardNumber),
    metadata: {
      provider: input.provider,
      smartcardNumber: input.smartcardNumber,
      planCode: plan.code,
      planName: plan.name,
      customerName: verification.customer.customerName,
    },
    customer: input.smartcardNumber,
    itemCode: plan.code,
    referencePrefix: "PLC",
  });
}

/* ── Electricity ─────────────────────────────────────────────────────────── */

export async function verifyElectricityCustomer(
  input: ElectricityVerifyInput,
): Promise<VerificationOutcome & { customerAddress?: string }> {
  const [disco] = await db
    .select()
    .from(electricityDiscos)
    .where(and(eq(electricityDiscos.code, input.discoCode), eq(electricityDiscos.isActive, true)))
    .limit(1);
  if (!disco) throw errorFactory.notFound("That electricity provider is not available.");

  const reference = generateReference("PLV");
  const { result } = await verifyViaProviders({
    reference,
    service: "ELECTRICITY",
    customer: input.meterNumber,
    itemCode: input.discoCode,
  });

  return {
    valid: result.valid,
    customer: {
      customerName: result.customerName,
      customerAddress: result.customerAddress,
      meterType: input.meterType,
      provider: disco.name,
      reference,
    },
    customerAddress: result.customerAddress,
    message: result.message,
  };
}

export async function purchaseElectricity(
  user: UserRow,
  input: ElectricityInput,
  idempotencyKey: string,
): Promise<PurchaseOutcome> {
  const replay = await replayIfExists(user.id, idempotencyKey);
  if (replay) return replay;

  const [disco] = await db
    .select()
    .from(electricityDiscos)
    .where(and(eq(electricityDiscos.code, input.discoCode), eq(electricityDiscos.isActive, true)))
    .limit(1);
  if (!disco) throw errorFactory.notFound("That electricity provider is not available.");
  if (input.amountKobo < Number(disco.minKobo) || input.amountKobo > Number(disco.maxKobo)) {
    throw errorFactory.validation(
      `This disco accepts between ₦${Number(disco.minKobo) / 100} and ₦${Number(disco.maxKobo) / 100}.`,
    );
  }

  await assertTransactionPin(user, input.pin);

  const verification = await verifyElectricityCustomer(input);
  if (!verification.valid) {
    throw new AppError(422, "PROVIDER_REJECTED", verification.message);
  }

  return executePurchase({
    user,
    idempotencyKey,
    type: "ELECTRICITY",
    service: "ELECTRICITY",
    amountKobo: input.amountKobo,
    feeKobo: FEES_KOBO.ELECTRICITY,
    description: `${disco.shortName} ${input.meterType.toLowerCase()} electricity`,
    recipient: maskAccount(input.meterNumber),
    metadata: {
      discoCode: disco.code,
      discoName: disco.name,
      meterNumber: input.meterNumber,
      meterType: input.meterType,
      phone: input.phone,
      customerName: verification.customer.customerName,
      customerAddress: verification.customerAddress,
    },
    customer: input.meterNumber,
    itemCode: disco.code,
    referencePrefix: "PLE",
  });
}
