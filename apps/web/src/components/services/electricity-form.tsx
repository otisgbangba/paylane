"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Gauge,
  Loader2,
  MapPin,
  Phone,
  ScanLine,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  FEES_KOBO,
  LIMITS,
  formatNaira,
  nairaToKobo,
  normalizeNigerianPhone,
  type ElectricityDiscoDTO,
  type MeterType,
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

const QUICK_AMOUNTS = [1_000, 2_000, 5_000, 10_000, 20_000];

function maskMeter(value: string): string {
  if (value.length < 6) return value;
  return `${value.slice(0, 3)}${"•".repeat(Math.max(3, value.length - 5))}${value.slice(-2)}`;
}

export function ElectricityForm({ discos }: { discos: ElectricityDiscoDTO[] }) {
  const { toast } = useToast();
  const { user, wallet, applyWallet, openFund } = useWallet();
  const [discoCode, setDiscoCode] = useState(discos[0]?.code ?? "");
  const [meterType, setMeterType] = useState<MeterType>("PREPAID");
  const [meterNumber, setMeterNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("2000");
  const [verification, setVerification] = useState<VerificationResultDTO | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    discoCode: string;
    meterNumber: string;
    meterType: MeterType;
    amountKobo: number;
    phone: string;
  } | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [receipt, setReceipt] = useState<PurchaseResultDTO | null>(null);
  const idempotency = useRef(newIdempotencyKey());

  const disco = discos.find((entry) => entry.code === discoCode) ?? null;
  const minKobo = disco?.minKobo ?? LIMITS.electricity.minKobo;
  const maxKobo = disco?.maxKobo ?? LIMITS.electricity.maxKobo;
  const amountKobo = nairaToKobo(amount || "0");
  const feeKobo = FEES_KOBO.ELECTRICITY;
  const totalKobo = amountKobo + feeKobo;
  const amountValid =
    amountKobo >= minKobo && amountKobo <= maxKobo && amountKobo % 100 === 0;
  const meterValid = /^\d{10,13}$/.test(meterNumber);
  const normalizedPhone = normalizeNigerianPhone(phone);
  const phoneValid = Boolean(normalizedPhone);
  const verified = Boolean(verification?.valid);
  const ready = verified && meterValid && amountValid && phoneValid;

  function resetVerification() {
    setVerification(null);
    setError(null);
  }

  async function verify() {
    if (!disco) {
      setError("Choose an electricity provider first.");
      return;
    }
    if (!meterValid) {
      setError("Meter numbers are 10 to 13 digits.");
      return;
    }
    setVerifying(true);
    setError(null);
    const response = await apiRequest<VerificationResultDTO>("/services/electricity/verify", {
      body: { discoCode: disco.code, meterNumber, meterType },
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
      title: "Meter verified",
      description: `${response.data.customer.customerName} · ${disco.shortName}`,
      variant: "success",
    });
  }

  function openPin() {
    if (!disco) {
      setError("Choose an electricity provider.");
      return;
    }
    if (!verified) {
      setError("Verify the meter before paying.");
      return;
    }
    if (!amountValid) {
      setError(
        `This disco accepts ${formatNaira(minKobo)} to ${formatNaira(maxKobo)} per payment.`,
      );
      return;
    }
    if (!phoneValid) {
      setError("Enter a valid phone number to receive the token.");
      return;
    }
    if (wallet.status === "FROZEN") {
      setError("Your wallet is frozen. Contact support before making a purchase.");
      return;
    }
    setError(null);
    setPending({
      discoCode: disco.code,
      meterNumber,
      meterType,
      amountKobo,
      phone: normalizedPhone as string,
    });
    idempotency.current = newIdempotencyKey();
    setPinOpen(true);
  }

  async function confirmPin(pin: string): Promise<string | null> {
    if (!pending) return "Purchase details were lost. Please start again.";

    const response = await apiRequest<PurchaseResultDTO>("/services/electricity", {
      body: { ...pending, pin },
      idempotencyKey: idempotency.current,
    });

    if (!response.success) {
      if (response.data?.wallet) applyWallet(response.data.wallet);
      if (response.data?.transaction) {
        setReceipt(response.data);
        setPinOpen(false);
        toast({
          title: "Electricity payment failed",
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
      title: response.status === "pending" ? "Token request is processing" : "Electricity payment complete",
      description: response.message,
      variant: response.status === "pending" ? "info" : "success",
    });
    return null;
  }

  return (
    <div className="space-y-5">
      <ServiceHeader
        type="ELECTRICITY"
        eyebrow="Electricity"
        title="A token, not a trip to the office."
        description="Verify the meter, choose the disco and pay for prepaid tokens or postpaid bills from one wallet."
        highlights={["8 discos", "₦100 convenience fee", "Token by SMS"]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.95fr]">
        <section className="card space-y-6 p-5 sm:p-6">
          <FormSection step="1" title="Electricity provider" description="Pick the disco that serves the meter.">
            {discos.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-4 py-8 text-center">
                <Zap className="size-6 text-muted" aria-hidden />
                <p className="mt-2 text-sm font-semibold text-ink">No discos loaded</p>
                <p className="mt-1 text-xs text-muted">Refresh the page to try the catalog again.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {discos.map((entry) => {
                  const selected = entry.code === discoCode;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setDiscoCode(entry.code);
                        resetVerification();
                      }}
                      className={cn(
                        "flex flex-col items-start rounded-2xl border-2 bg-white p-2.5 text-left transition",
                        selected
                          ? "border-ink shadow-[0_10px_24px_-18px_rgba(11,22,19,0.7)]"
                          : "border-transparent ring-1 ring-line hover:ring-ink/25",
                      )}
                      aria-pressed={selected}
                    >
                      <span className="flex w-full items-center justify-between gap-1">
                        <span className="text-xs font-bold text-ink">{entry.shortName}</span>
                        {selected ? <CheckCircle2 className="size-3.5 text-success" aria-hidden /> : null}
                      </span>
                      <span className="mt-1 line-clamp-2 text-[0.58rem] leading-snug text-muted">
                        {entry.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </FormSection>

          <FormSection step="2" title="Meter details" description="Verification confirms the customer name before payment.">
            <div className="grid grid-cols-2 gap-2">
              {(["PREPAID", "POSTPAID"] as MeterType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setMeterType(type);
                    resetVerification();
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-xs font-bold transition",
                    meterType === type
                      ? "border-ink bg-ink text-cream"
                      : "border-line bg-white text-ink/60 hover:border-ink/25",
                  )}
                  aria-pressed={meterType === type}
                >
                  {type === "PREPAID" ? "Prepaid meter" : "Postpaid meter"}
                </button>
              ))}
            </div>

            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <ScanLine className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  inputMode="numeric"
                  className={cn("field pl-11", error && !meterValid && "field-error")}
                  placeholder="Meter number (10 to 13 digits)"
                  value={meterNumber}
                  onChange={(event) => {
                    setMeterNumber(event.target.value.replace(/\D/g, "").slice(0, 13));
                    resetVerification();
                  }}
                  aria-label="Meter number"
                />
              </div>
              <Button
                variant="primary"
                onClick={verify}
                loading={verifying}
                disabled={!meterValid || verifying || !disco}
                className="sm:w-auto"
              >
                {verifying ? "Verifying" : "Verify meter"}
              </Button>
            </div>

            {verified && verification ? (
              <div className="mt-3 flex items-start gap-3 rounded-2xl border border-success/20 bg-success-soft p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-success">
                  <BadgeCheck className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{verification.customer.customerName}</p>
                  {verification.customer.customerAddress ? (
                    <p className="mt-0.5 flex items-start gap-1 text-[0.62rem] leading-relaxed text-ink/55">
                      <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
                      {verification.customer.customerAddress}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[0.6rem] text-ink/45">
                    {disco?.shortName} · {meterType.toLowerCase()} · {maskMeter(meterNumber)}
                  </p>
                </div>
                <span className="chip bg-white/80 px-2 py-0.5 text-[0.55rem] text-success">Valid</span>
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-muted">
                <ShieldCheck className="size-3.5" aria-hidden />
                The payer name is checked before any debit.
              </p>
            )}
            {verifying ? (
              <p className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-muted">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Checking the meter with the disco…
              </p>
            ) : null}
          </FormSection>

          <FormSection
            step="3"
            title="Amount and token delivery"
            description={
              disco
                ? `${disco.shortName} accepts ${formatNaira(minKobo)} to ${formatNaira(maxKobo)}.`
                : "Choose a provider to see its limits."
            }
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">₦</span>
              <input
                inputMode="decimal"
                className={cn("field pl-9 text-lg font-bold", error && !amountValid && "field-error")}
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^\d.]/g, ""));
                  setError(null);
                }}
                aria-label="Electricity amount in naira"
                placeholder="2000"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((value) => {
                const inRange = value * 100 >= minKobo && value * 100 <= maxKobo;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={!inRange}
                    onClick={() => {
                      setAmount(String(value));
                      setError(null);
                    }}
                    className={cn(
                      "chip border-line bg-white text-ink/60 hover:border-ink/25 disabled:cursor-not-allowed disabled:opacity-35",
                      amountKobo === value * 100 && "border-ink bg-ink text-cream hover:bg-forest",
                    )}
                  >
                    {formatNaira(value * 100)}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <label className="label" htmlFor="electricity-phone">
                Phone for the token SMS
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  id="electricity-phone"
                  type="tel"
                  inputMode="tel"
                  className={cn("field pl-11", error && !phoneValid && "field-error")}
                  placeholder="0803 123 4567"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setError(null);
                  }}
                  onBlur={() => {
                    if (normalizedPhone) setPhone(normalizedPhone);
                  }}
                />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-[0.62rem] text-muted">
                <Gauge className="size-3.5" aria-hidden />
                Prepaid tokens are sent here after the vendor confirms.
              </p>
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
              { label: "Provider", value: disco?.shortName ?? "Choose a disco", muted: !disco },
              { label: "Meter", value: meterNumber ? maskMeter(meterNumber) : "Not set", muted: !meterNumber },
              { label: "Meter type", value: meterType === "PREPAID" ? "Prepaid" : "Postpaid" },
              { label: "Customer", value: verification?.customer.customerName ?? "Not verified", muted: !verified },
              { label: "Electricity value", value: formatNaira(amountKobo) },
              { label: "Convenience fee", value: formatNaira(feeKobo) },
            ]}
            totalKobo={totalKobo}
            footnote="The convenience fee is charged on top of the electricity value credited to the meter."
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
              "Meter ending 000: verification fails and nothing is charged.",
              "Meter ending 00: the purchase is accepted and left pending for settlement.",
              "Any other meter completes successfully and issues a token.",
            ]}
          />

          <AdSlot format="rectangle" />
        </aside>
      </div>

      <PinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onConfirm={confirmPin}
        description="Authorise this electricity payment with your 4-digit PIN."
        amountLabel={formatNaira(totalKobo)}
        confirmLabel="Pay electricity"
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
