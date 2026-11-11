import { and, count, desc, eq, gte, ilike, ne, or, type SQL } from "drizzle-orm";
import type {
  TransactionDTO,
  TransactionStatus,
  TransactionType,
} from "@paylane/shared";
import { db } from "../../db/client";
import { transactions, users } from "../../db/schema";
import { mapTransaction } from "../../lib/dto";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface TransactionFilters {
  status?: TransactionStatus;
  type?: TransactionType;
  q?: string;
  limit: number;
  offset: number;
}

export interface TransactionSummary {
  periodDays: number;
  totalSpentKobo: number;
  transactionCount: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  successRate: number;
  serviceMix: { type: TransactionType; amountKobo: number; count: number }[];
}

function userConditions(userId: string, filters: TransactionFilters): SQL[] {
  const conditions: SQL[] = [eq(transactions.userId, userId)];
  if (filters.status) conditions.push(eq(transactions.status, filters.status));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(transactions.reference, pattern),
        ilike(transactions.description, pattern),
        ilike(transactions.recipient, pattern),
      ) as SQL,
    );
  }
  return conditions;
}

export async function listUserTransactions(
  userId: string,
  filters: TransactionFilters,
): Promise<{ items: TransactionDTO[]; total: number }> {
  const where = and(...userConditions(userId, filters));

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
    db.select({ value: count() }).from(transactions).where(where),
  ]);

  return {
    items: rows.map((row) => mapTransaction(row)),
    total: Number(totalRows[0]?.value ?? 0),
  };
}

export async function findUserTransaction(
  userId: string,
  reference: string,
): Promise<TransactionDTO | null> {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.reference, reference)))
    .limit(1);
  return row ? mapTransaction(row) : null;
}

export async function getUserSummary(userId: string): Promise<TransactionSummary> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const rows = await db
    .select({
      type: transactions.type,
      status: transactions.status,
      amountKobo: transactions.amountKobo,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.createdAt, since),
        ne(transactions.type, "WALLET_FUNDING"),
      ),
    );

  let totalSpentKobo = 0;
  let successfulCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  const mix = new Map<TransactionType, { amountKobo: number; count: number }>();

  for (const row of rows) {
    if (row.status === "SUCCESS") {
      successfulCount += 1;
      totalSpentKobo += Number(row.amountKobo);
      const current = mix.get(row.type) ?? { amountKobo: 0, count: 0 };
      current.amountKobo += Number(row.amountKobo);
      current.count += 1;
      mix.set(row.type, current);
    } else if (row.status === "PENDING") {
      pendingCount += 1;
    } else {
      failedCount += 1;
    }
  }

  const completed = successfulCount + failedCount;

  return {
    periodDays: 30,
    totalSpentKobo,
    transactionCount: rows.length,
    successfulCount,
    failedCount,
    pendingCount,
    successRate: completed === 0 ? 100 : Math.round((successfulCount / completed) * 100),
    serviceMix: [...mix.entries()]
      .map(([type, value]) => ({ type, ...value }))
      .sort((a, b) => b.amountKobo - a.amountKobo),
  };
}

export interface AdminTransactionFilters extends TransactionFilters {
  userId?: string;
}

export async function listAllTransactions(
  filters: AdminTransactionFilters,
): Promise<{ items: TransactionDTO[]; total: number }> {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(transactions.status, filters.status));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.userId) conditions.push(eq(transactions.userId, filters.userId));
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(transactions.reference, pattern),
        ilike(transactions.description, pattern),
        ilike(transactions.recipient, pattern),
        ilike(users.email, pattern),
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
      ) as SQL,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        transaction: transactions,
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(where)
      .orderBy(desc(transactions.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
    db
      .select({ value: count() })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(where),
  ]);

  return {
    items: rows.map((row) =>
      mapTransaction(row.transaction, {
        id: row.userId ?? row.transaction.userId,
        name: `${row.firstName ?? "Unknown"} ${row.lastName ?? "user"}`.trim(),
        email: row.email ?? "unknown@paylane",
      }),
    ),
    total: Number(totalRows[0]?.value ?? 0),
  };
}
