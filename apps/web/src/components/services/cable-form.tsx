"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  ScanLine,
  ShieldCheck,
  Tv,
} from "lucide-react";
import {
  CABLE_PROVIDERS,
  formatNaira,
  type CablePlanDTO,
  type CableProviderId,
  type PurchaseResultDTO,
  type VerificationResultDTO,
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

function maskSmartcard(value: string): string {
  if (value.length < 6) return value;
  return `${value.slice(0, 3)}${"•".repeat(Math.max(3, value.length - 5))}${value.slice(-2)}`;
}

export function CableForm({ plans }: { plans: CablePlanDTO[] }) {
  const { toast } = useToast();
  const { user, wallet, applyWallet, openFund } = useWallet();
  const [provider, setProvider] = useState<CableProviderId>("DSTV");
  const [smartcard, setSmartcard] = useState("");
  const [verification, setVerification] = useState<VerificationResultDTO | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    provider: CableProviderId;
    smartcardNumber: string;
    planId: string;
  } | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [receipt, setReceipt] = useState<PurchaseResultDTO | null>(null);
  const idempotency = useRef(newIdempotencyKey());

  const providerPlans = plans.filter((plan) => plan.provider === provider);
  const selectedPlan = providerPlans.find((plan) => plan.id === planId) ?? null;
  const providerName = CABLE_PROVIDERS.find((entry) => entry.id === provider)?.name ?? provider;
  const smartcardValid = /^\d{10,12}$/.test(smartcard);
  const verified = Boolean(verification?.valid);
  const ready = verified && Boolean(selectedPlan);

  function chooseProvider(next: CableProviderId) {
    setProvider(next);
    setVerification(null);
    setPlanId(null);
    setError(null);
  }

  function changeSmartcard(value: string) {
    setSmartcard(value.replace(/\D/g, "").slice(0, 12));
    setVerification(null);
    setPlanId(null);
    setError(null);
  }

  async function verify() {
    if (!smartcardValid) {
      setError("Smartcard and IUC numbers are 10 to 12 digits.");
      return;
    }
    setVerifying(true);
    setError(null);
    const response = await apiRequest<VerificationResultDTO>("/services/cable/verify", {
      body: { provider, smartcardNumber: smartcard },
    });
    setVerifying(false);

    if (!response.success) {
      setVerification(null);
      setError(response.message);
      return;
    }
    if (!response.data.valid) {
      setVerification(null);
      setError(response.data.message);
      return;
    }
    setVerification(response.data);
    toast({
      title: "Smartcard verified",
      description: `${response.data.customer.customerName} · ${providerName}`,
      variant: "success",
    });
  }

  function openPin() {
    if (!verified) {
      setError("Verify the smartcard before choosing a plan.");
      return;
    }
    if (!selectedPlan) {
      setError("Choose a cable plan to continue.");
      return;
    }
    if (wallet.status === "FROZEN") {
      setError("Your wallet is frozen. Contact support before making a purchase.");
      return;
    }
    setError(null);
    setPending({ provider, smartcardNumber: smartcard, planId: selectedPlan.id });
    idempotency.current = newIdempotencyKey();
    setPinOpen(true);
  }

  async function confirmPin(pin: string): Promise<string | null> {
    if (!pending) return "Purchase details were lost. Please start again.";

    const response = await apiRequest<PurchaseResultDTO>("/services/cable", {
      body: { ...pending, pin },
      idempotencyKey: idempotency.current,
    });

    if (!response.success) {
      if (response.data?.wallet) applyWallet(response.data.wallet);
      if (response.data?.transaction) {
        setReceipt(response.data);
        setPinOpen(false);
        toast({ title: "Cable purchase failed", description: response.message, variant: "error" });
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
      title: response.status === "pending" ? "Cable payment is processing" : "Cable subscription renewed",
      description: response.message,
      variant: response.status === "pending" ? "info" : "success",
    });
    return null;
  }

  return (
    <div className="space-y-5">
      <ServiceHeader
        type="CABLE"
        eyebrow="Cable TV"
        title="Renew the decoder without the queue."
        description="Verify the smartcard, pick a plan and Paylane handles the rest. DStv, GOtv and StarTimes supported."
        highlights={["Smartcard verification", "No service fee", "Instant receipt"]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.95fr]">
        <section className="card space-y-6 p-5 sm:p-6">
          <FormSection step="1" title="Choose a provider" description="Each provider has its own plan catalogue.">
            <div className="grid grid-cols-3 gap-2">
              {CABLE_PROVIDERS.map((entry) => {
                const selected = entry.id === provider;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => chooseProvider(entry.id)}
                    className={cn(
                      "flex flex-col items-start rounded-2xl border-2 bg-white p-3 text-left transition",
                      selected
                        ? "border-ink shadow-[0_10px_24px_-18px_rgba(11,22,19,0.7)]"
                        : "border-transparent ring-1 ring-line hover:ring-ink/25",
                    )}
                    aria-pressed={selected}
                  >
                    <span
                      className="grid size-8 place-items-center rounded-xl text-white"
                      style={{ backgroundColor: entry.color }}
                    >
                      <Tv className="size-4" aria-hidden />
                    </span>
                    <span className="mt-2 text-xs font-bold text-ink">{entry.name}</span>
                    <span className="text-[0.58rem] text-muted">
                      {plans.filter((plan) => plan.provider === entry.id).length} plans
                    </span>
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection step="2" title="Smartcard or IUC number" description="10 to 12 digits. We verify the customer before any money moves.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <ScanLine className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  type="text"
                  inputMode="numeric"
                  className={cn("field pl-11", error && !smartcardValid && "field-error")}
                  placeholder="e.g. 7032150045"
                  value={smartcard}
                  onChange={(event) => changeSmartcard(event.target.value)}
                  aria-label="Smartcard or IUC number"
                />
              </div>
              <Button
                variant="primary"
                onClick={verify}
                loading={verifying}
                disabled={!smartcardValid || verifying}
                className="sm:w-auto"
              >
                {verifying ? "Verifying" : "Verify smartcard"}
              </Button>
            </div>

            {verified && verification ? (
              <div className="mt-3 flex items-start gap-3 rounded-2xl border border-success/20 bg-success-soft p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-success">
                  <BadgeCheck className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{verification.customer.customerName}</p>
                  <p className="mt-0.5 text-[0.65rem] text-ink/55">
                    {providerName} · {maskSmartcard(smartcard)} · verified
                  </p>
                </div>
                <span className="chip bg-white/80 px-2 py-0.5 text-[0.55rem] text-success">Valid</span>
              </div>
            ) : (
              <p className="mt-2 text-[0.65rem] text-muted">
                The plan list unlocks after a successful verification.
              </p>
            )}
            {verifying ? (
              <p className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-muted">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Checking the smartcard with the provider…
              </p>
            ) : null}
          </FormSection>

          <FormSection step="3" title={`${providerName} plans`} description={verified ? "Choose the package to renew." : "Verify the smartcard first to enable plans."}>
            {providerPlans.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-4 py-8 text-center">
                <Tv className="size-6 text-muted" aria-hidden />
                <p className="mt-2 text-sm font-semibold text-ink">No plans loaded</p>
                <p className="mt-1 text-xs text-muted">Refresh the page to try the catalog again.</p>
              </div>
            ) : (
              <div className={cn("grid gap-2 sm:grid-cols-2", !verified && "opacity-60")}>
                {providerPlans.map((plan) => {
                  const selected = plan.id === planId;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      disabled={!verified}
                      onClick={() => {
                        setPlanId(plan.id);
                        setError(null);
                      }}
                      className={cn(
                        "flex flex-col rounded-2xl border p-3.5 text-left transition",
                        selected
                          ? "border-ink bg-ink text-cream shadow-[0_16px_36px_-24px_rgba(11,22,19,0.9)]"
                          : "border-line bg-white hover:border-ink/25",
                        !verified && "cursor-not-allowed",
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn("text-sm font-bold", selected ? "text-white" : "text-ink")}>
                          {plan.name}
                        </span>
                        {selected ? <CheckCircle2 className="size-4 text-lime" aria-hidden /> : null}
                      </span>
                      <span className={cn("mt-1 text-[0.62rem]", selected ? "text-white/50" : "text-muted")}>
                        {plan.durationLabel} · {plan.code}
                      </span>
                      <span className={cn("mt-3 text-sm font-bold", selected ? "text-lime" : "text-ink")}>
                        {formatNaira(plan.amountKobo)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
              { label: "Provider", value: providerName },
              { label: "Plan", value: selectedPlan?.name ?? "Choose a plan", muted: !selectedPlan },
              { label: "Duration", value: selectedPlan?.durationLabel ?? "—" },
              { label: "Smartcard", value: smartcard ? maskSmartcard(smartcard) : "Not set", muted: !smartcard },
              { label: "Customer", value: verification?.customer.customerName ?? "Not verified", muted: !verified },
              { label: "Service fee", value: formatNaira(0) },
            ]}
            totalKobo={selectedPlan?.amountKobo ?? 0}
            footnote="Paylane re-checks the smartcard at purchase time. A failed check is never charged."
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
            {!verified ? (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[0.6rem] font-medium text-muted">
                <ShieldCheck className="size-3.5" aria-hidden />
                Verification required before payment
              </p>
            ) : null}
          </PriceBreakdown>

          <SandboxNotes
            items={[
              "Smartcard ending 000: verification fails and no money moves.",
              "Any other 10 to 12 digit smartcard verifies with a sample customer name.",
              "Purchases are charged from your Paylane wallet, not the decoder account.",
            ]}
          />

          <AdSlot format="rectangle" />
        </aside>
      </div>

      <PinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onConfirm={confirmPin}
        description="Authorise this cable subscription with your 4-digit PIN."
        amountLabel={formatNaira(selectedPlan?.amountKobo ?? 0)}
        confirmLabel="Pay subscription"
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
