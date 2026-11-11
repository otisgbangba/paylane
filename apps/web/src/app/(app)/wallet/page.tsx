import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  formatDateTime,
  formatNaira,
  type LedgerEntryDTO,
} from "@paylane/shared";
import { AdSlot } from "@/components/ads/ad-slot";
import { WalletBalanceCard } from "@/components/wallet/wallet-balance-card";
import { fetchData } from "@/lib/server-api";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wallet" };

const entryTheme = {
  CREDIT: { icon: ArrowDownLeft, wrap: "bg-success-soft text-success", sign: "+" },
  DEBIT: { icon: ArrowUpRight, wrap: "bg-coral-soft text-coral", sign: "-" },
  REFUND: { icon: RotateCcw, wrap: "bg-violet-soft text-violet", sign: "+" },
} as const;

export default async function WalletPage() {
  const ledger = await fetchData<{ entries: LedgerEntryDTO[] }>("/wallet/ledger?limit=30");
  const entries = ledger?.entries ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
            Your money
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.8rem]">
            Wallet and ledger
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink/55">
            Every credit, debit and refund, newest first. The balance after each entry is shown so
            the number always adds up.
          </p>
        </div>
        <span className="chip w-fit bg-white text-[0.62rem] text-ink/55">
          <ShieldCheck className="size-3.5 text-success" aria-hidden />
          Append-only ledger
        </span>
      </div>

      <WalletBalanceCard />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line/80 px-4 py-4 sm:px-5">
            <div>
              <h3 className="font-display text-base font-bold text-ink">Ledger entries</h3>
              <p className="mt-0.5 text-[0.65rem] text-muted">Last {entries.length} movements</p>
            </div>
            <span className="chip bg-cream text-[0.6rem] text-ink/55">
              <ReceiptText className="size-3" aria-hidden />
              {entries.length} entries
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-cream text-ink/35">
                <ReceiptText className="size-6" aria-hidden />
              </span>
              <p className="mt-3 text-sm font-bold text-ink">No ledger entries yet</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
                Fund the wallet to create the first credit entry. It will appear here with its
                running balance.
              </p>
              <Link href="/dashboard" className="btn btn-accent btn-sm mt-4">
                Go to dashboard
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line/60">
              {entries.map((entry) => {
                const theme = entryTheme[entry.type];
                return (
                  <li key={entry.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", theme.wrap)}>
                      <theme.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{entry.description}</p>
                      <p className="mt-0.5 truncate font-mono text-[0.6rem] text-muted">
                        {entry.reference} · {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          entry.type === "DEBIT" ? "text-ink" : "text-success",
                        )}
                      >
                        {theme.sign}
                        {formatNaira(entry.amountKobo)}
                      </p>
                      <p className="mt-0.5 text-[0.6rem] text-muted">
                        Bal. {formatNaira(entry.balanceAfterKobo)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-lime-soft text-[#4d6b00]">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <h3 className="font-display text-base font-bold text-ink">Funding methods</h3>
            </div>
            <div className="mt-4 space-y-2.5">
              {[
                {
                  icon: CreditCard,
                  title: "Card checkout",
                  copy: "Instant credit through a sandbox card flow.",
                  tint: "bg-violet-soft text-violet",
                },
                {
                  icon: Banknote,
                  title: "Bank transfer",
                  copy: "Simulated transfer credit with a matching ledger entry.",
                  tint: "bg-sky-soft text-sky",
                },
              ].map((method) => (
                <div key={method.title} className="flex items-start gap-3 rounded-2xl border border-line p-3.5">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", method.tint)}>
                    <method.icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink">{method.title}</p>
                    <p className="mt-0.5 text-[0.65rem] leading-relaxed text-muted">{method.copy}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-[0.62rem] leading-relaxed text-muted">
              Both methods are simulated in this demo. Connect a processor before taking real
              payments.
            </p>
          </section>

          <AdSlot format="rectangle" />
        </aside>
      </div>

      <AdSlot format="leaderboard" label="Sponsored" />
    </div>
  );
}
