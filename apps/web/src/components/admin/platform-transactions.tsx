"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ReceiptText, Search } from "lucide-react";
import {
  SERVICE_LABELS,
  formatDateTime,
  formatNaira,
  type TransactionDTO,
  type TransactionStatus,
  type TransactionType,
} from "@paylane/shared";
import { apiRequest } from "@/lib/client-api";
import { StatusBadge, TypeChip } from "@/components/ui/badges";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: "" | TransactionStatus; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "SUCCESS", label: "Successful" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

const TYPE_OPTIONS: { value: "" | TransactionType; label: string }[] = [
  { value: "", label: "All services" },
  { value: "AIRTIME", label: "Airtime" },
  { value: "DATA", label: "Data" },
  { value: "CABLE", label: "Cable TV" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "WALLET_FUNDING", label: "Wallet funding" },
];

export function PlatformTransactions({
  initialTransactions,
  initialTotal,
}: {
  initialTransactions: TransactionDTO[];
  initialTotal: number;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [total, setTotal] = useState(initialTotal);
  const [status, setStatus] = useState<"" | TransactionStatus>("");
  const [type, setType] = useState<"" | TransactionType>("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TransactionDTO | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (query.trim()) params.set("q", query.trim());

      const response = await apiRequest<{
        transactions: TransactionDTO[];
        total: number;
      }>(`/admin/transactions?${params.toString()}`);

      if (response.success) {
        setTransactions(response.data.transactions);
        setTotal(response.data.total);
        setError(null);
      } else {
        setError(response.message);
      }
      setLoading(false);
    }, 240);
    return () => window.clearTimeout(handle);
  }, [status, type, query, offset]);

  const pageSummary = useMemo(
    () => ({
      value: transactions.reduce(
        (sum, tx) => (tx.status === "SUCCESS" ? sum + tx.totalKobo : sum),
        0,
      ),
      settled: transactions.filter((tx) => tx.status === "SUCCESS").length,
    }),
    [transactions],
  );

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Matching transactions", value: String(total) },
          { label: "Settled on this page", value: String(pageSummary.settled) },
          { label: "Page value", value: formatNaira(pageSummary.value) },
        ].map((stat) => (
          <div key={stat.label} className="card px-4 py-3.5">
            <p className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted">
              {stat.label}
            </p>
            <p className="mt-1 font-display text-lg font-bold text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line/80 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink">Platform transactions</h3>
              <p className="mt-0.5 text-[0.65rem] text-muted">
                Every attempt across all customer wallets, newest first.
              </p>
            </div>
            <label className="relative block w-full lg:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={query}
                onChange={(event) => {
                  setOffset(0);
                  setQuery(event.target.value);
                }}
                placeholder="Reference, recipient, customer"
                className="field py-2.5 pl-9 text-xs"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(event) => {
                setOffset(0);
                setStatus(event.target.value as "" | TransactionStatus);
              }}
              className="field w-auto py-2 text-[0.7rem]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={type}
              onChange={(event) => {
                setOffset(0);
                setType(event.target.value as "" | TransactionType);
              }}
              className="field w-auto py-2 text-[0.7rem]"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {loading ? (
              <span className="self-center text-[0.62rem] font-semibold text-muted">Loading…</span>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="bg-danger-soft px-4 py-2 text-[0.68rem] font-semibold text-danger">{error}</p>
        ) : null}

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-cream text-ink/35">
              <ReceiptText className="size-6" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-bold text-ink">
              {loading ? "Loading transactions…" : "No transactions match"}
            </p>
            <p className="mt-1 text-xs text-muted">Adjust the filters or clear the search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-line/70 bg-cream/50 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted">
                  <th className="px-4 py-2.5 sm:px-5">Reference</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelected(tx)}
                    className="cursor-pointer text-xs transition hover:bg-cream/40"
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-mono text-[0.62rem] font-semibold text-ink">{tx.reference}</p>
                      <p className="truncate text-[0.6rem] text-muted">{tx.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{tx.user?.name ?? "—"}</p>
                      <p className="truncate text-[0.6rem] text-muted">{tx.user?.email ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <TypeChip type={tx.type} />
                      <p className="mt-1 text-[0.6rem] text-muted">{tx.recipient}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-ink">
                      {formatNaira(tx.totalKobo)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-[0.62rem] text-muted">
                      {formatDateTime(tx.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line/70 bg-cream/40 px-4 py-3 sm:px-5">
          <p className="text-[0.62rem] text-muted">
            Page {page} of {pages}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setOffset(Math.max(offset - PAGE_SIZE, 0))}
              disabled={offset === 0 || loading}
              className="btn btn-outline btn-sm text-[0.65rem] disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={page >= pages || loading}
              className="btn btn-outline btn-sm text-[0.65rem] disabled:opacity-40"
            >
              Next
              <ChevronRight className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Transaction detail"
        description={selected?.reference}
        size="md"
        footer={
          <div className="flex justify-end">
            <button type="button" onClick={() => setSelected(null)} className="btn btn-primary btn-sm">
              Close
            </button>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream/70 px-4 py-3">
              <div>
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted">
                  {SERVICE_LABELS[selected.type]}
                </p>
                <p className="mt-0.5 text-lg font-bold text-ink">{formatNaira(selected.totalKobo)}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <dl className="divide-y divide-line/60 text-xs">
              {[
                ["Customer", selected.user ? `${selected.user.name} · ${selected.user.email}` : "—"],
                ["Recipient", selected.recipient],
                ["Amount", formatNaira(selected.amountKobo)],
                ["Fee", formatNaira(selected.feeKobo)],
                ["Provider", selected.providerCode ?? "—"],
                ["Provider reference", selected.providerRef ?? "—"],
                ["Created", formatDateTime(selected.createdAt)],
                ["Completed", selected.completedAt ? formatDateTime(selected.completedAt) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {selected.failureReason ? (
              <p className="rounded-xl bg-danger-soft px-3 py-2 text-[0.68rem] font-medium text-danger">
                {selected.failureReason}
              </p>
            ) : null}
            {selected.metadata ? (
              <pre className="overflow-x-auto rounded-xl bg-forest px-3 py-2.5 font-mono text-[0.6rem] leading-relaxed text-white/75">
                {JSON.stringify(selected.metadata, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
