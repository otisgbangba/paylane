"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { TransactionStatus, TransactionType } from "@paylane/shared";
import { cn } from "@/lib/utils";

const statuses: { value: "ALL" | TransactionStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SUCCESS", label: "Successful" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

const types: { value: "ALL" | TransactionType; label: string }[] = [
  { value: "ALL", label: "All services" },
  { value: "AIRTIME", label: "Airtime" },
  { value: "DATA", label: "Data" },
  { value: "CABLE", label: "Cable TV" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "WALLET_FUNDING", label: "Wallet funding" },
];

export function TransactionFilterBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");

  const status = params.get("status") ?? "ALL";
  const type = params.get("type") ?? "ALL";
  const activeFilters = status !== "ALL" || type !== "ALL" || Boolean(params.get("q"));

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  function push(next: Record<string, string | null>) {
    const nextParams = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "ALL") nextParams.delete(key);
      else nextParams.set(key, value);
    }
    nextParams.delete("page");
    router.push(`/transactions${nextParams.size ? `?${nextParams.toString()}` : ""}`);
  }

  return (
    <div className="card p-3.5 sm:p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          push({ q: query.trim() || null });
        }}
        className="flex flex-col gap-2.5 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            className="field pl-11"
            placeholder="Search reference, recipient or description"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search transactions"
          />
        </div>
        <div className="relative">
          <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <select
            className="field appearance-none pl-11 pr-9 sm:w-44"
            value={type}
            onChange={(event) => push({ type: event.target.value })}
            aria-label="Filter by service"
          >
            {types.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm sm:px-5">
          Search
        </button>
      </form>

      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {statuses.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => push({ status: option.value })}
            className={cn(
              "chip shrink-0 border-line bg-white text-ink/55 hover:border-ink/25",
              status === option.value && "border-ink bg-ink text-cream hover:bg-forest",
            )}
          >
            {option.label}
          </button>
        ))}
        {activeFilters ? (
          <button
            type="button"
            onClick={() => router.push("/transactions")}
            className="chip ml-auto shrink-0 bg-danger-soft text-danger hover:bg-danger-soft/80"
          >
            <X className="size-3" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
