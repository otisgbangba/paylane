"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Database,
  RefreshCcw,
  Save,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  IDENTITY_CATEGORIES,
  formatDateTime,
  formatNaira,
  type AdminIdentityRequestDTO,
  type IdentityOverviewDTO,
  type IdentityProductDTO,
  type IdentityRequestStatus,
} from "@paylane/shared";
import { IdentityIcon } from "@/components/identity/identity-icon";
import { IDENTITY_STATUS_META } from "@/components/identity/identity-request-list";
import { IdentityResultModal } from "@/components/identity/identity-result-modal";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type RequestFilter = "ALL" | "SUCCESS" | "PENDING" | "FAILED" | "REFUNDED";

const REQUEST_FILTERS: { id: RequestFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "SUCCESS", label: "Completed" },
  { id: "PENDING", label: "In progress" },
  { id: "FAILED", label: "Failed" },
  { id: "REFUNDED", label: "Refunded" },
];

function matchesStatus(status: IdentityRequestStatus, filter: RequestFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "PENDING") return status === "PENDING" || status === "PROCESSING";
  return status === filter;
}

export function AdminVerifications({
  overview: initialOverview,
  products: initialProducts,
  requests: initialRequests,
}: {
  overview: IdentityOverviewDTO;
  products: IdentityProductDTO[];
  requests: AdminIdentityRequestDTO[];
}) {
  const { toast } = useToast();
  const [overview, setOverview] = useState(initialOverview);
  const [products, setProducts] = useState(initialProducts);
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<RequestFilter>("ALL");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<AdminIdentityRequestDTO | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  const usage = useMemo(() => {
    const map = new Map<string, { count: number; amountKobo: number }>();
    for (const item of overview.products) {
      map.set(item.productId, { count: item.count, amountKobo: item.amountKobo });
    }
    return map;
  }, [overview]);

  const visibleRequests = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter((request) => {
      if (!matchesStatus(request.status, filter)) return false;
      if (!needle) return true;
      return (
        request.reference.toLowerCase().includes(needle) ||
        request.productName.toLowerCase().includes(needle) ||
        request.subjectMasked.toLowerCase().includes(needle) ||
        request.user.name.toLowerCase().includes(needle) ||
        request.user.email.toLowerCase().includes(needle)
      );
    });
  }, [requests, filter, query]);

  async function refresh() {
    setRefreshing(true);
    const response = await apiRequest<{ requests: AdminIdentityRequestDTO[] }>(
      "/admin/verifications/requests?limit=100",
    );
    if (response.success) setRequests(response.data.requests);
    const overviewResponse = await apiRequest<{ overview: IdentityOverviewDTO }>(
      "/admin/verifications/overview",
    );
    if (overviewResponse.success) setOverview(overviewResponse.data.overview);
    setRefreshing(false);
    if (!response.success) {
      toast({ title: "Could not refresh", description: response.message, variant: "error" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {[
          { label: "Total requests", value: overview.totalRequests.toLocaleString("en-NG"), icon: Database, tint: "bg-sky-soft text-sky" },
          { label: "Success rate", value: `${overview.successRate}%`, icon: TrendingUp, tint: "bg-success-soft text-success" },
          { label: "Today", value: overview.todayCount.toLocaleString("en-NG"), icon: Users, tint: "bg-lime-soft text-[#4d6b00]" },
          { label: "Identity revenue", value: formatNaira(overview.revenueKobo), icon: TrendingUp, tint: "bg-coral-soft text-coral" },
        ].map((tile) => (
          <div key={tile.label} className="card p-4">
            <div className="flex items-center justify-between">
              <span className={cn("grid size-8 place-items-center rounded-xl", tile.tint)}>
                <tile.icon className="size-4" aria-hidden />
              </span>
              <span className="text-[0.55rem] font-bold uppercase tracking-[0.12em] text-muted">
                {tile.label}
              </span>
            </div>
            <p className="mt-3 font-display text-xl font-bold tracking-tight text-ink">{tile.value}</p>
            {tile.label === "Total requests" ? (
              <p className="mt-1 text-[0.6rem] text-muted">
                {overview.successCount} completed · {overview.failedCount} failed ·{" "}
                {overview.pendingCount} open
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/80 px-4 py-3.5">
          <div>
            <h3 className="font-display text-base font-bold text-ink">Catalogue and pricing</h3>
            <p className="mt-0.5 text-[0.65rem] text-muted">
              Change a price or switch a service off without a deploy. Changes are audited.
            </p>
          </div>
          <span className="chip bg-cream text-[0.58rem] text-ink/55">
            {products.filter((product) => product.isActive).length} active
          </span>
        </div>

        <div className="divide-y divide-line/70">
          {products.map((product) => (
            <ProductRow
              key={product.code}
              product={product}
              usage={usage.get(product.id) ?? { count: 0, amountKobo: 0 }}
              onSaved={(updated) => {
                setProducts((current) =>
                  current.map((item) => (item.code === updated.code ? updated : item)),
                );
                toast({ title: "Identity service updated", description: updated.name, variant: "success" });
              }}
            />
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-ink">Requests</h3>
            <p className="mt-0.5 text-[0.65rem] text-muted">
              {visibleRequests.length} of {requests.length} requests shown
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                className="field h-9 pl-9 text-xs"
                placeholder="Reference, customer or subject"
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
              aria-label="Refresh identity requests"
            >
              <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-line/70 bg-cream/40 px-4 py-2.5">
          {REQUEST_FILTERS.map((entry) => (
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

        {visibleRequests.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {requests.length === 0 ? "No identity requests yet." : "Nothing matches that filter."}
          </p>
        ) : (
          <ul className="divide-y divide-line/70">
            {visibleRequests.map((request) => {
              const status = IDENTITY_STATUS_META[request.status];
              return (
                <li key={request.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setResult(request);
                      setResultOpen(true);
                    }}
                    className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-cream/60 sm:flex-row sm:items-center"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <IdentityIcon
                        service={request.productId}
                        className="size-9 shrink-0 rounded-xl"
                        iconClassName="size-4"
                      />
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-bold text-ink">
                            {request.productName}
                          </span>
                          <span
                            className={cn(
                              "chip shrink-0 px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-[0.06em]",
                              status.className,
                            )}
                          >
                            {status.label}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[0.6rem] text-muted">
                          {request.reference} · {request.subjectMasked}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.62rem] text-muted">
                          {request.user.name} · {request.user.email} ·{" "}
                          {request.actorType === "API_KEY"
                            ? `API key ${request.apiKeyName ?? ""}`.trim()
                            : "Dashboard"}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 sm:text-right">
                      <span>
                        <span className="block text-xs font-bold text-ink">
                          {formatNaira(request.amountKobo)}
                        </span>
                        <span className="block text-[0.58rem] text-muted">
                          {formatDateTime(request.createdAt)}
                        </span>
                      </span>
                      <ChevronRight className="size-4 text-ink/25" aria-hidden />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <IdentityResultModal
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        request={result}
      />
    </div>
  );
}

function ProductRow({
  product,
  usage,
  onSaved,
}: {
  product: IdentityProductDTO;
  usage: { count: number; amountKobo: number };
  onSaved: (product: IdentityProductDTO) => void;
}) {
  const { toast } = useToast();
  const [price, setPrice] = useState(String(product.priceKobo / 100));
  const [turnaround, setTurnaround] = useState(product.turnaroundLabel);
  const [saving, setSaving] = useState(false);

  const category = IDENTITY_CATEGORIES.find((entry) => entry.id === product.category);
  const priceKobo = Math.round(Number(price) * 100);
  const dirty = priceKobo !== product.priceKobo || turnaround.trim() !== product.turnaroundLabel;

  async function patch(body: Record<string, unknown>, successMessage: string) {
    setSaving(true);
    const response = await apiRequest<{ product: IdentityProductDTO }>(
      `/admin/verifications/products/${product.code}`,
      { method: "PATCH", body },
    );
    setSaving(false);
    if (!response.success) {
      toast({ title: "Update failed", description: response.message, variant: "error" });
      return false;
    }
    onSaved(response.data.product);
    setPrice(String(response.data.product.priceKobo / 100));
    setTurnaround(response.data.product.turnaroundLabel);
    toast({ title: successMessage, description: response.data.product.name, variant: "success" });
    return true;
  }

  function savePrice() {
    if (!Number.isFinite(priceKobo) || priceKobo < 1_000) {
      toast({
        title: "Price is too low",
        description: "The minimum charge for an identity service is ₦10.",
        variant: "error",
      });
      return;
    }
    if (turnaround.trim().length < 2) {
      toast({
        title: "Turnaround is required",
        description: "Use a short label such as 'Instant' or 'Same day'.",
        variant: "error",
      });
      return;
    }
    void patch(
      { priceKobo, turnaroundLabel: turnaround.trim() },
      "Price updated",
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <IdentityIcon
          service={product.id}
          className="size-9 shrink-0 rounded-xl"
          iconClassName="size-4"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-ink">{product.name}</p>
            {product.popular ? (
              <span className="chip bg-lime-soft px-1.5 py-0 text-[0.5rem] font-bold uppercase tracking-[0.06em] text-[#3d5600]">
                Popular
              </span>
            ) : null}
            {!product.isActive ? (
              <span className="chip bg-danger-soft px-1.5 py-0 text-[0.5rem] font-bold uppercase tracking-[0.06em] text-danger">
                Off
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[0.62rem] text-muted">
            {category?.label ?? product.category} · {usage.count} requests ·{" "}
            {formatNaira(usage.amountKobo)} volume
          </p>
          <p className="mt-0.5 truncate font-mono text-[0.56rem] text-muted/80">
            /api/v1/verify/{product.code}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
            ₦
          </span>
          <input
            className="field h-9 w-28 pl-7 text-xs font-semibold"
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
            aria-label={`${product.name} price in naira`}
          />
        </div>
        <input
          className="field h-9 w-36 text-xs"
          value={turnaround}
          maxLength={60}
          onChange={(event) => setTurnaround(event.target.value)}
          aria-label={`${product.name} turnaround label`}
        />
        <button
          type="button"
          onClick={savePrice}
          disabled={!dirty || saving}
          className="btn btn-primary btn-sm h-9 disabled:opacity-40"
        >
          <Save className="size-3.5" aria-hidden />
          Save
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={product.isActive}
          aria-label={`${product.isActive ? "Disable" : "Enable"} ${product.name}`}
          disabled={saving}
          onClick={() =>
            void patch(
              { isActive: !product.isActive },
              product.isActive ? "Service disabled" : "Service enabled",
            )
          }
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50",
            product.isActive ? "bg-success" : "bg-line",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow transition",
              product.isActive ? "left-[1.375rem]" : "left-0.5",
            )}
          />
        </button>
      </div>
    </div>
  );
}
