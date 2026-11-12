import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Braces,
  Fingerprint,
  KeyRound,
  LifeBuoy,
  Lock,
  Repeat,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { AdSlot } from "@/components/ads/ad-slot";
import { CodeBlock } from "@/components/api-docs/code-block";

export const metadata: Metadata = { title: "API documentation" };

const ENDPOINT_GROUPS: {
  title: string;
  icon: typeof Braces;
  tint: string;
  routes: { method: string; path: string; description: string }[];
}[] = [
  {
    title: "Authentication",
    icon: KeyRound,
    tint: "bg-violet-soft text-violet",
    routes: [
      { method: "POST", path: "/auth/register", description: "Create a customer, wallet and session cookie." },
      { method: "POST", path: "/auth/login", description: "Exchange email and password for a 7-day session." },
      { method: "POST", path: "/auth/logout", description: "Clear the paylane_session cookie." },
      { method: "GET", path: "/auth/me", description: "Current user, wallet, role and granted admin sections." },
      { method: "PATCH", path: "/auth/profile", description: "Update names and phone number." },
      { method: "POST", path: "/auth/pin", description: "Set or rotate the 4-digit transaction PIN." },
      { method: "POST", path: "/auth/password", description: "Change password with the current one." },
    ],
  },
  {
    title: "Wallet",
    icon: Lock,
    tint: "bg-lime-soft text-[#4d6b00]",
    routes: [
      { method: "GET", path: "/wallet", description: "Balance, status and ledger reconciliation flag." },
      { method: "GET", path: "/wallet/ledger?limit=25", description: "Append-only credit, debit and refund entries." },
      { method: "POST", path: "/wallet/fund", description: "Sandbox card or bank-transfer funding. Requires Idempotency-Key." },
    ],
  },
  {
    title: "Catalog",
    icon: Braces,
    tint: "bg-sky-soft text-sky",
    routes: [
      { method: "GET", path: "/catalog", description: "Networks, data plans, cable bundles, DISCOs, fees and limits." },
    ],
  },
  {
    title: "Services",
    icon: Repeat,
    tint: "bg-coral-soft text-coral",
    routes: [
      { method: "POST", path: "/services/airtime", description: "Airtime purchase. Requires PIN and Idempotency-Key." },
      { method: "POST", path: "/services/data", description: "Data bundle purchase. Requires PIN and Idempotency-Key." },
      { method: "POST", path: "/services/cable/verify", description: "Smartcard lookup before purchase." },
      { method: "POST", path: "/services/cable", description: "Cable subscription. Requires PIN and Idempotency-Key." },
      { method: "POST", path: "/services/electricity/verify", description: "Meter lookup and address confirmation." },
      { method: "POST", path: "/services/electricity", description: "Prepaid or postpaid token purchase. Requires PIN and Idempotency-Key." },
    ],
  },
  {
    title: "Identity",
    icon: Fingerprint,
    tint: "bg-success-soft text-success",
    routes: [
      { method: "GET", path: "/identity/products", description: "Public catalogue with prices, fields and vendor mode." },
      { method: "POST", path: "/identity/requests", description: "Dashboard checkout. Requires PIN, consent and Idempotency-Key." },
      { method: "GET", path: "/identity/requests", description: "The signed-in customer's identity requests." },
      { method: "GET", path: "/identity/requests/:reference", description: "One request with its result or acknowledgement." },
      { method: "POST", path: "/api/v1/verify/:service", description: "Bearer API key. No PIN; consent is required in the body." },
      { method: "GET", path: "/api/v1/verify", description: "Public discovery of services, fields and auth format." },
    ],
  },
  {
    title: "Developer keys",
    icon: KeyRound,
    tint: "bg-violet-soft text-violet",
    routes: [
      { method: "GET", path: "/developer/status", description: "Vendor mode: HTTP when configured, otherwise sandbox." },
      { method: "GET", path: "/developer/keys", description: "List keys with prefix, environment and last use." },
      { method: "POST", path: "/developer/keys", description: "Issue a key. The secret is returned once." },
      { method: "DELETE", path: "/developer/keys/:id", description: "Revoke a key immediately." },
    ],
  },
  {
    title: "Transactions",
    icon: BadgeCheck,
    tint: "bg-amber-soft text-[#9a6200]",
    routes: [
      { method: "GET", path: "/transactions?status=&type=&q=&limit=20&offset=0", description: "Paginated history for the signed-in user." },
      { method: "GET", path: "/transactions/summary", description: "Spend, success rate and service mix for 30 days." },
      { method: "GET", path: "/transactions/:reference", description: "A single transaction with provider reference." },
    ],
  },
  {
    title: "Admin",
    icon: ShieldCheck,
    tint: "bg-violet-soft text-violet",
    routes: [
      { method: "GET", path: "/admin/overview", description: "Section: OVERVIEW." },
      { method: "GET", path: "/admin/users?q=", description: "Section: USERS." },
      { method: "GET", path: "/admin/wallets?q=", description: "Section: WALLETS." },
      { method: "PATCH", path: "/admin/users/:id/wallet", description: "Section: WALLETS. Freeze or restore." },
      { method: "GET", path: "/admin/transactions", description: "Section: TRANSACTIONS." },
      { method: "GET", path: "/admin/verifications/overview", description: "Section: VERIFICATIONS." },
      { method: "GET", path: "/admin/verifications/requests?q=&status=", description: "Section: VERIFICATIONS." },
      { method: "PATCH", path: "/admin/verifications/products/:code", description: "Section: VERIFICATIONS. Price, turnaround or active state." },
      { method: "GET", path: "/admin/audit", description: "Section: AUDIT." },
      { method: "GET", path: "/admin/admins", description: "Super administrator only." },
      { method: "POST", path: "/admin/admins", description: "Super administrator only. Create a scoped admin." },
      { method: "PATCH", path: "/admin/admins/:id", description: "Super administrator only. Change sections or status." },
    ],
  },
];

const SUCCESS_ENVELOPE = `{
  "success": true,
  "status": "success",
  "message": "Airtime sent successfully.",
  "data": {
    "transaction": { "reference": "PZ-AIR-7F2K9Q", "status": "SUCCESS" },
    "wallet": { "balanceKobo": 782000 }
  },
  "meta": { "requestId": "req_01H..." }
}`;

const FAILED_ENVELOPE = `{
  "success": false,
  "status": "failed",
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "details": { "requiredKobo": 120000, "availableKobo": 95000 }
  },
  "message": "Your wallet balance is too low for this purchase."
}`;

const PENDING_ENVELOPE = `{
  "success": true,
  "status": "pending",
  "message": "Meter purchase is awaiting vendor confirmation.",
  "data": {
    "transaction": { "reference": "PZ-ELEC-91QD2M", "status": "PENDING" },
    "walletDebited": true
  }
}`;

const CURL_EXAMPLE = `curl -X POST https://your-host/api/v1/services/airtime \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: 6b1f0c2a-airtime-001" \\
  -H "Cookie: paylane_session=<jwt>" \\
  -d '{
    "network": "MTN",
    "phone": "08031234567",
    "amountKobo": 50000,
    "pin": "1234"
  }'`;

const IDENTITY_CURL = `curl -X POST https://your-host/api/v1/verify/nin-verification \\
  -H "Authorization: Bearer plk_live_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: 6f3d9c2a-nin-001" \\
  -d '{
    "fields": { "nin": "12345678901" },
    "consent": true
  }'`;

const IDENTITY_RESPONSE = `{
  "success": true,
  "status": "success",
  "message": "NIN verified successfully.",
  "data": {
    "request": {
      "reference": "PL-8F2K9",
      "status": "SUCCESS",
      "subjectMasked": "•••• •••• 901",
      "result": {
        "kind": "IDENTITY",
        "fields": [{ "label": "Full name", "value": "ADAEZE C. OKAFOR" }],
        "document": null
      }
    },
    "wallet": { "balanceKobo": 3980000 }
  },
  "meta": { "requestId": "req_01H..." }
}`;

const WEBHOOK_EXAMPLE = `POST /api/v1/webhooks/vendor/:providerCode
x-paylane-signature: sha256=<hex hmac of raw body>

{
  "event": "transaction.success",
  "reference": "PZ-DATA-4M8T2X",
  "providerRef": "VND-88213",
  "message": "Bundle delivered"
}`;

const ERROR_CODES = [
  { code: "AUTH_REQUIRED", status: "401", meaning: "No session cookie, bearer token or valid API key." },
  { code: "AUTH_INVALID_CREDENTIALS", status: "401", meaning: "Wrong email or password." },
  { code: "AUTH_PIN_INVALID", status: "401", meaning: "Wrong transaction PIN." },
  { code: "AUTH_PIN_LOCKED", status: "423", meaning: "Five failed PIN attempts. Wait 10 minutes." },
  { code: "AUTH_PIN_NOT_SET", status: "409", meaning: "Set a PIN before buying." },
  { code: "AUTH_FORBIDDEN", status: "403", meaning: "Missing admin section or inactive account." },
  { code: "VALIDATION_ERROR", status: "422", meaning: "Body or query failed schema validation, including missing consent." },
  { code: "INSUFFICIENT_FUNDS", status: "402", meaning: "Wallet balance cannot cover the total." },
  { code: "WALLET_FROZEN", status: "403", meaning: "The wallet is frozen pending review." },
  { code: "IDEMPOTENCY_CONFLICT", status: "409", meaning: "Key reused with a different payload." },
  { code: "PROVIDER_REJECTED", status: "422", meaning: "Vendor declined; the wallet is refunded." },
  { code: "PROVIDER_UNAVAILABLE", status: "503", meaning: "No healthy provider adapter." },
  { code: "RATE_LIMITED", status: "429", meaning: "Slow down and retry after the window." },
  { code: "NOT_FOUND", status: "404", meaning: "The resource does not exist or is not yours." },
  { code: "INTERNAL_ERROR", status: "500", meaning: "Unexpected server fault. Safe to retry." },
];

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-sky-soft text-sky",
  POST: "bg-lime-soft text-[#4d6b00]",
  PATCH: "bg-amber-soft text-[#9a6200]",
  DELETE: "bg-danger-soft text-danger",
};

export default function ApiDocsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
            Developers
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.8rem]">
            Paylane v1 API
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/55">
            One envelope, signed webhooks and idempotent money movement, for identity checks and
            everyday top-ups. Every endpoint below is live in this workspace under{" "}
            <span className="font-mono text-ink/70">/api/v1</span>.
          </p>
        </div>
        <span className="chip w-fit bg-white text-[0.62rem] text-ink/55">
          <Fingerprint className="size-3.5 text-violet" aria-hidden />
          Version v1
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: Braces,
            title: "Base URL",
            copy: "/api/v1",
            detail: "Same-origin through the Next.js rewrite",
            tint: "bg-sky-soft text-sky",
          },
          {
            icon: KeyRound,
            title: "Auth",
            copy: "paylane_session",
            detail: "HttpOnly cookie, or Bearer plk_live_…",
            tint: "bg-violet-soft text-violet",
          },
          {
            icon: Repeat,
            title: "Idempotency",
            copy: "Idempotency-Key",
            detail: "Required on funding and every purchase",
            tint: "bg-lime-soft text-[#4d6b00]",
          },
          {
            icon: Webhook,
            title: "Webhooks",
            copy: "x-paylane-signature",
            detail: "HMAC-SHA256 over the raw body",
            tint: "bg-coral-soft text-coral",
          },
        ].map((item) => (
          <div key={item.title} className="card flex items-start gap-3 p-4">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${item.tint}`}>
              <item.icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted">
                {item.title}
              </p>
              <p className="mt-0.5 truncate font-mono text-xs font-semibold text-ink">{item.copy}</p>
              <p className="mt-1 text-[0.65rem] leading-relaxed text-muted">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <AdSlot format="leaderboard" />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-line/80 px-4 py-4 sm:px-5">
            <h3 className="font-display text-base font-bold text-ink">Response envelope</h3>
            <p className="mt-0.5 text-[0.68rem] text-muted">
              Branch on <span className="font-mono text-ink/60">success</span>, then read{" "}
              <span className="font-mono text-ink/60">status</span> for settlement state.
            </p>
          </div>
          <div className="space-y-3 px-4 py-4 sm:px-5">
            <CodeBlock code={SUCCESS_ENVELOPE} label="200 · success" />
            <CodeBlock code={PENDING_ENVELOPE} label="200 · pending" />
            <CodeBlock code={FAILED_ENVELOPE} label="4xx · failed" />
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-lime-soft text-[#4d6b00]">
                <Repeat className="size-4" aria-hidden />
              </span>
              <h3 className="font-display text-base font-bold text-ink">Idempotent money</h3>
            </div>
            <ul className="mt-3 space-y-2.5 text-[0.68rem] leading-relaxed text-ink/65">
              <li className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-lime-dark" />
                Send a unique <span className="font-mono text-ink/80">Idempotency-Key</span> per
                purchase; retries with the same key return the original transaction.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-lime-dark" />
                A replayed response carries{" "}
                <span className="font-mono text-ink/80">Idempotent-Replay: true</span>.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-lime-dark" />
                Reusing a key with a different payload returns{" "}
                <span className="font-mono text-ink/80">IDEMPOTENCY_CONFLICT</span>.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-lime-dark" />
                Vendor declines debit, then refund in the same ledger, so the balance always
                reconstructs.
              </li>
            </ul>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-coral-soft text-coral">
                <LifeBuoy className="size-4" aria-hidden />
              </span>
              <h3 className="font-display text-base font-bold text-ink">Sandbox triggers</h3>
            </div>
            <div className="mt-3 space-y-2 text-[0.68rem] text-ink/65">
              {[
                ["Phone ends 0000", "Vendor decline + refund"],
                ["Phone ends 1111", "Primary fails over, then fails"],
                ["Meter ends 00", "Settles PENDING"],
                ["Smartcard/meter ends 000", "Verification fails"],
                ["NIN/BVN starts 999", "Vendor timeout + refund"],
                ["NIN/BVN ends 0000", "Record not found + refund"],
              ].map(([trigger, result]) => (
                <div
                  key={trigger}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2"
                >
                  <span className="font-mono text-[0.62rem] text-ink/75">{trigger}</span>
                  <span className="text-right text-[0.62rem] text-muted">{result}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-line/80 px-4 py-4 sm:px-5">
          <h3 className="font-display text-base font-bold text-ink">Endpoints</h3>
          <p className="mt-0.5 text-[0.68rem] text-muted">
            Admin routes are gated twice: sign-in plus the exact section grant.
          </p>
        </div>
        <div className="grid gap-x-8 gap-y-6 px-4 py-5 sm:px-5 lg:grid-cols-2">
          {ENDPOINT_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`grid size-7 place-items-center rounded-lg ${group.tint}`}>
                  <group.icon className="size-3.5" aria-hidden />
                </span>
                <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-ink/70">
                  {group.title}
                </h4>
              </div>
              <ul className="space-y-1">
                {group.routes.map((route) => (
                  <li
                    key={`${route.method}-${route.path}`}
                    className="rounded-xl px-2 py-1.5 transition hover:bg-cream/70"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-[0.55rem] font-bold ${
                          METHOD_STYLES[route.method] ?? "bg-cream text-ink/60"
                        }`}
                      >
                        {route.method}
                      </span>
                      <span className="font-mono text-[0.66rem] font-semibold text-ink">
                        {route.path}
                      </span>
                    </div>
                    <p className="mt-0.5 pl-0.5 text-[0.63rem] leading-relaxed text-muted">
                      {route.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-success-soft text-success">
              <Fingerprint className="size-4" aria-hidden />
            </span>
            <h3 className="font-display text-base font-bold text-ink">Verify an identity</h3>
          </div>
          <p className="mb-3 mt-1 text-[0.68rem] leading-relaxed text-muted">
            Use a <span className="font-mono text-ink/70">plk_live_</span> or{" "}
            <span className="font-mono text-ink/70">plk_test_</span> key from settings. The PIN is
            not required for API keys, but <span className="font-mono text-ink/70">consent</span>{" "}
            must be <span className="font-mono text-ink/70">true</span>.
          </p>
          <CodeBlock code={IDENTITY_CURL} label="curl" />
        </section>
        <section className="card p-4 sm:p-5">
          <h3 className="font-display text-base font-bold text-ink">Identity response</h3>
          <p className="mb-3 mt-0.5 text-[0.68rem] leading-relaxed text-muted">
            A failed vendor call still returns the request, so you can persist the reference and
            confirm the refund against the wallet.
          </p>
          <CodeBlock code={IDENTITY_RESPONSE} label="200 · success" />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h3 className="font-display text-base font-bold text-ink">Airtime request</h3>
          <p className="mb-3 mt-0.5 text-[0.68rem] text-muted">
            Amounts are integer kobo. Naira never touches the wire as a float.
          </p>
          <CodeBlock code={CURL_EXAMPLE} label="curl" />
        </section>
        <section className="card p-4 sm:p-5">
          <h3 className="font-display text-base font-bold text-ink">Vendor webhook</h3>
          <p className="mb-3 mt-0.5 text-[0.68rem] text-muted">
            Compute the digest over the exact raw bytes before JSON parsing.
          </p>
          <CodeBlock code={WEBHOOK_EXAMPLE} label="callback" />
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-line/80 px-4 py-4 sm:px-5">
          <h3 className="font-display text-base font-bold text-ink">Error codes</h3>
          <p className="mt-0.5 text-[0.68rem] text-muted">
            Read <span className="font-mono text-ink/60">error.code</span>, not the message text.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-line/70 bg-cream/50 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted">
                <th className="px-4 py-2.5 sm:px-5">Code</th>
                <th className="px-4 py-2.5">HTTP</th>
                <th className="px-4 py-2.5">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {ERROR_CODES.map((entry) => (
                <tr key={entry.code} className="text-[0.68rem]">
                  <td className="whitespace-nowrap px-4 py-2 font-mono font-semibold text-ink sm:px-5">
                    {entry.code}
                  </td>
                  <td className="px-4 py-2 font-mono text-muted">{entry.status}</td>
                  <td className="px-4 py-2 leading-relaxed text-ink/65">{entry.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-3xl bg-forest px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">Need the interactive surface?</h3>
          <p className="mt-1 max-w-lg text-[0.7rem] leading-relaxed text-white/60">
            Every endpoint is exercised by the dashboard. Run a sandbox purchase to watch the
            envelope, ledger entry and receipt line up.
          </p>
        </div>
        <Link href="/airtime" className="btn btn-accent btn-sm w-fit">
          Try a purchase
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <AdSlot format="leaderboard" label="Sponsored" />
    </div>
  );
}
