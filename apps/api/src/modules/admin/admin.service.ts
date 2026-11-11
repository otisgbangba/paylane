import { and, count, desc, eq, gte, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import {
  ADMIN_SECTIONS,
  type AdminDTO,
  type AdminOverviewDTO,
  type AdminSection,
  type AdminUserDTO,
  type AuditEventDTO,
} from "@paylane/shared";
import type { Request } from "express";
import { db } from "../../db/client";
import {
  adminGrants,
  auditLogs,
  transactions,
  users,
  wallets,
  type AuditLogRow,
  type UserRow,
} from "../../db/schema";
import { recordAudit } from "../../lib/audit";
import { AppError, errorFactory, isUniqueViolation } from "../../lib/errors";
import { hashPassword } from "../../lib/security";
import type { z } from "zod";
import type {
  adminUserQuerySchema,
  createAdminSchema,
  updateAdminSchema,
} from "./admin.schema";

type CreateAdminInput = z.infer<typeof createAdminSchema>;
type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
type UserQuery = z.infer<typeof adminUserQuerySchema>;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function mapAudit(row: AuditLogRow): AuditEventDTO {
  return {
    id: row.id,
    actorName: row.actorName,
    actorEmail: row.actorEmail,
    action: row.action,
    description: row.description,
    targetType: row.targetType,
    targetId: row.targetId,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
  };
}

function toAdminDTO(user: UserRow, sections: AdminSection[]): AdminDTO {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phone: user.phone,
    isActive: user.isActive,
    isSuperAdmin: user.role === "SUPER_ADMIN",
    sections:
      user.role === "SUPER_ADMIN" ? ADMIN_SECTIONS.map((section) => section.key) : sections,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

async function adminDTOFor(userId: string): Promise<AdminDTO> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw errorFactory.notFound("Administrator not found.");
  const grants = await db
    .select({ section: adminGrants.section })
    .from(adminGrants)
    .where(eq(adminGrants.userId, userId));
  return toAdminDTO(
    user,
    grants.map((grant) => grant.section),
  );
}

export async function listAdmins(): Promise<AdminDTO[]> {
  const [admins, grants] = await Promise.all([
    db
      .select()
      .from(users)
      .where(inArray(users.role, ["ADMIN", "SUPER_ADMIN"]))
      .orderBy(desc(users.createdAt)),
    db.select({ userId: adminGrants.userId, section: adminGrants.section }).from(adminGrants),
  ]);

  return admins.map((admin) =>
    toAdminDTO(
      admin,
      grants.filter((grant) => grant.userId === admin.id).map((grant) => grant.section),
    ),
  );
}

export async function createAdmin(
  actor: UserRow,
  input: CreateAdminInput,
  request?: Request,
): Promise<AdminDTO> {
  const [existing] = await db
    .select({ email: users.email, phone: users.phone })
    .from(users)
    .where(or(eq(users.email, input.email), eq(users.phone, input.phone)))
    .limit(1);
  if (existing) {
    throw errorFactory.conflict(
      "ACCOUNT_EXISTS",
      existing.email === input.email
        ? "An account with this email already exists."
        : "That phone number already belongs to an account.",
    );
  }

  const sections = [...new Set(input.sections)];

  let createdUser: UserRow;
  try {
    createdUser = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          passwordHash: await hashPassword(input.password),
          role: "ADMIN",
          isActive: input.isActive ?? true,
        })
        .returning();
      if (!user) throw new Error("Admin insert returned no row");

      await tx.insert(wallets).values({ userId: user.id });
      await tx.insert(adminGrants).values(
        sections.map((section) => ({
          userId: user.id,
          section,
          grantedById: actor.id,
        })),
      );
      return user;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw errorFactory.conflict("ACCOUNT_EXISTS", "Those account details are already in use.");
    }
    throw error;
  }

  await recordAudit({
    actor,
    action: "admin.created",
    description: `Created administrator ${createdUser.email} with access to ${sections.join(", ")}.`,
    targetType: "user",
    targetId: createdUser.id,
    metadata: { sections, isActive: createdUser.isActive },
    request,
  });

  return toAdminDTO(createdUser, sections);
}

export async function updateAdmin(
  actor: UserRow,
  targetId: string,
  input: UpdateAdminInput,
  request?: Request,
): Promise<AdminDTO> {
  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!target) throw errorFactory.notFound("Administrator not found.");
  if (target.role === "SUPER_ADMIN") {
    throw errorFactory.forbidden("The super administrator account cannot be modified.");
  }
  if (target.id === actor.id) {
    throw errorFactory.forbidden("You cannot change your own access.");
  }

  const sections = input.sections ? [...new Set(input.sections)] : undefined;

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetId));

    if (sections) {
      await tx.delete(adminGrants).where(eq(adminGrants.userId, targetId));
      await tx.insert(adminGrants).values(
        sections.map((section) => ({
          userId: targetId,
          section,
          grantedById: actor.id,
        })),
      );
    }
  });

  const changes: string[] = [];
  if (sections) changes.push(`sections set to ${sections.join(", ")}`);
  if (input.isActive !== undefined) changes.push(input.isActive ? "account activated" : "account deactivated");

  await recordAudit({
    actor,
    action: input.isActive === false ? "admin.deactivated" : "admin.updated",
    description: `Updated administrator ${target.email}: ${changes.join("; ")}.`,
    targetType: "user",
    targetId,
    metadata: { sections, isActive: input.isActive },
    request,
  });

  return adminDTOFor(targetId);
}

export async function listUsers(query: UserQuery): Promise<AdminUserDTO[]> {
  const conditions: SQL[] = [eq(users.role, "USER")];
  if (query.q) {
    const pattern = `%${query.q}%`;
    conditions.push(
      or(
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
        ilike(users.email, pattern),
        ilike(users.phone, pattern),
      ) as SQL,
    );
  }

  const rows = await db
    .select({ user: users, wallet: wallets })
    .from(users)
    .leftJoin(wallets, eq(wallets.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(query.limit);

  return rows.map(({ user, wallet }) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phone: user.phone,
    isActive: user.isActive,
    balanceKobo: Number(wallet?.balanceKobo ?? 0),
    walletStatus: wallet?.status ?? "ACTIVE",
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  }));
}

export async function setWalletStatus(
  actor: UserRow,
  userId: string,
  status: "ACTIVE" | "FROZEN",
  request?: Request,
): Promise<AdminUserDTO> {
  if (actor.id === userId) {
    throw errorFactory.forbidden("You cannot freeze your own wallet.");
  }

  const [row] = await db
    .select({ user: users, wallet: wallets })
    .from(users)
    .leftJoin(wallets, eq(wallets.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) throw errorFactory.notFound("Customer not found.");
  if (!row.wallet) throw errorFactory.notFound("This customer has no wallet.");
  if (row.user.role !== "USER") {
    throw errorFactory.forbidden("Use team access controls for administrator accounts.");
  }

  await db
    .update(wallets)
    .set({ status, updatedAt: new Date() })
    .where(eq(wallets.id, row.wallet.id));

  await recordAudit({
    actor,
    action: status === "FROZEN" ? "wallet.frozen" : "wallet.unfrozen",
    description: `${status === "FROZEN" ? "Froze" : "Restored"} the wallet for ${row.user.email}.`,
    targetType: "wallet",
    targetId: row.wallet.id,
    metadata: { customerId: userId, status },
    request,
  });

  return {
    id: row.user.id,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    name: `${row.user.firstName} ${row.user.lastName}`.trim(),
    email: row.user.email,
    phone: row.user.phone,
    isActive: row.user.isActive,
    balanceKobo: Number(row.wallet.balanceKobo),
    walletStatus: status,
    lastLoginAt: row.user.lastLoginAt?.toISOString() ?? null,
    createdAt: row.user.createdAt.toISOString(),
  };
}

export async function getAdminOverview(): Promise<AdminOverviewDTO> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [
    userCountRows,
    walletCountRows,
    adminCountRows,
    liabilityRows,
    todayRows,
    mixRows,
    pendingRows,
    auditRows,
  ] = await Promise.all([
    db.select({ value: count() }).from(users).where(eq(users.role, "USER")),
    db.select({ value: count() }).from(wallets).where(eq(wallets.status, "ACTIVE")),
    db
      .select({ value: count() })
      .from(users)
      .where(inArray(users.role, ["ADMIN", "SUPER_ADMIN"])),
    db.select({ total: sql<string>`coalesce(sum(${wallets.balanceKobo}), 0)` }).from(wallets),
    db
      .select({
        type: transactions.type,
        status: transactions.status,
        amountKobo: transactions.amountKobo,
      })
      .from(transactions)
      .where(gte(transactions.createdAt, startOfDay)),
    db
      .select({
        type: transactions.type,
        amountKobo: transactions.amountKobo,
      })
      .from(transactions)
      .where(and(gte(transactions.createdAt, since), eq(transactions.status, "SUCCESS"))),
    db
      .select({ value: count() })
      .from(transactions)
      .where(eq(transactions.status, "PENDING")),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(6),
  ]);

  let volumeTodayKobo = 0;
  let successful = 0;
  let failed = 0;

  for (const tx of todayRows) {
    if (tx.status === "SUCCESS" && tx.type !== "WALLET_FUNDING") {
      volumeTodayKobo += Number(tx.amountKobo);
    }
    if (tx.status === "SUCCESS") successful += 1;
    if (tx.status === "FAILED" || tx.status === "REFUNDED") failed += 1;
  }

  const mix = new Map<string, { amountKobo: number; count: number }>();
  for (const tx of mixRows) {
    if (tx.type === "WALLET_FUNDING") continue;
    const current = mix.get(tx.type) ?? { amountKobo: 0, count: 0 };
    current.amountKobo += Number(tx.amountKobo);
    current.count += 1;
    mix.set(tx.type, current);
  }

  return {
    totalUsers: Number(userCountRows[0]?.value ?? 0),
    activeWallets: Number(walletCountRows[0]?.value ?? 0),
    adminCount: Number(adminCountRows[0]?.value ?? 0),
    walletLiabilityKobo: Number(liabilityRows[0]?.total ?? 0),
    volumeTodayKobo,
    transactionsToday: todayRows.length,
    successRate: successful + failed === 0 ? 100 : Math.round((successful / (successful + failed)) * 100),
    pendingTransactions: Number(pendingRows[0]?.value ?? 0),
    serviceMix: [...mix.entries()]
      .map(([type, value]) => ({
        type: type as AdminOverviewDTO["serviceMix"][number]["type"],
        ...value,
      }))
      .sort((a, b) => b.amountKobo - a.amountKobo),
    recentAudit: auditRows.map(mapAudit),
  };
}

export async function listAuditEvents(limit = 100): Promise<AuditEventDTO[]> {
  const rows = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  return rows.map(mapAudit);
}

export async function getAdminAccount(id: string): Promise<AdminDTO> {
  const admin = await adminDTOFor(id);
  if (!admin) throw new AppError(404, "NOT_FOUND", "Administrator not found.");
  return admin;
}
