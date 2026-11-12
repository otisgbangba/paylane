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
export type AccountType = "INDIVIDUAL" | "AGENT" | "ORGANISATION";
export type TransactionType =
  | "AIRTIME"
  | "DATA"
  | "CABLE"
  | "ELECTRICITY"
  | "VERIFICATION"
  | "WALLET_FUNDING";
export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type LedgerEntryType = "CREDIT" | "DEBIT" | "REFUND";
export type NetworkId = "MTN" | "AIRTEL" | "GLO" | "ETISALAT";
export type CableProviderId = "DSTV" | "GOTV" | "STARTIMES";
export type MeterType = "PREPAID" | "POSTPAID";
export type FundingMethod = "CARD" | "BANK_TRANSFER";

export const ACCOUNT_TYPES: { id: AccountType; label: string; description: string }[] = [
  {
    id: "INDIVIDUAL",
    label: "Individual",
    description: "Personal checks, slips and record updates for yourself or your family.",
  },
  {
    id: "AGENT",
    label: "Agent / cyber café",
    description: "Run checks and enrolments for walk-in customers at a desk or shop.",
  },
  {
    id: "ORGANISATION",
    label: "Organisation",
    description: "Bulk verification for schools, employers, fintechs and cooperatives.",
  },
];

/* ── Identity services ───────────────────────────────────────────────────── */

export type IdentityServiceId =
  | "NIN_VERIFICATION"
  | "BVN_VERIFICATION"
  | "NIN_SLIP"
  | "IPE_CLEARANCE"
  | "NIN_PERSONALIZATION"
  | "NIN_DELINKING"
  | "NIN_NAME_CHANGE"
  | "NIN_PHONE_CHANGE"
  | "NIN_DOB_CHANGE"
  | "NIN_ADDRESS_CHANGE"
  | "NIN_CHILD_ENROLMENT"
  | "NIN_ADULT_ENROLMENT";

export type IdentityCategory = "LOOKUP" | "SLIP" | "RECORD" | "ENROLMENT";
export type IdentityResultKind = "IDENTITY" | "DOCUMENT" | "ACKNOWLEDGEMENT";
export type IdentityRequestStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "REFUNDED";

export type IdentityFieldType =
  | "text"
  | "nin"
  | "bvn"
  | "phone"
  | "email"
  | "date"
  | "select"
  | "textarea";

export interface IdentityFieldDef {
  name: string;
  label: string;
  type: IdentityFieldType;
  required: boolean;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  options?: { value: string; label: string }[];
  /** Sensitive input: never echoed back in responses and purged after settlement. */
  secret?: boolean;
}

export interface IdentityServiceDef {
  id: IdentityServiceId;
  code: string;
  name: string;
  tagline: string;
  description: string;
  category: IdentityCategory;
  priceKobo: number;
  turnaroundLabel: string;
  resultKind: IdentityResultKind;
  popular?: boolean;
  fields: IdentityFieldDef[];
}

export const IDENTITY_CATEGORIES: {
  id: IdentityCategory;
  label: string;
  description: string;
}[] = [
  { id: "LOOKUP", label: "Instant checks", description: "Records returned in seconds." },
  { id: "SLIP", label: "Slips & documents", description: "Downloadable NIN slip and IPE clearance." },
  { id: "RECORD", label: "Record updates", description: "Changes and corrections on an existing record." },
  { id: "ENROLMENT", label: "Enrolment", description: "New NIN enrolment for children, adults and diaspora." },
];

const NIN_FIELD: IdentityFieldDef = {
  name: "nin",
  label: "National Identification Number (NIN)",
  type: "nin",
  required: true,
  placeholder: "1234 5678 901",
  hint: "11 digits, printed on your NIN slip or dial *346#",
  maxLength: 11,
  secret: true,
};

const BVN_FIELD: IdentityFieldDef = {
  name: "bvn",
  label: "Bank Verification Number (BVN)",
  type: "bvn",
  required: true,
  placeholder: "1234 5678 901",
  hint: "11 digits; send *565*0# from your registered line",
  maxLength: 11,
  secret: true,
};

const PHONE_FIELD: IdentityFieldDef = {
  name: "phone",
  label: "Linked mobile number",
  type: "phone",
  required: true,
  placeholder: "0803 123 4567",
  secret: true,
};

const DOB_FIELD: IdentityFieldDef = {
  name: "dateOfBirth",
  label: "Date of birth",
  type: "date",
  required: true,
  hint: "As captured on the record",
};

export const IDENTITY_SERVICES: IdentityServiceDef[] = [
  {
    id: "NIN_VERIFICATION",
    code: "nin-verification",
    name: "NIN verification",
    tagline: "Confirm a NIN and match it to a name",
    description:
      "Confirms that a NIN exists and returns the record's name, date of birth and photograph reference so you can match it against the customer in front of you.",
    category: "LOOKUP",
    priceKobo: 20_000,
    turnaroundLabel: "Instant",
    resultKind: "IDENTITY",
    popular: true,
    fields: [NIN_FIELD],
  },
  {
    id: "BVN_VERIFICATION",
    code: "bvn-verification",
    name: "BVN verification",
    tagline: "Match a BVN to its account holder",
    description:
      "Checks a BVN against the banking database and returns the registered name and date of birth. Useful for onboarding, loan checks and beneficiary screening.",
    category: "LOOKUP",
    priceKobo: 25_000,
    turnaroundLabel: "Instant",
    resultKind: "IDENTITY",
    popular: true,
    fields: [BVN_FIELD, DOB_FIELD],
  },
  {
    id: "NIN_SLIP",
    code: "nin-slip",
    name: "NIN slip retrieval",
    tagline: "Download the standard NIN slip",
    description:
      "Retrieves the standard NIN slip for a verified record as a downloadable document you can present to banks, schools and government offices.",
    category: "SLIP",
    priceKobo: 30_000,
    turnaroundLabel: "Under 1 minute",
    resultKind: "DOCUMENT",
    popular: true,
    fields: [NIN_FIELD],
  },
  {
    id: "IPE_CLEARANCE",
    code: "ipe-clearance",
    name: "IPE clearance",
    tagline: "Clear an Identity Premium Entry (IPE)",
    description:
      "Raises the clearance request that moves a record past the IPE exception so identity documents can be issued or updated without a manual visit.",
    category: "SLIP",
    priceKobo: 150_000,
    turnaroundLabel: "Same day",
    resultKind: "ACKNOWLEDGEMENT",
    fields: [NIN_FIELD, { ...PHONE_FIELD, hint: "The number attached to the record" }],
  },
  {
    id: "NIN_PERSONALIZATION",
    code: "nin-personalization",
    name: "NIN personalisation",
    tagline: "Print a personalised NIN card",
    description:
      "Queues a personalised NIN card for a validated record and returns the collection reference and the centre where it will be ready.",
    category: "SLIP",
    priceKobo: 250_000,
    turnaroundLabel: "3 to 5 working days",
    resultKind: "ACKNOWLEDGEMENT",
    fields: [
      NIN_FIELD,
      PHONE_FIELD,
      {
        name: "state",
        label: "Collection state",
        type: "select",
        required: true,
        options: [
          "Lagos",
          "Abuja (FCT)",
          "Rivers",
          "Oyo",
          "Kano",
          "Enugu",
          "Delta",
          "Kaduna",
          "Anambra",
          "Ogun",
        ].map((state) => ({ value: state, label: state })),
      },
    ],
  },
  {
    id: "NIN_DELINKING",
    code: "nin-delinking",
    name: "Delinking service",
    tagline: "Release a NIN from the wrong record",
    description:
      "Detaches a NIN from a record it was wrongly linked to, such as a duplicated enrolment or an identity mixed up at a centre.",
    category: "RECORD",
    priceKobo: 200_000,
    turnaroundLabel: "1 to 2 working days",
    resultKind: "ACKNOWLEDGEMENT",
    fields: [
      NIN_FIELD,
      {
        name: "reason",
        label: "Why should this record be delinked?",
        type: "textarea",
        required: true,
        placeholder: "Describe the duplicate or incorrect link",
        maxLength: 500,
      },
    ],
  },
  {
    id: "NIN_NAME_CHANGE",
    code: "nin-name-change",
    name: "Name change / correction",
    tagline: "Change the name on a NIN record",
    description:
      "Submits a name correction or change of name on an existing record. Supporting documents are quoted by the desk after review.",
    category: "RECORD",
    priceKobo: 500_000,
    turnaroundLabel: "3 to 7 working days",
    resultKind: "ACKNOWLEDGEMENT",
    fields: [
      NIN_FIELD,
      {
        name: "newFirstName",
        label: "New first name",
        type: "text",
        required: true,
        maxLength: 60,
      },
      {
        name: "newLastName",
        label: "New surname",
        type: "text",
        required: true,
        maxLength: 60,
      },
      {
        name: "reason",
        label: "Reason for the change",
        type: "select",
        required: true,
        options: [
          { value: "marriage", label: "Marriage" },
          { value: "divorce", label: "Divorce" },
          { value: "correction", label: "Spelling correction" },
          { value: "deed-poll", label: "Deed poll" },
        ],
      },
    ],
  },
  {
    id: "NIN_PHONE_CHANGE",
    code: "nin-phone-change",
    name: "Phone number update",
    tagline: "Move a NIN to a new phone number",
    description:
      "Replaces the phone number attached to a NIN record, for lost lines or numbers that were never registered to the holder.",
    category: "RECORD",
    priceKobo: 400_000,
    turnaroundLabel: "1 to 3 working days",
    resultKind: "ACKNOWLEDGEMENT",
    fields: [
      NIN_FIELD,
      {
        name: "newPhone",
        label: "New phone number",
        type: "phone",
        required: true,
        placeholder: "0803 123 4567",
        secret: true,
      },
      DOB_FIELD,
    ],
  },
  {
    id: "NIN_DOB_CHANGE",
    code: "nin-dob-change",
    name: "Date of birth correction",
    tagline: "Correct a date of birth on record",
    description:
      "Raises a date-of-birth correction for review. A sworn affidavit and an age-evidence document are required at the desk.",
    category: "RECORD",
    priceKobo: 800_000,
    turnaroundLabel: "5 to 10 working days",
    resultKind: "ACKNOWLEDGEMENT",
    fields: [
      NIN_FIELD,
      { ...DOB_FIELD, label: "Correct date of birth" },
      {
        name: "reason",
        label: "Reason for the correction",
        type: "textarea",
        required: true,
        maxLength: 500,
      },
    ],
  },
  {
    id: "NIN_ADDRESS_CHANGE",
    code: "nin-address-change",
    name: "Address update",
    tagline: "Update the address on a NIN record",
    description:
      "Updates the residential address attached to a NIN record, which some banks and schools require before issuing identity documents.",
    category: "RECORD",
    priceKobo: 450_000,
    turnaroundLabel: "2 to 4 working days",
    resultKind: "ACKNOWLEDGEMENT",
    fields: [
      NIN_FIELD,
      {
        name: "address",
        label: "New residential address",
        type: "textarea",
        required: true,
        maxLength: 300,
      },
      {
        name: "state",
        label: "State",
        type: "select",
        required: true,
        options: [
          "Lagos",
          "Abuja (FCT)",
          "Rivers",
          "Oyo",
          "Kano",
          "Enugu",
          "Delta",
          "Kaduna",
          "Anambra",
          "Ogun",
        ].map((state) => ({ value: state, label: state })),
      },
    ],
  },
  {
    id: "NIN_CHILD_ENROLMENT",
    code: "nin-child-enrolment",
    name: "Child enrolment",
    tagline: "Enrol a child under 16",
    description:
      "Books a NIN enrolment for a child under 16. The parent or guardian's NIN is required as the sponsoring record.",
    category: "ENROLMENT",
    priceKobo: 300_000,
    turnaroundLabel: "Appointment in 1 to 3 days",
    resultKind: "ACKNOWLEDGEMENT",
    fields: [
      {
        name: "firstName",
        label: "Child's first name",
        type: "text",
        required: true,
        maxLength: 60,
      },
      {
        name: "lastName",
        label: "Child's surname",
        type: "text",
        required: true,
        maxLength: 60,
      },
      { ...DOB_FIELD, label: "Child's date of birth" },
      {
        name: "guardianNin",
        label: "Parent or guardian NIN",
        type: "nin",
        required: true,
        maxLength: 11,
        secret: true,
      },
      PHONE_FIELD,
    ],
  },
  {
    id: "NIN_ADULT_ENROLMENT",
    code: "nin-adult-enrolment",
    name: "Adult enrolment",
    tagline: "Book a first-time NIN enrolment",
    description:
      "Books a first-time NIN enrolment for an adult, including diaspora arrivals, and returns the appointment centre and reference.",
    category: "ENROLMENT",
    priceKobo: 500_000,
    turnaroundLabel: "Appointment in 1 to 5 days",
    resultKind: "ACKNOWLEDGEMENT",
    fields: [
      {
        name: "firstName",
        label: "First name",
        type: "text",
        required: true,
        maxLength: 60,
      },
      {
        name: "lastName",
        label: "Surname",
        type: "text",
        required: true,
        maxLength: 60,
      },
      PHONE_FIELD,
      {
        name: "state",
        label: "Enrolment state",
        type: "select",
        required: true,
        options: [
          "Lagos",
          "Abuja (FCT)",
          "Rivers",
          "Oyo",
          "Kano",
          "Enugu",
          "Delta",
          "Kaduna",
          "Anambra",
          "Ogun",
        ].map((state) => ({ value: state, label: state })),
      },
    ],
  },
];

export function identityServiceById(id: string): IdentityServiceDef | undefined {
  return IDENTITY_SERVICES.find((service) => service.id === id);
}

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
    key: "VERIFICATIONS",
    label: "Identity services",
    description: "Watch verification requests, tune pricing and switch products on or off.",
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
  VERIFICATION: 0,
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
  accountType: AccountType;
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

/* ── Identity DTOs ───────────────────────────────────────────────────────── */

export interface IdentityProductDTO {
  id: IdentityServiceId;
  code: string;
  name: string;
  tagline: string;
  description: string;
  category: IdentityCategory;
  priceKobo: number;
  turnaroundLabel: string;
  resultKind: IdentityResultKind;
  popular: boolean;
  isActive: boolean;
  sortOrder: number;
  fields: IdentityFieldDef[];
}

export interface IdentityResultField {
  label: string;
  value: string;
}

export interface IdentityDocument {
  fileName: string;
  mimeType: string;
  /** Base64 payload; only returned to the owning customer. */
  contentBase64: string;
}

export interface IdentityResultDTO {
  kind: IdentityResultKind;
  fields: IdentityResultField[];
  document: IdentityDocument | null;
  note: string | null;
}

export interface IdentityRequestDTO {
  id: string;
  reference: string;
  productId: IdentityServiceId;
  productName: string;
  category: IdentityCategory;
  status: IdentityRequestStatus;
  amountKobo: number;
  subjectMasked: string;
  summary: string;
  turnaroundLabel: string;
  failureReason: string | null;
  transactionId: string | null;
  result: IdentityResultDTO | null;
  createdAt: string;
  completedAt: string | null;
}

export interface IdentityPurchaseResultDTO {
  request: IdentityRequestDTO;
  transaction: TransactionDTO;
  wallet: WalletDTO;
  replay?: boolean;
}

export interface IdentityOverviewDTO {
  totalRequests: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  revenueKobo: number;
  todayCount: number;
  successRate: number;
  products: { productId: IdentityServiceId; name: string; count: number; amountKobo: number }[];
}

export interface AdminIdentityRequestDTO extends IdentityRequestDTO {
  user: { id: string; name: string; email: string };
  actorType: "SESSION" | "API_KEY";
  apiKeyName: string | null;
  error: string | null;
}

export interface ApiKeyDTO {
  id: string;
  name: string;
  prefix: string;
  environment: "LIVE" | "TEST";
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface IssuedApiKeyDTO extends ApiKeyDTO {
  /** Full key — shown once, never retrievable again. */
  key: string;
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
  accountType?: AccountType;
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

export interface IdentityRequestPayload {
  service: IdentityServiceId;
  fields: Record<string, string>;
  consent: boolean;
  /** Required for wallet-funded session purchases; omitted for API-key calls. */
  pin?: string;
}

export interface IdentityQuoteDTO {
  service: IdentityServiceId;
  name: string;
  priceKobo: number;
  feeKobo: number;
  totalKobo: number;
  turnaroundLabel: string;
}

export function maskIdentifier(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return "•".repeat(Math.max(digits.length, 4));
  return `${"•".repeat(digits.length - 4)}${digits.slice(-4)}`;
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
  VERIFICATION: "Identity verification",
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
