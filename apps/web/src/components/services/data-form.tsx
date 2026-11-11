"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  DatabaseZap,
  Phone,
  RefreshCcw,
  Sparkles,
  Wifi,
} from "lucide-react";
import {
  NETWORKS,
  detectNetwork,
  formatNaira,
  normalizeNigerianPhone,
  type DataPlanDTO,
  type NetworkId,
  type PurchaseResultDTO,
} from "@paylane/shared";
import { AdSlot } from "@/components/ads/ad-slot";
import { PriceBreakdown } from "@/components/services/price-breakdown";
import { SandboxNotes } from "@/components/services/sandbox-notes";
import { FormSection, ServiceHeader } from "@/components/services/service-header";
import { Button } from "@/components/ui/button";
import { PinDialog } from "@/components/ui/pin-dialog";
import { PurchaseReceipt } from "@/components/ui/purchase-receipt";
import { useToast } from "@/components/ui/toast";
import { useWallet } from "@/components/wallet/wallet-provider";
import { apiRequest, newIdempotencyKey } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export function DataForm({ plans }: { plans: DataPlanDTO[] }) {
  const { toast } = useToast();
  const { user, wallet, applyWallet, openFund } = useWallet();
  const [network, setNetwork] = useState<NetworkId>("MTN");
  const [networkTouched, setNetworkTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ network: NetworkId; phone: string; planId: string } | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [receipt, setReceipt] = useState<PurchaseResultDTO | null>(null);
  const idempotency = useRef(newIdempotencyKey());

  const normalized = normalizeNigerianPhone(phone);
  const detected = detectNetwork(phone);
  const networkPlans = plans.filter((plan) => plan.network === network);
  const selectedPlan = networkPlans.find((plan) => plan.id === planId) ?? null;
  const phoneValid = Boolean(normalized);
  const ready = phoneValid && Boolean(selectedPlan);
  const networkName = NETWORKS.find((entry) => entry.id === network)?.name ?? network;

  function chooseNetwork(next: NetworkId) {
    setNetwork(next);
    setNetworkTouched(true);
    setPlanId(null);
    setError(null);
  }

  function handlePhone(value: string) {
    setPhone(value);
    setError(null);
    const next = detectNetwork(value);
    if (next && !networkTouched && next !== network) {
      setNetwork(next);
      setPlanId(null);
    }
  }

  function openPin() {
    if (!phoneValid) {
      setError("Enter a valid Nigerian mobile number before continuing.");
      return;
    }
    if (!selectedPlan) {
      setError("Choose a data plan to continue.");
      return;
    }
    if (wallet.status === "FROZEN") {
      setError("Your wallet is frozen. Contact support before making a purchase.");
      return;
    }
    setError(null);
    setPending({ network, phone: normalized as string, planId: selectedPlan.id });
    idempotency.current = newIdempotencyKey();
    setPinOpen(true);
  }

  async function confirmPin(pin: string): Promise<string | null> {
    if (!pending) return "Purchase details were lost. Please start again.";

    const response = await apiRequest<PurchaseResultDTO>("/services/data", {
      body: { ...pending, pin },
      idempotencyKey: idempotency.current,
    });

    if (!response.success) {
      if (response.data?.wallet) applyWallet(response.data.wallet);
      if (response.data?.transaction) {
        setReceipt(response.data);
        setPinOpen(false);
        toast({ title: "Data purchase failed", description: response.message, variant: "error" });
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

    applyWallet(response.data.wallet);
    setReceipt(response.data);
    setPinOpen(false);
    setError(null);
    setPending(null);
    toast({
      title: response.status === "pending" ? "Data bundle is processing" : "Data bundle delivered",
      description: response.message,
      variant: response.status === "pending" ? "info" : "success",
    });
    return null;
  }

  return (
    <div className="space-y-5">
      <ServiceHeader
        type="DATA"
        eyebrow="Data bundles"
        title="Pick a bundle that fits the month."
        description="Daily, weekly and monthly plans across every network, with the price shown before the PIN step."
        highlights={["All networks", "No service fee", "Instant activation"]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.95fr]">
        <section className="card space-y-6 p-5 sm:p-6">
          <FormSection step="1" title="Choose a network" description="The plan list follows your selection.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NETWORKS.map((entry) => {
                const selected = entry.id === network;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => chooseNetwork(entry.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-2xl border-2 bg-white p-2.5 text-left transition",
                      selected
                        ? "border-ink shadow-[0_10px_24px_-18px_rgba(11,22,19,0.7)]"
                        : "border-transparent ring-1 ring-line hover:ring-ink/25",
                    )}
                    aria-pressed={selected}
                  >
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-full text-[0.68rem] font-black"
                      style={{
                        backgroundColor: entry.color,
                        color: entry.id === "MTN" || entry.id === "GLO" ? "#0b1613" : "#fff",
                      }}
                    >
                      {entry.short}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-ink">
                        {entry.id === "ETISALAT" ? "9mobile" : entry.id}
                      </span>
                      <span className="block text-[0.58rem] text-muted">
                        {plans.filter((plan) => plan.network === entry.id).length} plans
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection step="2" title="Recipient number" description="The bundle is tied to this number.">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="tel"
                inputMode="tel"
                className={cn("field pl-11 pr-24", error && !phoneValid && "field-error")}
                placeholder="0803 123 4567"
                value={phone}
                onChange={(event) => handlePhone(event.target.value)}
                onBlur={() => {
                  if (normalized) setPhone(normalized);
                }}
                aria-label="Recipient phone number"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {phoneValid ? (
                  <span className="chip bg-success-soft px-2 py-0.5 text-[0.58rem] text-success">
                    <CheckCircle2 className="size-3" aria-hidden />
                    Valid
                  </span>
                ) : (
                  <span className="text-[0.58rem] font-semibold text-muted">Required</span>
                )}
              </span>
            </div>
            {detected ? (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.65rem] text-muted">
                <Wifi className="size-3.5 text-ink/40" aria-hidden />
                Detected <span className="font-bold text-ink/70">{detected === "ETISALAT" ? "9mobile" : detected}</span>
                {networkTouched && detected !== network ? (
                  <span className="rounded-full bg-amber-soft px-2 py-0.5 font-semibold text-[#8a5a00]">
                    Prefix looks like {detected === "ETISALAT" ? "9mobile" : detected}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="mt-2 text-[0.65rem] text-muted">
                Example: 0803 123 4567. Spaces and +234 are accepted.
              </p>
            )}
          </FormSection>

          <FormSection
            step="3"
            title={`${networkName} plans`}
            description="Popular bundles are tagged so the common choice is easy to spot."
          >
            {networkPlans.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-4 py-8 text-center">
                <DatabaseZap className="size-6 text-muted" aria-hidden />
                <p className="mt-2 text-sm font-semibold text-ink">No plans loaded</p>
                <p className="mt-1 text-xs text-muted">
                  The catalog could not be reached. Refresh the page to try again.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {networkPlans.map((plan) => {
                  const selected = plan.id === planId;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setPlanId(plan.id);
                        setError(null);
                      }}
                      className={cn(
                        "relative flex flex-col rounded-2xl border p-3.5 text-left transition",
                        selected
                          ? "border-ink bg-ink text-cream shadow-[0_16px_36px_-24px_rgba(11,22,19,0.9)]"
                          : "border-line bg-white hover:border-ink/25 hover:shadow-sm",
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span>
                          <span className={cn("block font-display text-lg font-bold", selected ? "text-white" : "text-ink")}>
                            {plan.dataLabel}
                          </span>
                          <span className={cn("mt-0.5 block text-[0.62rem]", selected ? "text-white/50" : "text-muted")}>
                            {plan.name}
                          </span>
                        </span>
                        {plan.popular ? (
                          <span
                            className={cn(
                              "chip shrink-0 px-2 py-0.5 text-[0.52rem]",
                              selected ? "bg-lime text-ink" : "bg-lime-soft text-[#3d5600]",
                            )}
                          >
                            <Sparkles className="size-2.5" aria-hidden />
                            Popular
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-3 flex items-end justify-between gap-2">
                        <span className={cn("text-[0.6rem] font-medium", selected ? "text-white/45" : "text-muted")}>
                          {plan.validityLabel} · {plan.code}
                        </span>
                        <span className={cn("text-sm font-bold", selected ? "text-lime" : "text-ink")}>
                          {formatNaira(plan.priceKobo)}
                        </span>
                      </span>
                      {selected ? (
                        <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-lime text-ink ring-2 ring-cream">
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between text-[0.62rem] text-muted">
              <span>{networkPlans.length} active plans</span>
              <button
                type="button"
                onClick={() => {
                  setPlanId(null);
                  setError(null);
                }}
                className="flex items-center gap-1 font-semibold hover:text-ink"
              >
                <RefreshCcw className="size-3" aria-hidden />
                Clear choice
              </button>
            </div>
          </FormSection>

          {error ? (
            <div className="flex items-start gap-2.5 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="font-medium">{error}</p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <PriceBreakdown
            lines={[
              { label: "Plan", value: selectedPlan ? selectedPlan.name : "Choose a plan", muted: !selectedPlan },
              { label: "Data", value: selectedPlan?.dataLabel ?? "—" },
              { label: "Validity", value: selectedPlan?.validityLabel ?? "—" },
              { label: "Service fee", value: formatNaira(0) },
              { label: "Recipient", value: normalized ?? "Not set", muted: !normalized },
            ]}
            totalKobo={selectedPlan?.priceKobo ?? 0}
            footnote="The bundle activates on the recipient number once the vendor confirms."
          >
            {user.hasPin ? (
              <Button variant="accent" className="w-full" onClick={openPin} disabled={!ready}>
                Continue with PIN
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Link href="/settings" className="btn btn-accent w-full">
                Set a transaction PIN first
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </PriceBreakdown>

          <SandboxNotes
            items={[
              "Phone ending 0000: the vendor declines and the wallet is refunded automatically.",
              "Phone ending 1111: a transport timeout triggers provider failover.",
              "Any other number completes successfully.",
            ]}
          />

          <AdSlot format="rectangle" />
        </aside>
      </div>

      <PinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onConfirm={confirmPin}
        description="Authorise this data bundle with your 4-digit PIN."
        amountLabel={formatNaira(selectedPlan?.priceKobo ?? 0)}
        confirmLabel="Buy data"
      />

      {receipt ? (
        <PurchaseReceipt
          open
          onClose={() => setReceipt(null)}
          transaction={receipt.transaction}
          wallet={receipt.wallet}
        />
      ) : null}
    </div>
  );
}
