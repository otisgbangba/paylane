/**
 * @paylane/shared — the API contract shared by the Express service and the
 * Next.js client. Keep this package free of runtime dependencies so both
 * runtimes can consume it safely.
 */

export const CURRENCY = "NGN" as const;

/* ── Response envelope ───────────────────────────────────────────────────── */

export type ApiStatus = "success" | "pending" | "failed";

export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface ApiSuccess<T> {
  success: true;
  status: "success" | "pending";
  message: string;
  data: T;
  meta: ApiMeta;
}

export interface ApiFailure<T = unknown> {
  success: false;
  status: "failed";
  message: string;
  error: {
    code: ApiErrorCode | (string & {});
    details?: unknown;
  };
  meta: ApiMeta;
  /** Present when a processed transaction failed, so the client can show the receipt. */
  data?: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure<T>;

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_PIN_NOT_SET"
  | "AUTH_PIN_INVALID"
  | "AUTH_PIN_LOCKED"
  | "AUTH_FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INSUFFICIENT_FUNDS"
  | "WALLET_FROZEN"
  | "IDEMPOTENCY_CONFLICT"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_REJECTED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

/* ── Domain primitives ───────────────────────────────────────────────────── */

export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
export type WalletStatus = "ACTIVE" | "FROZEN";
export type TransactionType =
  | "AIRTIME"
  | "DATA"
  | "CABLE"
  | "ELECTRICITY"
  | "WALLET_FUNDING";
export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type LedgerEntryType = "CREDIT" | "DEBIT" | "REFUND";
export type NetworkId = "MTN" | "AIRTEL" | "GLO" | "ETISALAT";
export type CableProviderId = "DSTV" | "GOTV" | "STARTIMES";
export type MeterType = "PREPAID" | "POSTPAID";
export type FundingMethod = "CARD" | "BANK_TRANSFER";

/* ── Admin sections ──────────────────────────────────────────────────────── */

export const ADMIN_SECTIONS = [
  {
    key: "OVERVIEW",
    label: "Admin overview",
    description: "Platform metrics, volume and administrative health at a glance.",
  },
  {
    key: "USERS",
    label: "Customer accounts",
    description: "Search customers, view profiles and account status.",
  },
  {
    key: "WALLETS",
    label: "Wallets & funding",
    description: "Inspect balances, review the ledger and freeze wallets.",
  },
  {
    key: "TRANSACTIONS",
    label: "Transactions",
    description: "Review every purchase and settlement across the platform.",
  },
  {
    key: "AUDIT",
    label: "Audit trail",
    description: "Read the record of administrative actions and access changes.",
  },
  {
    key: "TEAM",
    label: "Team & access",
    description: "Create administrators and assign exactly which sections they can use.",
  },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["key"];

export const GRANTABLE_ADMIN_SECTIONS: AdminSection[] = ADMIN_SECTIONS
  .map((section) => section.key)
  .filter((key) => key !== "TEAM");

/* ── Networks ────────────────────────────────────────────────────────────── */

export interface NetworkDefinition {
  id: NetworkId;
  name: string;
  short: string;
  color: string;
  tint: string;
}

export const NETWORKS: NetworkDefinition[] = [
  { id: "MTN", name: "MTN Nigeria", short: "M", color: "#FFCB05", tint: "#FFF7D6" },
  { id: "AIRTEL", name: "Airtel Nigeria", short: "A", color: "#E40000", tint: "#FDECEC" },
  { id: "GLO", name: "Globacom", short: "G", color: "#00A651", tint: "#E7F8EF" },
  { id: "ETISALAT", name: "9mobile", short: "9", color: "#006B3F", tint: "#E6F2ED" },
];

export const CABLE_PROVIDERS: { id: CableProviderId; name: string; color: string }[] = [
  { id: "DSTV", name: "DStv", color: "#0072CE" },
  { id: "GOTV", name: "GOtv", color: "#5BC500" },
  { id: "STARTIMES", name: "StarTimes", color: "#F5A623" },
];

/* ── Fees & limits (server authoritative, mirrored for form previews) ────── */

export const FEES_KOBO: Record<Exclude<TransactionType, "WALLET_FUNDING">, number> = {
  AIRTIME: 0,
  DATA: 0,
  CABLE: 0,
  ELECTRICITY: 10_000,
};

export const LIMITS = {
  airtime: { minKobo: 5_000, maxKobo: 5_000_000 },
  electricity: { minKobo: 100_000, maxKobo: 20_000_000 },
  walletFunding: { minKobo: 50_000, maxKobo: 50_000_000 },
} as const;

/* ── DTOs ────────────────────────────────────────────────────────────────── */

export interface WalletDTO {
  id: string;
  currency: "NGN";
  balanceKobo: number;
  status: WalletStatus;
  ledgerBalanced: boolean;
  updatedAt: string;
}

export interface UserDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminSections: AdminSection[];
  hasPin: boolean;
  wallet: WalletDTO;
  createdAt: string;
}

export interface LedgerEntryDTO {
  id: string;
  type: LedgerEntryType;
  amountKobo: number;
  balanceAfterKobo: number;
  description: string;
  reference: string;
  createdAt: string;
}

export interface TransactionDTO {
  id: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  recipient: string;
  amountKobo: number;
  feeKobo: number;
  totalKobo: number;
  providerRef: string | null;
  providerCode: string | null;
  failureReason: string | null;
  balanceAfterKobo: number | null;
  createdAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown> | null;
  user?: { id: string; name: string; email: string };
}

export interface AdminDTO {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  sections: AdminSection[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminOverviewDTO {
  totalUsers: number;
  activeWallets: number;
  adminCount: number;
  walletLiabilityKobo: number;
  volumeTodayKobo: number;
  transactionsToday: number;
  successRate: number;
  pendingTransactions: number;
  serviceMix: { type: TransactionType; amountKobo: number; count: number }[];
  recentAudit: AuditEventDTO[];
}

export interface AuditEventDTO {
  id: string;
  actorName: string;
  actorEmail: string;
  action: string;
  description: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AdminUserDTO {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  balanceKobo: number;
  walletStatus: WalletStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface TransactionSummaryDTO {
  periodDays: number;
  totalSpentKobo: number;
  transactionCount: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  successRate: number;
  serviceMix: { type: TransactionType; amountKobo: number; count: number }[];
}

/* ── Catalog DTOs ────────────────────────────────────────────────────────── */

export interface DataPlanDTO {
  id: string;
  network: NetworkId;
  code: string;
  name: string;
  dataLabel: string;
  validityLabel: string;
  priceKobo: number;
  popular: boolean;
}

export interface CablePlanDTO {
  id: string;
  provider: CableProviderId;
  code: string;
  name: string;
  amountKobo: number;
  durationLabel: string;
}

export interface ElectricityDiscoDTO {
  id: string;
  code: string;
  name: string;
  shortName: string;
  minKobo: number;
  maxKobo: number;
}

export interface CatalogDTO {
  networks: NetworkDefinition[];
  dataPlans: DataPlanDTO[];
  cablePlans: CablePlanDTO[];
  discos: ElectricityDiscoDTO[];
  fees: typeof FEES_KOBO;
  limits: typeof LIMITS;
}

export interface CustomerLookupDTO {
  customerName: string;
  customerAddress?: string;
  meterType?: MeterType;
  provider: string;
  reference: string;
}

export interface VerificationResultDTO {
  valid: boolean;
  customer: CustomerLookupDTO;
  message: string;
  customerAddress?: string;
}

export interface PurchaseResultDTO {
  transaction: TransactionDTO;
  wallet: WalletDTO;
  walletDebited?: boolean;
  replay?: boolean;
}

/* ── Request bodies ──────────────────────────────────────────────────────── */

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  pin: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AirtimePayload {
  network: NetworkId;
  phone: string;
  amountKobo: number;
  pin: string;
}

export interface DataPayload {
  network: NetworkId;
  phone: string;
  planId: string;
  pin: string;
}

export interface CablePayload {
  provider: CableProviderId;
  smartcardNumber: string;
  planId: string;
  pin: string;
}

export interface ElectricityPayload {
  discoCode: string;
  meterNumber: string;
  meterType: MeterType;
  amountKobo: number;
  phone: string;
  pin: string;
}

export interface FundWalletPayload {
  amountKobo: number;
  method: FundingMethod;
}

/* ── Phone helpers ───────────────────────────────────────────────────────── */

const NETWORK_PREFIXES: Record<string, NetworkId> = {
  "0803": "MTN", "0806": "MTN", "0703": "MTN", "0706": "MTN", "0813": "MTN",
  "0816": "MTN", "0810": "MTN", "0814": "MTN", "0903": "MTN", "0906": "MTN",
  "0913": "MTN", "0916": "MTN",
  "0802": "AIRTEL", "0808": "AIRTEL", "0708": "AIRTEL", "0812": "AIRTEL",
  "0701": "AIRTEL", "0902": "AIRTEL", "0901": "AIRTEL", "0904": "AIRTEL",
  "0907": "AIRTEL", "0912": "AIRTEL",
  "0805": "GLO", "0807": "GLO", "0705": "GLO", "0815": "GLO", "0811": "GLO",
  "0905": "GLO", "0915": "GLO",
  "0809": "ETISALAT", "0817": "ETISALAT", "0818": "ETISALAT", "0908": "ETISALAT",
  "0909": "ETISALAT",
};

/** Accepts 0803…, 803…, +2348…, 2348… and returns canonical 0XXXXXXXXXX. */
export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let local = digits;

  if (local.startsWith("+234")) local = `0${local.slice(4)}`;
  else if (local.startsWith("234") && local.length === 13) local = `0${local.slice(3)}`;
  else if (/^[789]\d{9}$/.test(local)) local = `0${local}`;

  return /^0[789][01]\d{8}$/.test(local) ? local : null;
}

export function detectNetwork(input: string): NetworkId | null {
  const phone = normalizeNigerianPhone(input);
  if (!phone) return null;
  return NETWORK_PREFIXES[phone.slice(0, 4)] ?? null;
}

export function maskPhone(input: string): string {
  const phone = normalizeNigerianPhone(input) ?? input;
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 4)}${"•".repeat(phone.length - 6)}${phone.slice(-2)}`;
}

/* ── Money & reference helpers ───────────────────────────────────────────── */

export function formatNaira(kobo: number, options: { compact?: boolean } = {}): string {
  const naira = kobo / 100;
  if (options.compact && Math.abs(naira) >= 1_000_000) {
    return `₦${(naira / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (options.compact && Math.abs(naira) >= 10_000) {
    return `₦${(naira / 1_000).toFixed(0)}k`;
  }
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: Number.isInteger(naira) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formatDate(iso)}, ${time}`;
}

export function nairaToKobo(value: string | number): number {
  const numeric = typeof value === "number" ? value : Number(value.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

export function koboToNairaInput(kobo: number): string {
  const naira = kobo / 100;
  return Number.isInteger(naira) ? String(naira) : naira.toFixed(2);
}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReference(prefix = "PL"): string {
  let suffix = "";
  for (let index = 0; index < 10; index += 1) {
    suffix += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)];
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export const SERVICE_LABELS: Record<TransactionType, string> = {
  AIRTIME: "Airtime top-up",
  DATA: "Data bundle",
  CABLE: "Cable TV",
  ELECTRICITY: "Electricity",
  WALLET_FUNDING: "Wallet funding",
};

export const FUNDING_METHOD_LABELS: Record<FundingMethod, string> = {
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING: "Pending",
  SUCCESS: "Successful",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};
