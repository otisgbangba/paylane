"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Phone, RefreshCcw, Smartphone } from "lucide-react";
import {
  LIMITS,
  NETWORKS,
  detectNetwork,
  formatNaira,
  nairaToKobo,
  normalizeNigerianPhone,
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

const QUICK_AMOUNTS = [100, 200, 500, 1_000, 2_000, 5_000];

export function AirtimeForm() {
  const { toast } = useToast();
  const { user, wallet, applyWallet, openFund } = useWallet();
  const [network, setNetwork] = useState<NetworkId>("MTN");
  const [networkTouched, setNetworkTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("500");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ network: NetworkId; phone: string; amountKobo: number } | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [receipt, setReceipt] = useState<PurchaseResultDTO | null>(null);
  const idempotency = useRef(newIdempotencyKey());

  const detected = detectNetwork(phone);
  const normalized = normalizeNigerianPhone(phone);
  const amountKobo = nairaToKobo(amount || "0");
  const amountValid =
    amountKobo >= LIMITS.airtime.minKobo &&
    amountKobo <= LIMITS.airtime.maxKobo &&
    amountKobo % 100 === 0;
  const phoneValid = Boolean(normalized);
  const ready = phoneValid && amountValid;
  const networkName = NETWORKS.find((entry) => entry.id === network)?.name ?? network;

  function handlePhone(value: string) {
    setPhone(value);
    setError(null);
    const next = detectNetwork(value);
    if (next && !networkTouched) setNetwork(next);
  }

  function openPin() {
    if (!phoneValid) {
      setError("Enter a valid Nigerian mobile number before continuing.");
      return;
    }
    if (!amountValid) {
      setError("Enter a whole naira amount between ₦50 and ₦50,000.");
      return;
    }
    if (wallet.status === "FROZEN") {
      setError("Your wallet is frozen. Contact support before making a purchase.");
      return;
    }
    setError(null);
    setPending({ network, phone: normalized as string, amountKobo });
    idempotency.current = newIdempotencyKey();
    setPinOpen(true);
  }

  async function confirmPin(pin: string): Promise<string | null> {
    if (!pending) return "Purchase details were lost. Please start again.";

    const response = await apiRequest<PurchaseResultDTO>("/services/airtime", {
      body: { ...pending, pin },
      idempotencyKey: idempotency.current,
    });

    if (!response.success) {
      if (response.data?.wallet) applyWallet(response.data.wallet);
      if (response.data?.transaction) {
        setReceipt(response.data);
        setPinOpen(false);
        toast({
          title: "Airtime purchase failed",
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

    applyWallet(response.data.wallet);
    setReceipt(response.data);
    setPinOpen(false);
    setError(null);
    setPending(null);
    toast({
      title: response.status === "pending" ? "Airtime is processing" : "Airtime delivered",
      description: response.message,
      variant: response.status === "pending" ? "info" : "success",
    });
    return null;
  }

  return (
    <div className="space-y-5">
      <ServiceHeader
        type="AIRTIME"
        eyebrow="Airtime top-up"
        title="Send airtime in seconds."
        description="Pick the network, confirm the number and see the exact total before the PIN prompt."
        highlights={["All four networks", "No service fee", "Instant receipt"]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.95fr]">
        <section className="card space-y-6 p-5 sm:p-6">
          <FormSection step="1" title="Choose a network" description="We detect it from the phone number, or pick it yourself.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NETWORKS.map((entry) => {
                const selected = entry.id === network;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setNetwork(entry.id);
                      setNetworkTouched(true);
                    }}
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
                        {selected ? "Selected" : "Tap to choose"}
                      </span>
                    </span>
                    {selected ? <CheckCircle2 className="ml-auto size-3.5 shrink-0 text-success" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection step="2" title="Recipient number" description="Nigerian mobile numbers only. Spaces and +234 are accepted.">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                className={cn("field pl-11 pr-24", error && !phoneValid && "field-error")}
                type="tel"
                inputMode="tel"
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
              <p className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-muted">
                <Smartphone className="size-3.5 text-ink/40" aria-hidden />
                Detected <span className="font-bold text-ink/70">{detected === "ETISALAT" ? "9mobile" : detected}</span>
                {networkTouched && detected !== network ? (
                  <span className="ml-1 rounded-full bg-amber-soft px-2 py-0.5 font-semibold text-[#8a5a00]">
                    Prefix looks like {detected === "ETISALAT" ? "9mobile" : detected}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="mt-2 text-[0.65rem] text-muted">
                Example: 0803 123 4567, 8031234567 or +2348031234567.
              </p>
            )}
          </FormSection>

          <FormSection step="3" title="Amount" description="Minimum ₦50, maximum ₦50,000 per top-up.">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">₦</span>
              <input
                className={cn("field pl-9 text-lg font-bold", error && !amountValid && "field-error")}
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^\d.]/g, ""));
                  setError(null);
                }}
                aria-label="Airtime amount in naira"
                placeholder="500"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAmount(String(value));
                    setError(null);
                  }}
                  className={cn(
                    "chip border-line bg-white text-ink/60 hover:border-ink/25",
                    amountKobo === value * 100 && "border-ink bg-ink text-cream hover:bg-forest",
                  )}
                >
                  {formatNaira(value * 100)}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[0.62rem] text-muted">
              <span>
                {networkName} · {phoneValid ? "recipient ready" : "add a number"}
              </span>
              <button type="button" onClick={() => setAmount("500")} className="flex items-center gap-1 font-semibold hover:text-ink">
                <RefreshCcw className="size-3" aria-hidden />
                Reset
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
              { label: "Airtime value", value: formatNaira(amountKobo) },
              { label: "Service fee", value: formatNaira(0) },
              { label: "Network", value: networkName },
              { label: "Recipient", value: normalized ?? "Not set", muted: !normalized },
            ]}
            totalKobo={amountKobo}
            footnote="Airtime is delivered to the number above. Double-check it before authorising."
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
              "Use any other number for a successful delivery.",
            ]}
          />

          <AdSlot format="rectangle" />
        </aside>
      </div>

      <PinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onConfirm={confirmPin}
        description="Authorise this airtime purchase with your 4-digit PIN."
        amountLabel={formatNaira(amountKobo)}
        confirmLabel="Buy airtime"
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
