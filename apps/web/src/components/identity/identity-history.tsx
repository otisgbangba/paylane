"use client";

import { useMemo, useState } from "react";
import { RefreshCcw, Search } from "lucide-react";
import { formatNaira, type IdentityRequestDTO, type IdentityRequestStatus } from "@paylane/shared";
import { IdentityRequestList } from "@/components/identity/identity-request-list";
import { IdentityResultModal } from "@/components/identity/identity-result-modal";
import { useToast } from "@/components/ui/toast";
import { useWallet } from "@/components/wallet/wallet-provider";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type Filter = "ALL" | IdentityRequestStatus | "PROCESSING" | "REFUNDED";

const filters: { id: Filter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "SUCCESS", label: "Completed" },
  { id: "PENDING", label: "Queued" },
  { id: "FAILED", label: "Failed" },
  { id: "REFUNDED", label: "Refunded" },
];

function matchesFilter(request: IdentityRequestDTO, filter: Filter) {
  if (filter === "ALL") return true;
  if (filter === "PENDING") return request.status === "PENDING" || request.status === "PROCESSING";
  return request.status === filter;
}

export function IdentityHistory({ initialRequests }: { initialRequests: IdentityRequestDTO[] }) {
  const { toast } = useToast();
  const { wallet } = useWallet();
  const [requests, setRequests] = useState<IdentityRequestDTO[]>(initialRequests);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<IdentityRequestDTO | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter((request) => {
      if (!matchesFilter(request, filter)) return false;
      if (!needle) return true;
      return (
        request.reference.toLowerCase().includes(needle) ||
        request.productName.toLowerCase().includes(needle) ||
        request.subjectMasked.toLowerCase().includes(needle)
      );
    });
  }, [requests, filter, query]);

  const totals = useMemo(
    () => ({
      all: requests.length,
      completed: requests.filter((request) => request.status === "SUCCESS").length,
      open: requests.filter(
        (request) => request.status === "PENDING" || request.status === "PROCESSING",
      ).length,
      spent: requests
        .filter((request) => request.status === "SUCCESS")
        .reduce((sum, request) => sum + request.amountKobo, 0),
    }),
    [requests],
  );

  async function refresh() {
    setRefreshing(true);
    const response = await apiRequest<{ requests: IdentityRequestDTO[] }>("/identity/requests");
    setRefreshing(false);
    if (!response.success) {
      toast({ title: "Could not refresh", description: response.message, variant: "error" });
      return;
    }
    setRequests(response.data.requests);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          { label: "Requests", value: String(totals.all) },
          { label: "Completed", value: String(totals.completed), tone: "text-success" },
          { label: "In progress", value: String(totals.open), tone: "text-amber" },
          { label: "Spent on checks", value: formatNaira(totals.spent) },
        ].map((tile) => (
          <div key={tile.label} className="card px-4 py-3">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted">
              {tile.label}
            </p>
            <p className={cn("mt-1 font-display text-xl font-bold tracking-tight text-ink", tile.tone)}>
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setFilter(entry.id)}
                className={cn(
                  "chip px-2.5 py-0.5 text-[0.62rem] font-bold transition",
                  filter === entry.id
                    ? "bg-ink text-lime"
                    : "border-line bg-white text-ink/55 hover:text-ink",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                className="field h-9 pl-9 text-xs"
                placeholder="Search reference or service"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search identity requests"
              />
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink/60 transition hover:text-ink disabled:opacity-50"
              aria-label="Refresh requests"
            >
              <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} aria-hidden />
            </button>
          </div>
        </div>

        <IdentityRequestList
          requests={visible}
          emptyLabel={requests.length === 0 ? "No identity requests yet." : "Nothing matches that filter."}
          onOpen={(request) => {
            setResult(request);
            setOpen(true);
          }}
        />
      </section>

      <IdentityResultModal
        open={open}
        onClose={() => setOpen(false)}
        request={result}
        walletBalanceKobo={wallet.balanceKobo}
      />
    </div>
  );
}
