"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

/**
 * Four-digit transaction PIN prompt. `onConfirm` resolves to an error message
 * to keep the dialog open, or null to let the caller close it.
 */
export function PinDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm with your PIN",
  description = "Enter your 4-digit transaction PIN to authorise this payment.",
  amountLabel,
  confirmLabel = "Authorise payment",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<string | null>;
  title?: string;
  description?: string;
  amountLabel?: string;
  confirmLabel?: string;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setPin("");
    setError(null);
    setBusy(false);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  async function submit() {
    if (pin.length !== 4) {
      setError("Enter all four digits of your PIN.");
      return;
    }
    setBusy(true);
    setError(null);
    const message = await onConfirm(pin);
    setBusy(false);
    if (message) {
      setError(message);
      setPin("");
      inputRef.current?.focus();
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <Button variant="accent" className="w-full" loading={busy} onClick={submit}>
          <Lock className="size-4" aria-hidden />
          {confirmLabel}
        </Button>
      }
    >
      <div className="space-y-5">
        {amountLabel ? (
          <div className="rounded-2xl bg-cream px-4 py-3 text-center">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted">
              Amount to pay
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">{amountLabel}</p>
          </div>
        ) : null}

        <div>
          <label className="label" htmlFor="transaction-pin">
            Transaction PIN
          </label>
          <div className="relative">
            <KeyRound
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              ref={inputRef}
              id="transaction-pin"
              className={cn(
                "field pl-11 text-center text-2xl font-bold tracking-[0.65em]",
                error && "field-error",
              )}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && pin.length === 4) void submit();
              }}
              placeholder="••••"
            />
          </div>
          {error ? (
            <p className="mt-2 text-xs font-medium text-danger" role="alert">
              {error}
            </p>
          ) : (
            <p className="mt-2 text-[0.68rem] leading-relaxed text-muted">
              Five incorrect attempts lock transactions for ten minutes.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
