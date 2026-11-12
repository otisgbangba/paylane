"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Code2,
  Fingerprint,
  History,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  IDENTITY_CATEGORIES,
  formatNaira,
  type IdentityCategory,
  type IdentityFieldDef,
  type IdentityProductDTO,
  type IdentityPurchaseResultDTO,
  type IdentityRequestDTO,
  type IdentityServiceId,
} from "@paylane/shared";
import { AdSlot } from "@/components/ads/ad-slot";
import {
  CATEGORY_ICONS,
  IdentityIcon,
} from "@/components/identity/identity-icon";
import { IdentityRequestList } from "@/components/identity/identity-request-list";
import { IdentityResultModal } from "@/components/identity/identity-result-modal";
import { PriceBreakdown } from "@/components/services/price-breakdown";
import { Button } from "@/components/ui/button";
import { PinDialog } from "@/components/ui/pin-dialog";
import { useToast } from "@/components/ui/toast";
import { useWallet } from "@/components/wallet/wallet-provider";
import { apiRequest, newIdempotencyKey } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type CategoryFilter = IdentityCategory | "ALL";

function fieldInput(
  def: IdentityFieldDef,
  value: string,
  onChange: (value: string) => void,
) {
  const id = `identity-${def.name}`;

  if (def.type === "select") {
    return (
      <select
        id={id}
        className="field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={def.label}
      >
        <option value="">Choose…</option>
        {(def.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (def.type === "textarea") {
    return (
      <textarea
        id={id}
        className="field min-h-24 resize-y"
        rows={3}
        maxLength={def.maxLength}
        placeholder={def.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={def.label}
      />
    );
  }

  const numeric = def.type === "nin" || def.type === "bvn";
  return (
    <input
      id={id}
      className="field"
      type={def.type === "date" ? "date" : def.type === "email" ? "email" : "text"}
      inputMode={numeric || def.type === "phone" ? "numeric" : undefined}
      autoComplete={def.type === "nin" || def.type === "bvn" ? "off" : undefined}
      maxLength={def.maxLength}
      placeholder={def.placeholder}
      value={value}
      onChange={(event) => {
        const next = numeric
          ? event.target.value.replace(/\D/g, "").slice(0, def.maxLength ?? 11)
          : event.target.value;
        onChange(next);
      }}
      aria-label={def.label}
    />
  );
}

function validate(product: IdentityProductDTO, values: Record<string, string>, consent: boolean) {
  for (const def of product.fields) {
    const value = (values[def.name] ?? "").trim();
    if (def.required && !value) return `${def.label} is required.`;
    if (!value) continue;
    if ((def.type === "nin" || def.type === "bvn") && !/^\d{11}$/.test(value)) {
      return `${def.label} must be exactly 11 digits.`;
    }
    if (def.type === "phone" && !/^(\+234|234|0)[789]\d{9}$/.test(value.replace(/[\s-]/g, ""))) {
      return `${def.label}: enter a valid Nigerian mobile number.`;
    }
    if (def.type === "date" && new Date(value).getTime() > Date.now()) {
      return `${def.label} cannot be in the future.`;
    }
  }
  if (!consent) {
    return "Tick the consent box to confirm you have the subject's permission for this check.";
  }
  return null;
}

export function VerifyHub({
  products,
  initialRequests,
  providerMode,
}: {
  products: IdentityProductDTO[];
  initialRequests: IdentityRequestDTO[];
  providerMode: "SANDBOX" | "HTTP";
}) {
  const { toast } = useToast();
  const { user, applyWallet, openFund } = useWallet();
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [selectedId, setSelectedId] = useState<IdentityServiceId | null>(
    products.find((product) => product.popular)?.id ?? products[0]?.id ?? null,
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<IdentityRequestDTO[]>(initialRequests);
  const [result, setResult] = useState<IdentityRequestDTO | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const idempotency = useRef(newIdempotencyKey());

  const selected = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId],
  );

  const visible = useMemo(
    () => products.filter((product) => category === "ALL" || product.category === category),
    [products, category],
  );

  const counts = useMemo(() => {
    const map = new Map<IdentityCategory, number>();
    for (const product of products) {
      map.set(product.category, (map.get(product.category) ?? 0) + 1);
    }
    return map;
  }, [products]);

  function choose(product: IdentityProductDTO) {
    setSelectedId(product.id);
    setValues({});
    setConsent(false);
    setError(null);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      window.setTimeout(() => {
        document.getElementById("identity-checkout")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 60);
    }
  }

  function remember(request: IdentityRequestDTO) {
    setRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]);
  }

  function resetForm() {
    setValues({});
    setConsent(false);
    setError(null);
    idempotency.current = newIdempotencyKey();
  }

  function openPin() {
    if (!selected) {
      setError("Choose an identity service to continue.");
      return;
    }
    const message = validate(selected, values, consent);
    if (message) {
      setError(message);
      return;
    }
    if (user.wallet.status === "FROZEN") {
      setError("Your wallet is frozen. Contact support before running a check.");
      return;
    }
    setError(null);
    idempotency.current = newIdempotencyKey();
    setPinOpen(true);
  }

  async function confirmPin(pin: string): Promise<string | null> {
    if (!selected) return "Choose an identity service first.";
    setSubmitting(true);
    const response = await apiRequest<IdentityPurchaseResultDTO>("/identity/requests", {
      body: { service: selected.id, fields: values, consent: true, pin },
      idempotencyKey: idempotency.current,
    });
    setSubmitting(false);

    if (!response.success) {
      const data = response.data;
      if (data?.request) {
        applyWallet(data.wallet);
        remember(data.request);
        setResult(data.request);
        setResultOpen(true);
        setPinOpen(false);
        resetForm();
        toast({
          title: "Identity request not completed",
          description: response.message,
          variant: "error",
        });
        return null;
      }
      if (response.error.code === "AUTH_PIN_INVALID" || response.error.code === "AUTH_PIN_LOCKED") {
        return response.message;
      }
      setPinOpen(false);
      setError(response.message);
      if (response.error.code === "INSUFFICIENT_FUNDS") openFund();
      return null;
    }

    const data = response.data;
    applyWallet(data.wallet);
    remember(data.request);
    setResult(data.request);
    setResultOpen(true);
    setPinOpen(false);
    resetForm();
    toast({
      title:
        data.request.status === "SUCCESS"
          ? `${data.request.productName} completed`
          : `${data.request.productName} submitted`,
      description: data.request.summary,
      variant: "success",
    });
    return null;
  }

  const ActiveIcon = selected ? CATEGORY_ICONS[selected.category] ?? Fingerprint : Fingerprint;

  return (
    <div className="space-y-5">
      <section className="wallet-mesh relative overflow-hidden rounded-[1.75rem] px-5 py-6 text-white sm:px-8 sm:py-8">
        <span
          className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-violet/25 blur-3xl"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -bottom-24 left-1/4 size-64 rounded-full bg-lime/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="chip bg-white/10 text-lime">
              <Fingerprint className="size-3.5" aria-hidden />
              NIN · BVN · Government ID
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-[2.6rem]">
              Identity, verified instantly.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
              Run NIN and BVN checks, retrieve the NIN slip, clear an IPE and raise record
              updates from a wallet you control. Results land in seconds and every request keeps
              its receipt.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { icon: Timer, label: "Instant lookups" },
                { icon: ShieldCheck, label: "Consent-first checks" },
                { icon: Code2, label: "REST API access" },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[0.62rem] font-semibold text-white/70 ring-1 ring-inset ring-white/10"
                >
                  <item.icon className="size-3.5 text-lime" aria-hidden />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                "chip px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em]",
                providerMode === "HTTP"
                  ? "bg-lime text-ink"
                  : "bg-white/10 text-white/70",
              )}
            >
              <span
                className={cn(
                  "status-dot",
                  providerMode === "HTTP" ? "bg-ink" : "bg-amber",
                )}
              />
              {providerMode === "HTTP" ? "Live vendor connected" : "Sandbox results"}
            </span>
            <span className="chip bg-white/10 px-3 py-1 text-[0.6rem] font-semibold text-white/70">
              {products.length} services
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          <section className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategory("ALL")}
                className={cn(
                  "chip px-3 py-1 text-[0.65rem] font-bold transition",
                  category === "ALL"
                    ? "bg-ink text-lime"
                    : "border-line bg-white text-ink/55 hover:text-ink",
                )}
              >
                All services
                <span className="ml-1 text-[0.58rem] opacity-60">{products.length}</span>
              </button>
              {IDENTITY_CATEGORIES.map((entry) => {
                const Icon = CATEGORY_ICONS[entry.id] ?? Fingerprint;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setCategory(entry.id)}
                    className={cn(
                      "chip px-3 py-1 text-[0.65rem] font-bold transition",
                      category === entry.id
                        ? "bg-ink text-lime"
                        : "border-line bg-white text-ink/55 hover:text-ink",
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {entry.label}
                    <span className="ml-1 text-[0.58rem] opacity-60">
                      {counts.get(entry.id) ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {visible.map((product) => {
                const active = product.id === selectedId;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => choose(product)}
                    aria-pressed={active}
                    className={cn(
                      "group flex flex-col rounded-2xl border-2 p-3.5 text-left transition",
                      active
                        ? "border-ink bg-ink text-cream shadow-[0_18px_40px_-26px_rgba(11,22,19,0.9)]"
                        : "border-transparent bg-white ring-1 ring-line hover:ring-ink/25",
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <IdentityIcon
                        service={product.id}
                        className={cn("size-9 rounded-xl", active && "bg-white/10")}
                        iconClassName="size-4"
                      />
                      {product.popular ? (
                        <span
                          className={cn(
                            "chip px-2 py-0.5 text-[0.52rem] font-bold uppercase tracking-[0.06em]",
                            active ? "bg-lime text-ink" : "bg-lime-soft text-[#3d5600]",
                          )}
                        >
                          Popular
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "mt-3 text-sm font-bold leading-tight",
                        active ? "text-white" : "text-ink",
                      )}
                    >
                      {product.name}
                    </span>
                    <span
                      className={cn(
                        "mt-1 line-clamp-2 text-[0.64rem] leading-relaxed",
                        active ? "text-white/50" : "text-muted",
                      )}
                    >
                      {product.tagline}
                    </span>
                    <span className="mt-3 flex items-end justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          active ? "text-lime" : "text-ink",
                        )}
                      >
                        {formatNaira(product.priceKobo)}
                      </span>
                      <span
                        className={cn(
                          "text-[0.56rem] font-semibold",
                          active ? "text-white/40" : "text-muted",
                        )}
                      >
                        {product.turnaroundLabel}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {visible.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                No services in this category yet.
              </p>
            ) : null}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line/80 px-4 py-3">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink">
                <History className="size-4 text-muted" aria-hidden />
                Recent requests
              </h3>
              <Link
                href="/verify/requests"
                className="inline-flex items-center gap-1 text-[0.68rem] font-bold text-ink/60 transition hover:text-ink"
              >
                View all
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <IdentityRequestList
              requests={requests.slice(0, 5)}
              onOpen={(request) => {
                setResult(request);
                setResultOpen(true);
              }}
            />
          </section>
        </div>

        <aside className="space-y-4">
          <section id="identity-checkout" className="card scroll-mt-24 overflow-hidden">
            {selected ? (
              <>
                <div className="flex items-start gap-3 border-b border-line/80 px-5 py-4">
                  <IdentityIcon service={selected.id} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
                      Selected service
                    </p>
                    <h3 className="mt-0.5 font-display text-lg font-bold leading-tight text-ink">
                      {selected.name}
                    </h3>
                    <p className="mt-1 text-[0.68rem] leading-relaxed text-muted">
                      {selected.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <div className="space-y-3">
                    {selected.fields.map((def) => (
                      <div key={def.name}>
                        <label className="label" htmlFor={`identity-${def.name}`}>
                          {def.label}
                          {!def.required ? (
                            <span className="ml-1 font-normal text-muted">(optional)</span>
                          ) : null}
                        </label>
                        {fieldInput(def, values[def.name] ?? "", (value) => {
                          setValues((current) => ({ ...current, [def.name]: value }));
                          setError(null);
                        })}
                        {def.hint ? (
                          <p className="mt-1 text-[0.62rem] leading-relaxed text-muted">{def.hint}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 transition",
                      consent ? "border-success/30 bg-success-soft/60" : "border-line bg-cream/60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => {
                        setConsent(event.target.checked);
                        setError(null);
                      }}
                      className="mt-0.5 size-4 shrink-0 accent-ink"
                    />
                    <span className="text-[0.66rem] leading-relaxed text-ink/70">
                      I confirm I have the subject&apos;s permission to run this check and accept
                      that the fee is charged to my Paylane wallet.
                    </span>
                  </label>

                  <PriceBreakdown
                    lines={[
                      { label: "Service", value: selected.name },
                      { label: "Turnaround", value: selected.turnaroundLabel },
                      { label: "Service fee", value: formatNaira(0) },
                    ]}
                    totalKobo={selected.priceKobo}
                    badge={selected.resultKind === "DOCUMENT" ? "Document" : "Instant quote"}
                    footnote="Sensitive values are hashed for the audit trail and masked on every receipt. Raw NIN and BVN values are never stored by Paylane."
                  >
                    {user.hasPin ? (
                      <Button
                        variant="accent"
                        className="w-full"
                        onClick={openPin}
                        loading={submitting}
                        disabled={!consent}
                      >
                        <KeyRound className="size-4" aria-hidden />
                        Continue with PIN
                      </Button>
                    ) : (
                      <Link href="/settings" className="btn btn-accent w-full">
                        Set a transaction PIN first
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    )}
                    {!consent ? (
                      <p className="mt-2 flex items-center justify-center gap-1.5 text-[0.6rem] font-medium text-muted">
                        <ShieldCheck className="size-3.5" aria-hidden />
                        Consent is required before payment
                      </p>
                    ) : null}
                  </PriceBreakdown>

                  {error ? (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-danger/20 bg-danger-soft px-3.5 py-3 text-xs text-danger">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <p className="font-medium">{error}</p>
                    </div>
                  ) : null}

                  {submitting ? (
                    <p className="flex items-center gap-1.5 text-[0.65rem] text-muted">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Sending the request to the identity provider…
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="px-5 py-10 text-center">
                <ActiveIcon className="mx-auto size-6 text-muted" aria-hidden />
                <p className="mt-2 text-sm font-semibold text-ink">Choose a service</p>
                <p className="mt-1 text-xs text-muted">
                  Pick a card to load its form and price.
                </p>
              </div>
            )}
          </section>

          <section className="card p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime-soft text-[#4d6b00]">
                <BadgeCheck className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">
                  {providerMode === "HTTP" ? "Connected to your vendor" : "Sandbox behaviour"}
                </p>
                <p className="mt-1 text-[0.66rem] leading-relaxed text-muted">
                  {providerMode === "HTTP"
                    ? "Requests are signed and routed to the identity vendor configured for this deployment. Provider credentials never reach the browser."
                    : "No vendor credentials are configured, so results are deterministic samples. A NIN or BVN starting with 999 simulates a retryable timeout, and one ending in 0000 simulates a record that cannot be found."}
                </p>
              </div>
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-soft text-violet">
                <Code2 className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">Automate with the API</p>
                <p className="mt-1 text-[0.66rem] leading-relaxed text-muted">
                  Create a key in settings, then call the same services from your backend with an
                  idempotency header.
                </p>
                <pre className="mt-2.5 overflow-x-auto rounded-xl bg-forest px-3 py-2.5 text-[0.58rem] leading-relaxed text-lime/90">
{`POST /api/v1/verify/nin-verification
Authorization: Bearer plk_live_…
Idempotency-Key: <uuid>

{"fields":{"nin":"12345678901"},"consent":true}`}
                </pre>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-ink/70 transition hover:text-ink"
                  >
                    <Sparkles className="size-3.5" aria-hidden />
                    Manage API keys
                  </Link>
                  <Link
                    href="/api-docs"
                    className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-ink/70 transition hover:text-ink"
                  >
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    Read the docs
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <AdSlot format="rectangle" />
        </aside>
      </div>

      <PinDialog
        open={pinOpen}
        onClose={() => {
          if (!submitting) setPinOpen(false);
        }}
        onConfirm={confirmPin}
        description="Authorise this identity request with your 4-digit transaction PIN."
        amountLabel={selected ? formatNaira(selected.priceKobo) : undefined}
        confirmLabel="Pay and run check"
      />

      <IdentityResultModal
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        request={result}
        walletBalanceKobo={user.wallet.balanceKobo}
      />
    </div>
  );
}
