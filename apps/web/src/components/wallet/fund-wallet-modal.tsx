"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import {
  FUNDING_METHOD_LABELS,
  formatNaira,
  koboToNairaInput,
  nairaToKobo,
  type FundingMethod,
  type TransactionDTO,
  type WalletDTO,
} from "@paylane/shared";
import { apiRequest, newIdempotencyKey } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useWallet } from "./wallet-provider";
import { cn } from "@/lib/utils";

const QUICK_AMOUNTS = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000];

export function FundWalletModal() {
  const { fundOpen, fundReason, closeFund, applyWallet, wallet } = useWallet();
  const { toast } = useToast();
  const [amount, setAmount] = useState("5000");
  const [method, setMethod] = useState<FundingMethod>("CARD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    transaction: TransactionDTO;
    wallet: WalletDTO;
  } | null>(null);
  const idempotency = useRef(newIdempotencyKey());

  useEffect(() => {
    if (!fundOpen) return;
    setError(null);
    setReceipt(null);
    setAmount("5000");
    setMethod("CARD");
    idempotency.current = newIdempotencyKey();
  }, [fundOpen]);

  const amountKobo = nairaToKobo(amount);
  const valid = amountKobo >= 50_000 && amountKobo <= 50_000_000;

  async function submit() {
    if (!valid) {
      setError("Enter an amount between ₦500 and ₦500,000.");
      return;
    }
    setBusy(true);
    setError(null);
    const response = await apiRequest<{ transaction: TransactionDTO; wallet: WalletDTO }>(
      "/wallet/fund",
      {
        body: { amountKobo, method },
        idempotencyKey: idempotency.current,
      },
    );
    setBusy(false);

    if (!response.success) {
      setError(response.message);
      return;
    }

    applyWallet(response.data.wallet);
    setReceipt(response.data);
    idempotency.current = newIdempotencyKey();
    toast({
      title: "Wallet funded",
      description: `${formatNaira(amountKobo)} added via ${FUNDING_METHOD_LABELS[method].toLowerCase()}.`,
      variant: "success",
    });
  }

  return (
    <Modal
      open={fundOpen}
      onClose={closeFund}
      title={receipt ? "Funding successful" : "Top up your wallet"}
      description={
        receipt
          ? "Your balance is ready for airtime, data and bill payments."
          : (fundReason ?? "Add money with a card or bank transfer. A sandbox checkout is used in this demo.")
      }
      size="sm"
      footer={
        receipt ? (
          <Button variant="primary" className="w-full" onClick={closeFund}>
            Done
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">New balance</span>
              <span className="font-bold text-ink">
                {formatNaira(wallet.balanceKobo + (valid ? amountKobo : 0))}
              </span>
            </div>
            <Button
              variant="accent"
              className="w-full"
              loading={busy}
              onClick={submit}
              disabled={!valid}
            >
              Fund {valid ? formatNaira(amountKobo) : "wallet"}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-[0.65rem] font-medium text-muted">
              <ShieldCheck className="size-3.5 text-success" aria-hidden />
              Sandbox checkout. No real card is charged.
            </p>
          </div>
        )
      }
    >
      {receipt ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-success-soft p-4">
            <span className="grid size-10 place-items-center rounded-full bg-white text-success">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{formatNaira(receipt.transaction.amountKobo)} added</p>
              <p className="text-xs text-muted">
                {FUNDING_METHOD_LABELS[method]} · {receipt.transaction.reference}
              </p>
            </div>
          </div>
          <dl className="space-y-2.5 rounded-2xl border border-line p-4 text-sm">
            <Row label="Amount" value={formatNaira(receipt.transaction.amountKobo)} />
            <Row label="Fee" value={formatNaira(0)} />
            <Row label="Wallet balance" value={formatNaira(receipt.wallet.balanceKobo)} strong />
          </dl>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="fund-amount">
              Amount (₦)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">
                ₦
              </span>
              <input
                id="fund-amount"
                className={cn("field pl-9 text-lg font-bold", error && !valid && "field-error")}
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^\d.]/g, ""));
                  setError(null);
                }}
                placeholder="5000"
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAmount(koboToNairaInput(value * 100));
                    setError(null);
                  }}
                  className={cn(
                    "chip justify-center border-line bg-white text-ink/70 hover:border-ink/25",
                    amountKobo === value * 100 && "border-ink bg-ink text-cream hover:bg-forest",
                  )}
                >
                  {formatNaira(value * 100, { compact: true })}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Funding method</span>
            <div className="grid grid-cols-2 gap-2">
              {(["CARD", "BANK_TRANSFER"] as FundingMethod[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMethod(option)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition",
                    method === option
                      ? "border-ink bg-ink text-cream"
                      : "border-line bg-white text-ink/70 hover:border-ink/25",
                  )}
                >
                  <Wallet className="size-4" aria-hidden />
                  {FUNDING_METHOD_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-cream p-4 text-xs leading-relaxed text-muted">
            <p className="font-semibold text-ink">Preview checkout</p>
            <p className="mt-1">
              This demo approves funding immediately and writes a matching credit to your ledger.
              Connect a card processor or transfer webhook before going live.
            </p>
          </div>

          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("text-ink", strong ? "font-bold" : "font-semibold")}>{value}</dd>
    </div>
  );
}
