import type {
  AdminSection,
  FundingMethod,
  LedgerEntryDTO,
  MeterType,
  TransactionDTO,
  UserDTO,
  WalletDTO,
} from "@paylane/shared";
import { ADMIN_SECTIONS } from "@paylane/shared";
import type {
  LedgerEntryRow,
  TransactionRow,
  UserRow,
  WalletRow,
} from "../db/schema";

export function mapWallet(wallet: WalletRow, ledgerBalanced: boolean): WalletDTO {
  return {
    id: wallet.id,
    currency: "NGN",
    balanceKobo: Number(wallet.balanceKobo),
    status: wallet.status,
    ledgerBalanced,
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

export function mapUser(
  user: UserRow,
  wallet: WalletRow,
  sections: AdminSection[],
  ledgerBalanced: boolean,
): UserDTO {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isAdmin: user.role === "ADMIN" || user.role === "SUPER_ADMIN",
    isSuperAdmin: user.role === "SUPER_ADMIN",
    adminSections: sections,
    hasPin: Boolean(user.pinHash),
    wallet: mapWallet(wallet, ledgerBalanced),
    createdAt: user.createdAt.toISOString(),
  };
}

export function mapLedgerEntry(entry: LedgerEntryRow): LedgerEntryDTO {
  return {
    id: entry.id,
    type: entry.type,
    amountKobo: Number(entry.amountKobo),
    balanceAfterKobo: Number(entry.balanceAfterKobo),
    description: entry.description,
    reference: entry.reference,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function mapTransaction(
  transaction: TransactionRow,
  user?: { id: string; name: string; email: string },
): TransactionDTO {
  const amountKobo = Number(transaction.amountKobo);
  const feeKobo = Number(transaction.feeKobo);

  return {
    id: transaction.id,
    reference: transaction.reference,
    type: transaction.type,
    status: transaction.status,
    description: transaction.description,
    recipient: transaction.recipient,
    amountKobo,
    feeKobo,
    totalKobo: transaction.type === "WALLET_FUNDING" ? amountKobo : amountKobo + feeKobo,
    providerRef: transaction.providerRef,
    providerCode: transaction.providerCode,
    failureReason: transaction.failureReason,
    balanceAfterKobo:
      transaction.balanceAfterKobo === null ? null : Number(transaction.balanceAfterKobo),
    createdAt: transaction.createdAt.toISOString(),
    completedAt: transaction.completedAt?.toISOString() ?? null,
    metadata: transaction.metadata ?? null,
    ...(user ? { user } : {}),
  };
}

export function sectionsForSuperAdmin(): AdminSection[] {
  return ADMIN_SECTIONS.map((section) => section.key);
}

export function readMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

export function readMetadataMeterType(
  metadata: Record<string, unknown> | null,
): MeterType | null {
  const value = metadata?.meterType;
  return value === "PREPAID" || value === "POSTPAID" ? value : null;
}

export function readMetadataFundingMethod(
  metadata: Record<string, unknown> | null,
): FundingMethod | null {
  const value = metadata?.method;
  return value === "CARD" || value === "BANK_TRANSFER" ? value : null;
}
