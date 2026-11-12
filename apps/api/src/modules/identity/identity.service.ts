import { createHash, createHmac } from "node:crypto";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  FEES_KOBO,
  IDENTITY_SERVICES,
  generateReference,
  maskIdentifier,
  normalizeNigerianPhone,
  type AdminIdentityRequestDTO,
  type IdentityOverviewDTO,
  type IdentityProductDTO,
  type IdentityRequestDTO,
  type IdentityRequestStatus,
  type IdentityResultDTO,
  type IdentityServiceId,
  type TransactionDTO,
  type WalletDTO,
} from "@paylane/shared";
import type { Request } from "express";
import { env } from "../../config/env";
import { db } from "../../db/client";
import {
  apiKeys,
  ledgerEntries,
  transactions,
  users,
  verificationProducts,
  verificationRequests,
  vendorLogs,
  wallets,
  type TransactionRow,
  type UserRow,
  type VerificationProductRow,
  type VerificationRequestRow,
} from "../../db/schema";
import { getWalletSnapshot } from "../../lib/accounts";
import { recordAudit } from "../../lib/audit";
import { mapTransaction, mapWallet } from "../../lib/dto";
import { errorFactory } from "../../lib/errors";
import { findByIdempotencyKey } from "../wallet/wallet.service";
import { assertTransactionPin } from "../auth/auth.service";
import {
  assertIdentityProviderReady,
  identityAdapter,
  identityAdapterMode,
} from "./identity.provider";
import type {
  adminIdentityQuerySchema,
  updateIdentityProductSchema,
} from "./identity.schema";
import type { z } from "zod";

type AdminQuery = z.infer<typeof adminIdentityQuerySchema>;
type ProductUpdate = z.infer<typeof updateIdentityProductSchema>;

export interface IdentityOutcome {
  request: IdentityRequestDTO;
  transaction: TransactionDTO;
  wallet: WalletDTO;
  kind: "success" | "failed";
  message: string;
  replay: boolean;
}

/* ── Mapping and validation ──────────────────────────────────────────────── */

/** Product rows are keyed by service id; accept the public slug at the edges. */
function resolveProductCode(value: string): string {
  const definition = IDENTITY_SERVICES.find(
    (service) => service.id === value || service.code === value,
  );
  return definition?.id ?? value;
}

export function mapProduct(row: VerificationProductRow): IdentityProductDTO {
  const definition = IDENTITY_SERVICES.find(
    (service) => service.id === row.code || service.code === row.code,
  );
  return {
    id: (definition?.id ?? row.code) as IdentityServiceId,
    code: definition?.code ?? row.code,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    priceKobo: Number(row.priceKobo),
    turnaroundLabel: row.turnaroundLabel,
    resultKind: row.resultKind,
    popular: row.popular,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    fields: row.fields,
  };
}

function mapRequest(
  row: VerificationRequestRow,
  product: VerificationProductRow,
): IdentityRequestDTO {
  return {
    id: row.id,
    reference: row.reference,
    productId: resolveProductCode(product.code) as IdentityServiceId,
    productName: product.name,
    category: product.category,
    status: row.status,
    amountKobo: Number(row.amountKobo),
    subjectMasked: row.subjectMasked,
    summary: row.summary,
    turnaroundLabel: product.turnaroundLabel,
    failureReason: row.failureReason,
    transactionId: row.transactionId,
    result: row.result ?? null,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

function normalizeValue(def: VerificationProductRow["fields"][number], raw: string): string {
  let value = raw.trim();
  if (def.type === "nin" || def.type === "bvn") value = value.replace(/\s+/g, "");
  if (def.type === "phone") {
    const normalized = normalizeNigerianPhone(value);
    if (!normalized) throw errorFactory.validation(`${def.label}: enter a valid Nigerian mobile number.`);
    return normalized;
  }
  return value;
}

function validateFields(
  product: VerificationProductRow,
  input: Record<string, string>,
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const def of product.fields) {
    const raw = input[def.name] ?? "";
    if (!raw.trim()) {
      if (def.required) throw errorFactory.validation(`${def.label} is required.`, { field: def.name });
      continue;
    }

    const value = normalizeValue(def, raw);

    if (def.maxLength && value.length > def.maxLength) {
      throw errorFactory.validation(`${def.label} must be ${def.maxLength} characters or fewer.`, {
        field: def.name,
      });
    }
    if (def.type === "nin" || def.type === "bvn") {
      if (!/^\d{11}$/.test(value)) {
        throw errorFactory.validation(`${def.label} must be exactly 11 digits.`, { field: def.name });
      }
    }
    if (def.type === "date") {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw errorFactory.validation(`${def.label}: use a valid date.`, { field: def.name });
      }
      if (parsed.getTime() > Date.now()) {
        throw errorFactory.validation(`${def.label} cannot be in the future.`, { field: def.name });
      }
    }
    if (def.type === "select" && def.options && !def.options.some((option) => option.value === value)) {
      throw errorFactory.validation(`${def.label}: choose one of the listed options.`, {
        field: def.name,
      });
    }
    if (def.type === "text" && value.length < 2) {
      throw errorFactory.validation(`${def.label} is too short.`, { field: def.name });
    }
    if (def.type === "textarea" && value.length < 10) {
      throw errorFactory.validation(`${def.label} needs at least 10 characters.`, { field: def.name });
    }

    values[def.name] = value;
  }

  return values;
}

function maskSubject(values: Record<string, string>): string {
  const identifier = values.nin ?? values.bvn ?? values.guardianNin;
  if (identifier) return maskIdentifier(identifier);
  const name = `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim();
  if (name) return name;
  const phone = values.phone ?? values.newPhone;
  if (phone) return maskIdentifier(phone);
  return "Identity request";
}

function digestInput(service: string, values: Record<string, string>): string {
  const canonical = JSON.stringify(
    Object.keys(values)
      .sort()
      .map((key) => [key, values[key]]),
  );
  return createHmac("sha256", env.identity.digestSecret)
    .update(`${service}:${canonical}`)
    .digest("hex");
}

function readProduct(code: string): Promise<VerificationProductRow | null> {
  return db
    .select()
    .from(verificationProducts)
    .where(eq(verificationProducts.code, resolveProductCode(code)))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

/* ── Catalog ─────────────────────────────────────────────────────────────── */

export async function listIdentityProducts(
  options: { includeInactive?: boolean } = {},
): Promise<IdentityProductDTO[]> {
  const rows = options.includeInactive
    ? await db.select().from(verificationProducts).orderBy(verificationProducts.sortOrder)
    : await db
        .select()
        .from(verificationProducts)
        .where(eq(verificationProducts.isActive, true))
        .orderBy(verificationProducts.sortOrder);
  return rows.map(mapProduct);
}

/* ── Purchase ────────────────────────────────────────────────────────────── */

interface CreateOptions {
  idempotencyKey: string;
  apiKeyId?: string;
  requirePin: boolean;
}

async function replayOutcome(
  userId: string,
  idempotencyKey: string,
): Promise<IdentityOutcome | null> {
  const existing = await findByIdempotencyKey(userId, idempotencyKey);
  if (!existing?.transaction) return null;

  const [row] = await db
    .select({ request: verificationRequests, product: verificationProducts })
    .from(verificationRequests)
    .innerJoin(verificationProducts, eq(verificationProducts.id, verificationRequests.productId))
    .where(eq(verificationRequests.transactionId, existing.transaction.id))
    .limit(1);

  if (!row) return null;

  const kind = existing.transaction.status === "SUCCESS" ? "success" : "failed";
  return {
    request: mapRequest(row.request, row.product),
    transaction: existing.transaction,
    wallet: existing.wallet,
    kind,
    message:
      kind === "failed"
        ? (row.request.failureReason ?? "This request could not be completed and was refunded.")
        : "This identity request was already processed.",
    replay: true,
  };
}

function logVendorAttempt(input: {
  reference: string;
  service: string;
  outcome: "SUCCESS" | "FAILED";
  durationMs: number;
  error?: string;
  requestKeys: string[];
  digest: string;
}): void {
  const mode = identityAdapterMode();
  void db
    .insert(vendorLogs)
    .values({
      providerCode: mode === "HTTP" ? "IDENTITY_VENDOR" : "IDENTITY_SANDBOX",
      transactionReference: input.reference,
      service: input.service,
      outcome: input.outcome,
      durationMs: input.durationMs,
      requestPayload: { fieldNames: input.requestKeys, digest: input.digest },
      responsePayload: { mode: mode === "HTTP" ? "live vendor" : "sandbox" },
      error: input.error ?? null,
    })
    .catch(() => undefined);
}

async function refundRequest(args: {
  transaction: TransactionRow;
  userId: string;
  amountKobo: number;
  reason: string;
}): Promise<TransactionRow> {
  return db.transaction(async (tx) => {
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

    const now = new Date();
    const balanceAfterKobo = Number(wallet.balanceKobo) + args.amountKobo;

    await tx
      .update(wallets)
      .set({ balanceKobo: balanceAfterKobo, updatedAt: now })
      .where(eq(wallets.id, wallet.id));

    const [updated] = await tx
      .update(transactions)
      .set({
        status: "REFUNDED",
        failureReason: args.reason,
        balanceAfterKobo,
        completedAt: now,
        metadata: {
          ...(transaction.metadata ?? {}),
          providerMessage: args.reason,
        },
        updatedAt: now,
      })
      .where(eq(transactions.id, transaction.id))
      .returning();
    if (!updated) throw new Error("Refund update returned no row");

    await tx.insert(ledgerEntries).values({
      walletId: wallet.id,
      transactionId: transaction.id,
      type: "REFUND",
      amountKobo: args.amountKobo,
      balanceAfterKobo,
      description: `Refund: ${transaction.description}`,
      reference: transaction.reference,
    });

    return updated;
  });
}

/**
 * Charges the wallet, calls the identity vendor, then settles. A failed vendor
 * call is refunded in full; the request row keeps only a masked subject and a
 * digest, never the NIN or BVN that was typed.
 */
export async function createIdentityRequest(
  user: UserRow,
  input: { service: string; fields: Record<string, string>; consent: boolean; pin?: string },
  options: CreateOptions,
): Promise<IdentityOutcome> {
  const replay = await replayOutcome(user.id, options.idempotencyKey);
  if (replay) return replay;

  if (!input.consent) {
    throw errorFactory.validation("Confirm that you have the subject's consent before continuing.");
  }

  const product = await readProduct(input.service);
  if (!product) throw errorFactory.notFound("That identity service does not exist.");
  if (!product.isActive) {
    throw errorFactory.validation("That identity service is temporarily unavailable.");
  }

  assertIdentityProviderReady();

  const values = validateFields(product, input.fields);
  const subjectMasked = maskSubject(values);
  const digest = digestInput(product.code, values);

  if (options.requirePin) {
    await assertTransactionPin(user, input.pin ?? "");
  }

  const reference = generateReference("PLI");
  const priceKobo = Number(product.priceKobo);
  const feeKobo = FEES_KOBO.VERIFICATION;
  const totalKobo = priceKobo + feeKobo;
  const description = `${product.name} · ${subjectMasked}`;

  const created = await db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, user.id))
      .for("update")
      .limit(1);

    if (!wallet) throw errorFactory.notFound("Wallet not found for this account.");
    if (wallet.status === "FROZEN") throw errorFactory.walletFrozen();
    if (Number(wallet.balanceKobo) < totalKobo) throw errorFactory.insufficientFunds();

    const now = new Date();
    const balanceAfterKobo = Number(wallet.balanceKobo) - totalKobo;

    await tx
      .update(wallets)
      .set({ balanceKobo: balanceAfterKobo, updatedAt: now })
      .where(eq(wallets.id, wallet.id));

    const [transaction] = await tx
      .insert(transactions)
      .values({
        userId: user.id,
        reference,
        idempotencyKey: options.idempotencyKey,
        type: "VERIFICATION",
        status: "PENDING",
        description,
        recipient: subjectMasked,
        amountKobo: priceKobo,
        feeKobo,
        balanceAfterKobo,
        metadata: {
          productCode: product.code,
          productName: product.name,
          category: product.category,
          channel: options.apiKeyId ? "API" : "DASHBOARD",
          inputDigest: digest,
        },
      })
      .returning();
    if (!transaction) throw new Error("Transaction insert returned no row");

    await tx.insert(ledgerEntries).values({
      walletId: wallet.id,
      transactionId: transaction.id,
      type: "DEBIT",
      amountKobo: totalKobo,
      balanceAfterKobo,
      description,
      reference,
    });

    const [request] = await tx
      .insert(verificationRequests)
      .values({
        userId: user.id,
        productId: product.id,
        transactionId: transaction.id,
        apiKeyId: options.apiKeyId ?? null,
        reference,
        status: "PENDING",
        amountKobo: priceKobo,
        subjectMasked,
        summary: description,
        inputDigest: digest,
      })
      .returning();
    if (!request) throw new Error("Verification request insert returned no row");

    return { transaction, request };
  });

  const adapter = identityAdapter();
  const startedAt = Date.now();
  let result;
  try {
    result = await adapter.verify({ service: product.code as IdentityServiceId, reference, fields: values });
    if (result.status === "FAILED" && result.retryable) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      result = await adapter.verify({ service: product.code as IdentityServiceId, reference, fields: values });
    }
  } catch (error) {
    result = {
      status: "FAILED" as const,
      reason: "The identity provider returned an unexpected response.",
      retryable: false,
    };
  }

  const durationMs = Date.now() - startedAt;
  logVendorAttempt({
    reference,
    service: product.code,
    outcome: result.status,
    durationMs,
    error: result.status === "FAILED" ? result.reason : undefined,
    requestKeys: Object.keys(values),
    digest,
  });

  if (result.status === "SUCCESS") {
    const completedAt = new Date();
    const [updatedRequest] = await db
      .update(verificationRequests)
      .set({
        status: "SUCCESS",
        result: result.result satisfies IdentityResultDTO,
        providerRef: result.providerRef,
        completedAt,
        updatedAt: completedAt,
      })
      .where(eq(verificationRequests.id, created.request.id))
      .returning();

    const [updatedTransaction] = await db
      .update(transactions)
      .set({
        status: "SUCCESS",
        providerCode: adapter.mode === "HTTP" ? "IDENTITY_VENDOR" : "IDENTITY_SANDBOX",
        providerRef: result.providerRef,
        completedAt,
        metadata: {
          ...(created.transaction.metadata ?? {}),
          providerMessage: "Identity request completed.",
        },
        updatedAt: completedAt,
      })
      .where(eq(transactions.id, created.transaction.id))
      .returning();

    if (!updatedRequest || !updatedTransaction) {
      throw new Error("Identity settlement returned no row");
    }

    const { wallet, ledgerBalanced } = await getWalletSnapshot(user.id);
    return {
      request: mapRequest(updatedRequest, product),
      transaction: mapTransaction(updatedTransaction),
      wallet: mapWallet(wallet, ledgerBalanced),
      kind: "success",
      message: `${product.name} completed.`,
      replay: false,
    };
  }

  const reason = result.reason;
  const refunded = await refundRequest({
    transaction: created.transaction,
    userId: user.id,
    amountKobo: totalKobo,
    reason,
  });

  const [failedRequest] = await db
    .update(verificationRequests)
    .set({
      status: "FAILED",
      failureReason: reason,
      providerRef: result.providerRef ?? null,
      result: null,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(verificationRequests.id, created.request.id))
    .returning();

  const { wallet, ledgerBalanced } = await getWalletSnapshot(user.id);
  return {
    request: mapRequest(failedRequest ?? created.request, product),
    transaction: mapTransaction(refunded),
    wallet: mapWallet(wallet, ledgerBalanced),
    kind: "failed",
    message: `${reason} Your wallet has been refunded.`,
    replay: false,
  };
}

/* ── Customer history ────────────────────────────────────────────────────── */

export async function listMyIdentityRequests(
  userId: string,
  limit = 50,
): Promise<IdentityRequestDTO[]> {
  const rows = await db
    .select({ request: verificationRequests, product: verificationProducts })
    .from(verificationRequests)
    .innerJoin(verificationProducts, eq(verificationProducts.id, verificationRequests.productId))
    .where(eq(verificationRequests.userId, userId))
    .orderBy(desc(verificationRequests.createdAt))
    .limit(limit);
  return rows.map((row) => mapRequest(row.request, row.product));
}

export async function getMyIdentityRequest(
  userId: string,
  reference: string,
): Promise<IdentityRequestDTO> {
  const [row] = await db
    .select({ request: verificationRequests, product: verificationProducts })
    .from(verificationRequests)
    .innerJoin(verificationProducts, eq(verificationProducts.id, verificationRequests.productId))
    .where(
      and(eq(verificationRequests.userId, userId), eq(verificationRequests.reference, reference)),
    )
    .limit(1);
  if (!row) throw errorFactory.notFound("That identity request was not found.");
  return mapRequest(row.request, row.product);
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

export async function getIdentityOverview(): Promise<IdentityOverviewDTO> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [statusRows, todayRows, revenueRows, productRows] = await Promise.all([
    db
      .select({ status: verificationRequests.status, value: count() })
      .from(verificationRequests)
      .groupBy(verificationRequests.status),
    db
      .select({ value: count() })
      .from(verificationRequests)
      .where(gte(verificationRequests.createdAt, startOfDay)),
    db
      .select({ total: sql<string>`coalesce(sum(${verificationRequests.amountKobo}), 0)` })
      .from(verificationRequests)
      .where(eq(verificationRequests.status, "SUCCESS")),
    db
      .select({
        productId: verificationProducts.code,
        name: verificationProducts.name,
        amountKobo: verificationRequests.amountKobo,
      })
      .from(verificationRequests)
      .innerJoin(verificationProducts, eq(verificationProducts.id, verificationRequests.productId))
      .where(eq(verificationRequests.status, "SUCCESS")),
  ]);

  const statusCounts = new Map<IdentityRequestStatus, number>();
  for (const row of statusRows) statusCounts.set(row.status, Number(row.value));

  const totalRequests = [...statusCounts.values()].reduce((sum, value) => sum + value, 0);
  const successCount = statusCounts.get("SUCCESS") ?? 0;
  const failedCount =
    (statusCounts.get("FAILED") ?? 0) + (statusCounts.get("REFUNDED") ?? 0);
  const pendingCount =
    (statusCounts.get("PENDING") ?? 0) + (statusCounts.get("PROCESSING") ?? 0);
  const settled = successCount + failedCount;

  const products = new Map<string, { name: string; count: number; amountKobo: number }>();
  for (const row of productRows) {
    const current = products.get(row.productId) ?? { name: row.name, count: 0, amountKobo: 0 };
    current.count += 1;
    current.amountKobo += Number(row.amountKobo);
    products.set(row.productId, current);
  }

  return {
    totalRequests,
    successCount,
    failedCount,
    pendingCount,
    revenueKobo: Number(revenueRows[0]?.total ?? 0),
    todayCount: Number(todayRows[0]?.value ?? 0),
    successRate: settled === 0 ? 100 : Math.round((successCount / settled) * 100),
    products: [...products.entries()]
      .map(([productId, value]) => ({ productId: productId as IdentityServiceId, ...value }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function listAllIdentityRequests(
  query: AdminQuery,
): Promise<AdminIdentityRequestDTO[]> {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(verificationRequests.status, query.status));
  if (query.service) conditions.push(eq(verificationProducts.code, resolveProductCode(query.service)));
  if (query.q) {
    const pattern = `%${query.q}%`;
    conditions.push(
      or(
        ilike(verificationRequests.reference, pattern),
        ilike(verificationRequests.subjectMasked, pattern),
        ilike(users.email, pattern),
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
      ) as SQL,
    );
  }

  const rows = await db
    .select({
      request: verificationRequests,
      product: verificationProducts,
      user: users,
      apiKeyName: apiKeys.name,
    })
    .from(verificationRequests)
    .innerJoin(verificationProducts, eq(verificationProducts.id, verificationRequests.productId))
    .innerJoin(users, eq(users.id, verificationRequests.userId))
    .leftJoin(apiKeys, eq(apiKeys.id, verificationRequests.apiKeyId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(verificationRequests.createdAt))
    .limit(query.limit);

  return rows.map((row) => ({
    ...mapRequest(row.request, row.product),
    user: {
      id: row.user.id,
      name: `${row.user.firstName} ${row.user.lastName}`.trim(),
      email: row.user.email,
    },
    actorType: row.request.apiKeyId ? "API_KEY" : "SESSION",
    apiKeyName: row.apiKeyName ?? null,
    error: row.request.failureReason,
  }));
}

export async function updateIdentityProduct(
  actor: UserRow,
  code: string,
  input: ProductUpdate,
  request?: Request,
): Promise<IdentityProductDTO> {
  const [product] = await db
    .select()
    .from(verificationProducts)
    .where(eq(verificationProducts.code, resolveProductCode(code)))
    .limit(1);
  if (!product) throw errorFactory.notFound("That identity service does not exist.");

  const [updated] = await db
    .update(verificationProducts)
    .set({
      ...(input.priceKobo !== undefined ? { priceKobo: input.priceKobo } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.turnaroundLabel !== undefined ? { turnaroundLabel: input.turnaroundLabel } : {}),
      updatedAt: new Date(),
    })
    .where(eq(verificationProducts.id, product.id))
    .returning();
  if (!updated) throw new Error("Identity product update returned no row");

  const changes: string[] = [];
  if (input.priceKobo !== undefined) {
    changes.push(`price set to ₦${(input.priceKobo / 100).toLocaleString("en-NG")}`);
  }
  if (input.isActive !== undefined) changes.push(input.isActive ? "switched on" : "switched off");
  if (input.turnaroundLabel !== undefined) changes.push(`turnaround set to ${input.turnaroundLabel}`);

  await recordAudit({
    actor,
    action: "identity.product.updated",
    description: `Updated ${product.name}: ${changes.join("; ")}.`,
    targetType: "verification_product",
    targetId: product.code,
    metadata: { ...input },
    request,
  });

  return mapProduct(updated);
}

/** Drops stored results once the retention window closes. Inputs are never kept. */
export async function purgeExpiredIdentityResults(): Promise<number> {
  const days = env.identity.resultRetentionDays;
  if (!Number.isFinite(days) || days <= 0) return 0;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .update(verificationRequests)
    .set({ result: null, updatedAt: new Date() })
    .where(
      and(
        isNotNull(verificationRequests.result),
        isNotNull(verificationRequests.completedAt),
        lt(verificationRequests.completedAt, cutoff),
      ),
    )
    .returning({ id: verificationRequests.id });
  return rows.length;
}

/** Stable, non-reversible fingerprint used by support when comparing records. */
export function identityDigestPrefix(digest: string): string {
  return createHash("sha256").update(digest).digest("hex").slice(0, 12);
}
