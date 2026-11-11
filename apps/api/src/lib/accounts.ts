import { eq, sql } from "drizzle-orm";
import type { AdminSection, UserDTO } from "@paylane/shared";
import { db } from "../db/client";
import { adminGrants, ledgerEntries, wallets, type UserRow, type WalletRow } from "../db/schema";
import { mapUser, sectionsForSuperAdmin } from "./dto";
import { errorFactory } from "./errors";

export async function getSectionGrants(userId: string): Promise<AdminSection[]> {
  const rows = await db
    .select({ section: adminGrants.section })
    .from(adminGrants)
    .where(eq(adminGrants.userId, userId));
  return rows.map((row) => row.section);
}

export async function getWalletSnapshot(
  userId: string,
): Promise<{ wallet: WalletRow; ledgerBalanced: boolean }> {
  const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
  if (!wallet) throw errorFactory.notFound("Wallet not found for this account.");

  const [result] = await db
    .select({
      net: sql<string>`coalesce(sum(case when ${ledgerEntries.type} = 'DEBIT' then -${ledgerEntries.amountKobo} else ${ledgerEntries.amountKobo} end), 0)`,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.walletId, wallet.id));

  return {
    wallet,
    ledgerBalanced: Number(result?.net ?? 0) === Number(wallet.balanceKobo),
  };
}

export function sectionsFor(user: { id: string; role: string }): Promise<AdminSection[]> {
  if (user.role === "SUPER_ADMIN") return Promise.resolve(sectionsForSuperAdmin());
  if (user.role !== "ADMIN") return Promise.resolve([]);
  return getSectionGrants(user.id);
}

export async function buildUserDTO(user: UserRow, sections: AdminSection[]): Promise<UserDTO> {
  const { wallet, ledgerBalanced } = await getWalletSnapshot(user.id);
  return mapUser(user, wallet, sections, ledgerBalanced);
}
