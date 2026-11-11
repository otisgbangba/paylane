import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Gauge,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  SERVICE_LABELS,
  formatDate,
  formatNaira,
  type TransactionDTO,
  type TransactionSummaryDTO,
} from "@paylane/shared";
import { AdSlot } from "@/components/ads/ad-slot";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { WalletHealth } from "@/components/dashboard/wallet-health";
import { WalletHero } from "@/components/dashboard/wallet-hero";
import { ServiceIcon } from "@/components/brand";
import { StatusBadge } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/button";
import { fetchData, requireUser } from "@/lib/server-api";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const mixColours: Record<string, string> = {
  AIRTIME: "bg-lime",
  DATA: "bg-sky",
  CABLE: "bg-violet",
  ELECTRICITY: "bg-amber",
  WALLET_FUNDING: "bg-coral",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const [transactionsData, summaryData] = await Promise.all([
    fetchData<{ transactions: TransactionDTO[]; total: number }>("/transactions?limit=6"),
    fetchData<{ summary: TransactionSummaryDTO; ledgerBalanced: boolean }>("/transactions/summary"),
  ]);

  const transactions = transactionsData?.transactions ?? [];
  const summary = summaryData?.summary ?? null;

  const stats = [
    {
      label: "Spent · 30 days",
      value: summary ? formatNaira(summary.totalSpentKobo) : "—",
      note: summary ? `${summary.successfulCount} successful purchases` : "Summary unavailable",
      icon: TrendingUp,
      tint: "bg-coral-soft text-coral",
    },
    {
      label: "Success rate",
      value: summary ? `${summary.successRate}%` : "—",
      note: summary ? `${summary.successfulCount} of ${summary.successfulCount + summary.failedCount} completed` : "No completed requests yet",
      icon: Gauge,
      tint: "bg-violet-soft text-violet",
    },
    {
      label: "Pending",
      value: summary ? String(summary.pendingCount) : "—",
      note: "Awaiting vendor confirmation",
      icon: Clock3,
      tint: "bg-amber-soft text-[#9a6200]",
    },
    {
      label: "Transactions · 30d",
      value: summary ? String(summary.transactionCount) : "—",
      note: summary && summary.failedCount > 0 ? `${summary.failedCount} failed, refunded in full` : "No failed requests",
      icon: ReceiptText,
      tint: "bg-sky-soft text-sky",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <WalletHero summary={summary} />

      {user.isAdmin ? (
        <Link
          href="/admin"
          className="flex items-center justify-between gap-4 rounded-2xl border border-violet/20 bg-violet-soft px-4 py-3 transition hover:border-violet/40"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-violet">
              <Users className="size-4.5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">Administrator tools are open</span>
              <span className="block text-[0.68rem] text-ink/55">
                {user.isSuperAdmin
                  ? "Full owner access, including team management."
                  : `Scoped access to ${user.adminSections.length} section${user.adminSections.length === 1 ? "" : "s"}.`}
              </span>
            </span>
          </span>
          <ArrowUpRight className="size-4 text-violet" aria-hidden />
        </Link>
      ) : null}

      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted">
                {stat.label}
              </p>
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", stat.tint)}>
                <stat.icon className="size-4" aria-hidden />
              </span>
            </div>
            <p className="mt-2 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {stat.value}
            </p>
            <p className="mt-1 line-clamp-2 text-[0.62rem] leading-relaxed text-muted">{stat.note}</p>
          </article>
        ))}
      </section>

      <QuickActions />

      <AdSlot format="leaderboard" />

      <div className="grid gap-5 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line/80 px-4 py-4 sm:px-5">
              <div>
                <h2 className="font-display text-base font-bold text-ink">Recent activity</h2>
                <p className="mt-0.5 text-[0.65rem] text-muted">Latest six wallet movements.</p>
              </div>
              <Link
                href="/transactions"
                className="flex items-center gap-1 text-xs font-bold text-ink/60 transition hover:text-ink"
              >
                View all
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>

            {transactions.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-cream text-ink/35">
                  <ReceiptText className="size-6" aria-hidden />
                </span>
                <p className="mt-3 text-sm font-bold text-ink">No transactions yet</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
                  Fund your wallet, then buy airtime, data, cable or electricity. Receipts will
                  appear here.
                </p>
                <ButtonLink href="/airtime" variant="accent" size="sm" className="mt-4">
                  <Smartphone className="size-3.5" aria-hidden />
                  Buy airtime
                </ButtonLink>
              </div>
            ) : (
              <ul className="divide-y divide-line/60 px-2 py-1 sm:px-3">
                {transactions.map((transaction) => {
                  const inbound =
                    transaction.type === "WALLET_FUNDING" || transaction.status === "REFUNDED";
                  return (
                    <li key={transaction.id}>
                      <div className="flex items-center gap-3 rounded-xl px-1.5 py-3 transition hover:bg-cream/60 sm:px-2">
                        <ServiceIcon type={transaction.type} className="size-9 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {transaction.description}
                          </p>
                          <p className="mt-0.5 truncate text-[0.65rem] text-muted">
                            {transaction.recipient} · {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={cn(
                              "text-sm font-bold tabular-nums",
                              inbound ? "text-success" : "text-ink",
                            )}
                          >
                            {inbound ? "+" : "-"}
                            {formatNaira(transaction.totalKobo)}
                          </p>
                          <div className="mt-1 flex justify-end">
                            <StatusBadge status={transaction.status} />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {summary && summary.serviceMix.length > 0 ? (
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Where the money went</h2>
                  <p className="mt-0.5 text-[0.65rem] text-muted">Successful spend over 30 days.</p>
                </div>
                <span className="chip bg-cream text-[0.62rem] text-ink/55">
                  {formatNaira(summary.totalSpentKobo)}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {summary.serviceMix.map((item) => {
                  const percent = summary.totalSpentKobo
                    ? Math.max(3, Math.round((item.amountKobo / summary.totalSpentKobo) * 100))
                    : 0;
                  return (
                    <div key={item.type}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-ink/75">{SERVICE_LABELS[item.type]}</span>
                        <span className="font-bold text-ink">{formatNaira(item.amountKobo)}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream">
                        <div
                          className={cn("h-full rounded-full", mixColours[item.type] ?? "bg-ink")}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <WalletHealth />

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-success-soft text-success">
                <ShieldCheck className="size-4" aria-hidden />
              </span>
              <h2 className="font-display text-base font-bold text-ink">Before you confirm</h2>
            </div>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-muted">
              {[
                "Check the network and recipient shown in the price breakdown.",
                "Keep your PIN private. Paylane staff never ask for it.",
                "Every result gets a reference you can reopen from Transactions.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          <AdSlot format="rectangle" />
        </aside>
      </div>
    </div>
  );
}
