import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock3, Gauge, ReceiptText, TrendingUp } from "lucide-react";
import {
  formatNaira,
  type TransactionDTO,
  type TransactionStatus,
  type TransactionSummaryDTO,
  type TransactionType,
} from "@paylane/shared";
import { AdSlot } from "@/components/ads/ad-slot";
import { TransactionFilterBar } from "@/components/transactions/transaction-filter-bar";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { fetchData } from "@/lib/server-api";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Transactions" };

const statusValues: TransactionStatus[] = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"];
const typeValues: TransactionType[] = ["AIRTIME", "DATA", "CABLE", "ELECTRICITY", "WALLET_FUNDING"];
const PAGE_SIZE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const read = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const status = statusValues.includes(read("status") as TransactionStatus)
    ? (read("status") as TransactionStatus)
    : undefined;
  const type = typeValues.includes(read("type") as TransactionType)
    ? (read("type") as TransactionType)
    : undefined;
  const q = read("q")?.slice(0, 80);
  const page = Math.max(1, Number.parseInt(read("page") ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const listParams = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  if (status) listParams.set("status", status);
  if (type) listParams.set("type", type);
  if (q) listParams.set("q", q);

  const [list, summaryData] = await Promise.all([
    fetchData<{ transactions: TransactionDTO[]; total: number }>(`/transactions?${listParams.toString()}`),
    fetchData<{ summary: TransactionSummaryDTO; ledgerBalanced: boolean }>("/transactions/summary"),
  ]);

  const transactions = list?.transactions ?? [];
  const total = list?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const summary = summaryData?.summary ?? null;

  function pageHref(target: number): string {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (type) next.set("type", type);
    if (q) next.set("q", q);
    if (target > 1) next.set("page", String(target));
    return `/transactions${next.size ? `?${next.toString()}` : ""}`;
  }

  const stats = [
    {
      label: "Spent · 30 days",
      value: summary ? formatNaira(summary.totalSpentKobo) : "—",
      icon: TrendingUp,
      tint: "bg-coral-soft text-coral",
    },
    {
      label: "Success rate",
      value: summary ? `${summary.successRate}%` : "—",
      icon: Gauge,
      tint: "bg-violet-soft text-violet",
    },
    {
      label: "Pending",
      value: summary ? String(summary.pendingCount) : "—",
      icon: Clock3,
      tint: "bg-amber-soft text-[#9a6200]",
    },
    {
      label: "Records",
      value: String(total),
      icon: ReceiptText,
      tint: "bg-sky-soft text-sky",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
            Receipts
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.8rem]">
            Transaction history
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink/55">
            Search by reference or recipient, filter by status and open any row for the full
            receipt.
          </p>
        </div>
        <span
          className={cn(
            "chip w-fit text-[0.62rem]",
            summaryData?.ledgerBalanced === false
              ? "bg-danger-soft text-danger"
              : "bg-white text-ink/55",
          )}
        >
          <span
            className={cn(
              "status-dot",
              summaryData?.ledgerBalanced === false ? "bg-danger" : "bg-success",
            )}
          />
          {summaryData?.ledgerBalanced === false ? "Ledger mismatch" : "Ledger reconciled"}
        </span>
      </div>

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
          </article>
        ))}
      </section>

      <TransactionFilterBar />
      <TransactionsList transactions={transactions} />

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={cn(
              "btn btn-outline btn-sm",
              page <= 1 && "pointer-events-none opacity-40",
            )}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </Link>
          <p className="text-xs font-semibold text-muted">
            Page {page} of {totalPages}
          </p>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={cn(
              "btn btn-outline btn-sm",
              page >= totalPages && "pointer-events-none opacity-40",
            )}
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </nav>
      ) : null}

      <AdSlot format="leaderboard" label="Sponsored" />
    </div>
  );
}
