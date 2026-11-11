import { count, eq } from "drizzle-orm";
import type { TransactionStatus, TransactionType } from "@paylane/shared";
import { closeDatabase, db } from "./client";
import {
  adminGrants,
  cablePlans,
  dataPlans,
  electricityDiscos,
  ledgerEntries,
  serviceProviders,
  transactions,
  users,
  wallets,
  type UserRow,
} from "./schema";
import { hashPassword, hashPin } from "../lib/security";

const DEMO_PASSWORD = "Paylane123";
const DEMO_PIN = "1234";

interface SeedUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  pin?: string;
  role?: "USER" | "ADMIN" | "SUPER_ADMIN";
}

interface SeedEvent {
  hoursAgo: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  recipient: string;
  amountKobo: number;
  feeKobo?: number;
  metadata?: Record<string, unknown>;
  reference: string;
  failureReason?: string;
}

async function ensureUser(input: SeedUserInput): Promise<UserRow> {
  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      pinHash: input.pin ? await hashPin(input.pin) : null,
      role: input.role ?? "USER",
    })
    .returning();
  if (!created) throw new Error(`Could not create seed user ${input.email}`);
  await db.insert(wallets).values({ userId: created.id }).onConflictDoNothing();
  return created;
}

async function ensureWallet(userId: string): Promise<string> {
  const [existing] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(wallets).values({ userId }).returning();
  if (!created) throw new Error("Could not create seed wallet");
  return created.id;
}

/**
 * Writes a chronologically consistent ledger. Wallet balance is the sum of
 * credits minus debits, and REFUNDED transactions carry both a debit and a
 * refund entry so reconciliation always nets to zero.
 */
async function seedHistory(userId: string, walletId: string, events: SeedEvent[]): Promise<number> {
  const [existing] = await db
    .select({ value: count() })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  if (Number(existing?.value ?? 0) > 0) return 0;

  const ordered = [...events].sort((a, b) => b.hoursAgo - a.hoursAgo);
  const now = Date.now();
  let balance = 0;

  for (const [index, event] of ordered.entries()) {
    const createdAt = new Date(now - event.hoursAgo * 60 * 60 * 1000);
    const feeKobo = event.feeKobo ?? 0;
    const total = event.amountKobo + feeKobo;
    const isFunding = event.type === "WALLET_FUNDING";

    const debitBalance = isFunding ? balance + event.amountKobo : balance - total;
    balance = debitBalance;

    const [created] = await db
      .insert(transactions)
      .values({
        userId,
        reference: event.reference,
        idempotencyKey: `seed-${userId.slice(0, 8)}-${index + 1}`,
        type: event.type,
        status: event.status,
        description: event.description,
        recipient: event.recipient,
        amountKobo: event.amountKobo,
        feeKobo,
        providerCode: isFunding ? "MOCK_CHECKOUT" : "MOCK_PRIMARY",
        providerRef: isFunding ? `MCK-${event.reference.slice(-6)}` : `MOCK-${event.reference.slice(-6)}`,
        failureReason: event.failureReason ?? null,
        balanceAfterKobo: debitBalance,
        metadata: event.metadata ?? null,
        createdAt,
        updatedAt: createdAt,
        completedAt: event.status === "PENDING" ? null : createdAt,
      })
      .returning({ id: transactions.id });
    if (!created) throw new Error("Seed transaction insert failed");

    await db.insert(ledgerEntries).values({
      walletId,
      transactionId: created.id,
      type: isFunding ? "CREDIT" : "DEBIT",
      amountKobo: isFunding ? event.amountKobo : total,
      balanceAfterKobo: debitBalance,
      description: event.description,
      reference: event.reference,
      createdAt,
    });

    if (event.status === "REFUNDED") {
      balance += total;
      await db.insert(ledgerEntries).values({
        walletId,
        transactionId: created.id,
        type: "REFUND",
        amountKobo: total,
        balanceAfterKobo: balance,
        description: `Refund: ${event.description}`,
        reference: event.reference,
        createdAt: new Date(createdAt.getTime() + 90_000),
      });
      await db
        .update(transactions)
        .set({ balanceAfterKobo: balance })
        .where(eq(transactions.id, created.id));
    }
  }

  await db
    .update(wallets)
    .set({ balanceKobo: balance, updatedAt: new Date() })
    .where(eq(wallets.id, walletId));

  return balance;
}

async function seedProviders(): Promise<void> {
  const providers = [
    {
      code: "MOCK_PRIMARY",
      name: "Sandbox Vendor (Primary)",
      adapter: "MOCK",
      status: "ACTIVE" as const,
      priority: 10,
      supportedServices: ["AIRTIME", "DATA", "CABLE", "ELECTRICITY"],
      config: { alwaysSucceed: false },
    },
    {
      code: "MOCK_BACKUP",
      name: "Sandbox Vendor (Fallback)",
      adapter: "MOCK",
      status: "ACTIVE" as const,
      priority: 20,
      supportedServices: ["AIRTIME", "DATA", "CABLE", "ELECTRICITY"],
      config: { alwaysSucceed: true },
    },
    {
      code: "SANDBOX_HTTP",
      name: "HTTP Vendor Template",
      adapter: "HTTP",
      status: "INACTIVE" as const,
      priority: 5,
      baseUrl: "https://sandbox.vendor.example/api",
      supportedServices: ["AIRTIME", "DATA", "CABLE", "ELECTRICITY"],
      config: { note: "Activate after setting SANDBOX_HTTP_API_KEY and SANDBOX_HTTP_API_SECRET." },
    },
  ];

  for (const provider of providers) {
    await db.insert(serviceProviders).values(provider).onConflictDoNothing();
  }
}

async function seedCatalog(): Promise<void> {
  const plans = [
    { network: "MTN" as const, code: "MTN-1.5GB-30D", name: "MTN 1.5GB Monthly", dataLabel: "1.5GB", validityLabel: "30 days", priceKobo: 100_000, popular: false, sortOrder: 10 },
    { network: "MTN" as const, code: "MTN-3GB-30D", name: "MTN 3GB Monthly", dataLabel: "3GB", validityLabel: "30 days", priceKobo: 150_000, popular: false, sortOrder: 20 },
    { network: "MTN" as const, code: "MTN-6GB-30D", name: "MTN 6GB Monthly", dataLabel: "6GB", validityLabel: "30 days", priceKobo: 250_000, popular: true, sortOrder: 30 },
    { network: "MTN" as const, code: "MTN-10GB-30D", name: "MTN 10GB Monthly", dataLabel: "10GB", validityLabel: "30 days", priceKobo: 400_000, popular: true, sortOrder: 40 },
    { network: "MTN" as const, code: "MTN-20GB-30D", name: "MTN 20GB Monthly", dataLabel: "20GB", validityLabel: "30 days", priceKobo: 750_000, popular: false, sortOrder: 50 },
    { network: "MTN" as const, code: "MTN-40GB-30D", name: "MTN 40GB Monthly", dataLabel: "40GB", validityLabel: "30 days", priceKobo: 1_500_000, popular: false, sortOrder: 60 },
    { network: "AIRTEL" as const, code: "AIR-1.5GB-30D", name: "Airtel 1.5GB Monthly", dataLabel: "1.5GB", validityLabel: "30 days", priceKobo: 100_000, popular: false, sortOrder: 110 },
    { network: "AIRTEL" as const, code: "AIR-3GB-30D", name: "Airtel 3GB Monthly", dataLabel: "3GB", validityLabel: "30 days", priceKobo: 150_000, popular: true, sortOrder: 120 },
    { network: "AIRTEL" as const, code: "AIR-6GB-30D", name: "Airtel 6GB Monthly", dataLabel: "6GB", validityLabel: "30 days", priceKobo: 250_000, popular: false, sortOrder: 130 },
    { network: "AIRTEL" as const, code: "AIR-10GB-30D", name: "Airtel 10GB Monthly", dataLabel: "10GB", validityLabel: "30 days", priceKobo: 400_000, popular: true, sortOrder: 140 },
    { network: "AIRTEL" as const, code: "AIR-25GB-30D", name: "Airtel 25GB Monthly", dataLabel: "25GB", validityLabel: "30 days", priceKobo: 950_000, popular: false, sortOrder: 150 },
    { network: "GLO" as const, code: "GLO-1.8GB-30D", name: "Glo 1.8GB Monthly", dataLabel: "1.8GB", validityLabel: "30 days", priceKobo: 80_000, popular: false, sortOrder: 210 },
    { network: "GLO" as const, code: "GLO-3.9GB-30D", name: "Glo 3.9GB Monthly", dataLabel: "3.9GB", validityLabel: "30 days", priceKobo: 150_000, popular: true, sortOrder: 220 },
    { network: "GLO" as const, code: "GLO-7.7GB-30D", name: "Glo 7.7GB Monthly", dataLabel: "7.7GB", validityLabel: "30 days", priceKobo: 250_000, popular: false, sortOrder: 230 },
    { network: "GLO" as const, code: "GLO-13GB-30D", name: "Glo 13GB Monthly", dataLabel: "13GB", validityLabel: "30 days", priceKobo: 400_000, popular: true, sortOrder: 240 },
    { network: "GLO" as const, code: "GLO-29GB-30D", name: "Glo 29GB Monthly", dataLabel: "29GB", validityLabel: "30 days", priceKobo: 800_000, popular: false, sortOrder: 250 },
    { network: "ETISALAT" as const, code: "9MB-1.5GB-30D", name: "9mobile 1.5GB Monthly", dataLabel: "1.5GB", validityLabel: "30 days", priceKobo: 100_000, popular: false, sortOrder: 310 },
    { network: "ETISALAT" as const, code: "9MB-3GB-30D", name: "9mobile 3GB Monthly", dataLabel: "3GB", validityLabel: "30 days", priceKobo: 150_000, popular: false, sortOrder: 320 },
    { network: "ETISALAT" as const, code: "9MB-7GB-30D", name: "9mobile 7GB Monthly", dataLabel: "7GB", validityLabel: "30 days", priceKobo: 250_000, popular: true, sortOrder: 330 },
    { network: "ETISALAT" as const, code: "9MB-11GB-30D", name: "9mobile 11GB Monthly", dataLabel: "11GB", validityLabel: "30 days", priceKobo: 400_000, popular: false, sortOrder: 340 },
    { network: "ETISALAT" as const, code: "9MB-15GB-30D", name: "9mobile 15GB Monthly", dataLabel: "15GB", validityLabel: "30 days", priceKobo: 500_000, popular: false, sortOrder: 350 },
  ];

  for (const plan of plans) {
    await db.insert(dataPlans).values(plan).onConflictDoNothing();
  }

  const cable = [
    { provider: "DSTV" as const, code: "DSTV-PADI", name: "Padi", amountKobo: 440_000, sortOrder: 10 },
    { provider: "DSTV" as const, code: "DSTV-YANGA", name: "Yanga", amountKobo: 600_000, sortOrder: 20 },
    { provider: "DSTV" as const, code: "DSTV-CONFAM", name: "Confam", amountKobo: 1_100_000, sortOrder: 30 },
    { provider: "DSTV" as const, code: "DSTV-COMPACT", name: "Compact", amountKobo: 1_900_000, sortOrder: 40 },
    { provider: "DSTV" as const, code: "DSTV-PREMIUM", name: "Premium", amountKobo: 4_450_000, sortOrder: 50 },
    { provider: "GOTV" as const, code: "GOTV-SMALLIE", name: "Smallie", amountKobo: 190_000, sortOrder: 110 },
    { provider: "GOTV" as const, code: "GOTV-JINJA", name: "Jinja", amountKobo: 390_000, sortOrder: 120 },
    { provider: "GOTV" as const, code: "GOTV-JOLLI", name: "Jolli", amountKobo: 570_000, sortOrder: 130 },
    { provider: "GOTV" as const, code: "GOTV-MAX", name: "Max", amountKobo: 850_000, sortOrder: 140 },
    { provider: "STARTIMES" as const, code: "ST-BASIC", name: "Basic", amountKobo: 370_000, sortOrder: 210 },
    { provider: "STARTIMES" as const, code: "ST-SMART", name: "Smart", amountKobo: 470_000, sortOrder: 220 },
    { provider: "STARTIMES" as const, code: "ST-CLASSIC", name: "Classic", amountKobo: 550_000, sortOrder: 230 },
  ];

  for (const plan of cable) {
    await db.insert(cablePlans).values(plan).onConflictDoNothing();
  }

  const discos = [
    { code: "IKEDC", name: "Ikeja Electric", shortName: "Ikeja" },
    { code: "EKEDC", name: "Eko Electricity Distribution", shortName: "Eko" },
    { code: "AEDC", name: "Abuja Electricity Distribution", shortName: "Abuja" },
    { code: "PHED", name: "Port Harcourt Electricity Distribution", shortName: "PHED" },
    { code: "IBEDC", name: "Ibadan Electricity Distribution", shortName: "Ibadan" },
    { code: "KEDCO", name: "Kano Electricity Distribution", shortName: "Kano" },
    { code: "KAEDCO", name: "Kaduna Electricity Distribution", shortName: "Kaduna" },
    { code: "JED", name: "Jos Electricity Distribution", shortName: "Jos" },
  ];

  for (const disco of discos) {
    await db.insert(electricityDiscos).values(disco).onConflictDoNothing();
  }
}

async function seedTeam(): Promise<void> {
  const superAdmin = await ensureUser({
    firstName: "Chinedu",
    lastName: "Balogun",
    email: "super@paylane.test",
    phone: "08030000001",
    password: "SuperAdmin123",
    pin: DEMO_PIN,
    role: "SUPER_ADMIN",
  });
  await ensureWallet(superAdmin.id);
  await db
    .insert(adminGrants)
    .values(
      (["OVERVIEW", "USERS", "WALLETS", "TRANSACTIONS", "AUDIT", "TEAM"] as const).map(
        (section) => ({ userId: superAdmin.id, section, grantedById: superAdmin.id }),
      ),
    )
    .onConflictDoNothing();

  const opsAdmin = await ensureUser({
    firstName: "Bisi",
    lastName: "Adeyemi",
    email: "ops@paylane.test",
    phone: "08030000002",
    password: "OpsAdmin123",
    pin: DEMO_PIN,
    role: "ADMIN",
  });
  await ensureWallet(opsAdmin.id);
  await db
    .insert(adminGrants)
    .values(
      (["OVERVIEW", "USERS", "WALLETS", "TRANSACTIONS"] as const).map((section) => ({
        userId: opsAdmin.id,
        section,
        grantedById: superAdmin.id,
      })),
    )
    .onConflictDoNothing();

  const analyst = await ensureUser({
    firstName: "Nneka",
    lastName: "Okafor",
    email: "audit@paylane.test",
    phone: "08030000003",
    password: "AuditAdmin123",
    pin: DEMO_PIN,
    role: "ADMIN",
  });
  await ensureWallet(analyst.id);
  await db
    .insert(adminGrants)
    .values(
      (["AUDIT"] as const).map((section) => ({
        userId: analyst.id,
        section,
        grantedById: superAdmin.id,
      })),
    )
    .onConflictDoNothing();
}

async function seedCustomers(): Promise<void> {
  const adaeze = await ensureUser({
    firstName: "Adaeze",
    lastName: "Okonkwo",
    email: "adaeze@paylane.test",
    phone: "08031234567",
    password: DEMO_PASSWORD,
    pin: DEMO_PIN,
  });
  const adaezeWallet = await ensureWallet(adaeze.id);

  const balance = await seedHistory(adaeze.id, adaezeWallet, [
    { hoursAgo: 28 * 24, type: "WALLET_FUNDING", status: "SUCCESS", description: "Wallet funding via card", recipient: "Paylane demo checkout", amountKobo: 10_000_000, reference: "PL-DEMO-A01", metadata: { method: "CARD" } },
    { hoursAgo: 27 * 24, type: "AIRTIME", status: "SUCCESS", description: "MTN airtime top-up", recipient: "08031234567", amountKobo: 200_000, reference: "PL-DEMO-A02", metadata: { network: "MTN" } },
    { hoursAgo: 24 * 24, type: "DATA", status: "SUCCESS", description: "MTN 10GB data bundle", recipient: "08031234567", amountKobo: 400_000, reference: "PL-DEMO-A03", metadata: { network: "MTN", dataLabel: "10GB" } },
    { hoursAgo: 21 * 24, type: "CABLE", status: "SUCCESS", description: "DStv Compact", recipient: "702•••••41", amountKobo: 1_900_000, reference: "PL-DEMO-A04", metadata: { provider: "DSTV", customerName: "Adaeze Okonkwo" } },
    { hoursAgo: 18 * 24, type: "ELECTRICITY", status: "SUCCESS", description: "Ikeja prepaid electricity", recipient: "450•••••88", amountKobo: 1_500_000, feeKobo: 10_000, reference: "PL-DEMO-A05", metadata: { discoCode: "IKEDC", meterType: "PREPAID" } },
    { hoursAgo: 14 * 24, type: "DATA", status: "SUCCESS", description: "Airtel 1.5GB data bundle", recipient: "08021234567", amountKobo: 100_000, reference: "PL-DEMO-A06", metadata: { network: "AIRTEL", dataLabel: "1.5GB" } },
    { hoursAgo: 10 * 24, type: "WALLET_FUNDING", status: "SUCCESS", description: "Wallet funding via bank transfer", recipient: "Paylane demo checkout", amountKobo: 5_000_000, reference: "PL-DEMO-A07", metadata: { method: "BANK_TRANSFER" } },
    { hoursAgo: 7 * 24, type: "AIRTIME", status: "SUCCESS", description: "Globacom airtime top-up", recipient: "08051234567", amountKobo: 100_000, reference: "PL-DEMO-A08", metadata: { network: "GLO" } },
    { hoursAgo: 5 * 24, type: "CABLE", status: "REFUNDED", description: "DStv Compact", recipient: "702•••••41", amountKobo: 1_900_000, reference: "PL-DEMO-A09", failureReason: "Vendor declined: smartcard is not active.", metadata: { provider: "DSTV" } },
    { hoursAgo: 3 * 24, type: "DATA", status: "SUCCESS", description: "Airtel 3GB data bundle", recipient: "08021234567", amountKobo: 150_000, reference: "PL-DEMO-A10", metadata: { network: "AIRTEL", dataLabel: "3GB" } },
    { hoursAgo: 24, type: "AIRTIME", status: "SUCCESS", description: "9mobile airtime top-up", recipient: "08091234567", amountKobo: 500_000, reference: "PL-DEMO-A11", metadata: { network: "ETISALAT" } },
    { hoursAgo: 2, type: "ELECTRICITY", status: "PENDING", description: "Eko prepaid electricity", recipient: "621•••••00", amountKobo: 300_000, feeKobo: 10_000, reference: "PL-DEMO-A12", metadata: { discoCode: "EKEDC", meterType: "PREPAID", customerName: "Adaeze Okonkwo" } },
  ]);
  console.log(
    balance > 0
      ? `[seed] Demo customer wallet reconciled at ₦${(balance / 100).toLocaleString("en-NG")}`
      : "[seed] Demo customer history already present, left untouched.",
  );

  const tunde = await ensureUser({
    firstName: "Tunde",
    lastName: "Bakare",
    email: "tunde@paylane.test",
    phone: "08141234567",
    password: DEMO_PASSWORD,
    pin: DEMO_PIN,
  });
  const tundeWallet = await ensureWallet(tunde.id);
  await seedHistory(tunde.id, tundeWallet, [
    { hoursAgo: 9 * 24, type: "WALLET_FUNDING", status: "SUCCESS", description: "Wallet funding via card", recipient: "Paylane demo checkout", amountKobo: 3_000_000, reference: "PL-DEMO-T01", metadata: { method: "CARD" } },
    { hoursAgo: 4 * 24, type: "DATA", status: "SUCCESS", description: "MTN 6GB data bundle", recipient: "08141234567", amountKobo: 250_000, reference: "PL-DEMO-T02", metadata: { network: "MTN" } },
  ]);

  const kelechi = await ensureUser({
    firstName: "Kelechi",
    lastName: "Nwosu",
    email: "kelechi@paylane.test",
    phone: "09091234567",
    password: DEMO_PASSWORD,
    pin: DEMO_PIN,
  });
  const kelechiWallet = await ensureWallet(kelechi.id);
  await seedHistory(kelechi.id, kelechiWallet, [
    { hoursAgo: 12 * 24, type: "WALLET_FUNDING", status: "SUCCESS", description: "Wallet funding via bank transfer", recipient: "Paylane demo checkout", amountKobo: 1_200_000, reference: "PL-DEMO-K01", metadata: { method: "BANK_TRANSFER" } },
    { hoursAgo: 2 * 24, type: "CABLE", status: "SUCCESS", description: "GOtv Jolli", recipient: "304•••••19", amountKobo: 570_000, reference: "PL-DEMO-K02", metadata: { provider: "GOTV" } },
  ]);
}

async function main(): Promise<void> {
  console.log("[seed] Seeding Paylane demo data…");
  await seedProviders();
  await seedCatalog();
  await seedTeam();
  await seedCustomers();
  console.log("[seed] Done.");
  console.log("[seed] Customer login: adaeze@paylane.test / Paylane123 (PIN 1234)");
  console.log("[seed] Super admin: super@paylane.test / SuperAdmin123");
  console.log("[seed] Scoped admins: ops@paylane.test / OpsAdmin123 · audit@paylane.test / AuditAdmin123");
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
