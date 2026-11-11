import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ── Enums ───────────────────────────────────────────────────────────────── */

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN", "SUPER_ADMIN"]);
export const walletStatusEnum = pgEnum("wallet_status", ["ACTIVE", "FROZEN"]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "AIRTIME",
  "DATA",
  "CABLE",
  "ELECTRICITY",
  "WALLET_FUNDING",
]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
]);
export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", ["CREDIT", "DEBIT", "REFUND"]);
export const adminSectionEnum = pgEnum("admin_section", [
  "OVERVIEW",
  "USERS",
  "WALLETS",
  "TRANSACTIONS",
  "AUDIT",
  "TEAM",
]);
export const networkEnum = pgEnum("network", ["MTN", "AIRTEL", "GLO", "ETISALAT"]);
export const cableProviderEnum = pgEnum("cable_provider", ["DSTV", "GOTV", "STARTIMES"]);
export const meterTypeEnum = pgEnum("meter_type", ["PREPAID", "POSTPAID"]);
export const providerStatusEnum = pgEnum("provider_status", ["ACTIVE", "INACTIVE"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

/* ── Identity ────────────────────────────────────────────────────────────── */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  pinHash: text("pin_hash"),
  role: userRoleEnum("role").notNull().default("USER"),
  isActive: boolean("is_active").notNull().default(true),
  pinAttempts: integer("pin_attempts").notNull().default(0),
  pinLockedUntil: timestamp("pin_locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

/**
 * A row per section an administrator may open. TEAM is reserved for the
 * super administrator, who bypasses grant checks entirely.
 */
export const adminGrants = pgTable(
  "admin_grants",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    section: adminSectionEnum("section").notNull(),
    grantedById: uuid("granted_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("admin_grants_user_section_unique").on(table.userId, table.section),
    index("admin_grants_user_idx").on(table.userId),
  ],
);

/* ── Wallets ─────────────────────────────────────────────────────────────── */

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    currency: text("currency").notNull().default("NGN"),
    balanceKobo: bigint("balance_kobo", { mode: "number" }).notNull().default(0),
    status: walletStatusEnum("status").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (table) => [index("wallets_user_idx").on(table.userId)],
);

/* ── Vendors ─────────────────────────────────────────────────────────────── */

export const serviceProviders = pgTable(
  "service_providers",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    adapter: text("adapter").notNull(),
    status: providerStatusEnum("status").notNull().default("ACTIVE"),
    priority: integer("priority").notNull().default(100),
    baseUrl: text("base_url"),
    supportedServices: jsonb("supported_services")
      .$type<string[]>()
      .notNull()
      .default([]),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [index("service_providers_priority_idx").on(table.priority)],
);

/* ── Transactions & ledger ───────────────────────────────────────────────── */

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reference: text("reference").notNull().unique(),
    idempotencyKey: text("idempotency_key").notNull(),
    type: transactionTypeEnum("type").notNull(),
    status: transactionStatusEnum("status").notNull().default("PENDING"),
    description: text("description").notNull(),
    recipient: text("recipient").notNull(),
    amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
    feeKobo: bigint("fee_kobo", { mode: "number" }).notNull().default(0),
    providerId: uuid("provider_id").references(() => serviceProviders.id, {
      onDelete: "set null",
    }),
    providerRef: text("provider_ref"),
    providerCode: text("provider_code"),
    failureReason: text("failure_reason"),
    balanceAfterKobo: bigint("balance_after_kobo", { mode: "number" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("transactions_user_idempotency_unique").on(table.userId, table.idempotencyKey),
    index("transactions_user_created_idx").on(table.userId, table.createdAt),
    index("transactions_status_idx").on(table.status),
    index("transactions_type_idx").on(table.type),
  ],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    type: ledgerEntryTypeEnum("type").notNull(),
    amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
    balanceAfterKobo: bigint("balance_after_kobo", { mode: "number" }).notNull(),
    description: text("description").notNull(),
    reference: text("reference").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ledger_wallet_created_idx").on(table.walletId, table.createdAt),
    index("ledger_reference_idx").on(table.reference),
  ],
);

/** Immutable, redacted record of every outbound vendor request. */
export const vendorLogs = pgTable(
  "vendor_logs",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    providerCode: text("provider_code").notNull(),
    transactionReference: text("transaction_reference").notNull(),
    service: text("service").notNull(),
    attempt: integer("attempt").notNull().default(1),
    outcome: text("outcome").notNull(),
    httpStatus: integer("http_status"),
    durationMs: integer("duration_ms").notNull(),
    requestPayload: jsonb("request_payload").$type<Record<string, unknown>>(),
    responsePayload: jsonb("response_payload").$type<Record<string, unknown>>(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("vendor_logs_created_idx").on(table.createdAt)],
);

/* ── Service catalogs ────────────────────────────────────────────────────── */

export const dataPlans = pgTable(
  "data_plans",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    network: networkEnum("network").notNull(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    dataLabel: text("data_label").notNull(),
    validityLabel: text("validity_label").notNull(),
    priceKobo: bigint("price_kobo", { mode: "number" }).notNull(),
    popular: boolean("popular").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("data_plans_network_idx").on(table.network)],
);

export const cablePlans = pgTable(
  "cable_plans",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    provider: cableProviderEnum("provider").notNull(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
    durationLabel: text("duration_label").notNull().default("1 month"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("cable_plans_provider_idx").on(table.provider)],
);

export const electricityDiscos = pgTable("electricity_discos", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  minKobo: bigint("min_kobo", { mode: "number" }).notNull().default(100_000),
  maxKobo: bigint("max_kobo", { mode: "number" }).notNull().default(20_000_000),
  isActive: boolean("is_active").notNull().default(true),
});

/* ── Auditing ────────────────────────────────────────────────────────────── */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    description: text("description").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ipAddress: text("ip_address"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("audit_logs_created_idx").on(table.createdAt)],
);

/* ── Inferred types ──────────────────────────────────────────────────────── */

export type UserRow = typeof users.$inferSelect;
export type WalletRow = typeof wallets.$inferSelect;
export type TransactionRow = typeof transactions.$inferSelect;
export type LedgerEntryRow = typeof ledgerEntries.$inferSelect;
export type ServiceProviderRow = typeof serviceProviders.$inferSelect;
export type DataPlanRow = typeof dataPlans.$inferSelect;
export type CablePlanRow = typeof cablePlans.$inferSelect;
export type ElectricityDiscoRow = typeof electricityDiscos.$inferSelect;
export type AdminGrantRow = typeof adminGrants.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
