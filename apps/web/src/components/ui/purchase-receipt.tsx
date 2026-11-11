"use client";

import {
  CheckCircle2,
  Clock3,
  Copy,
  RotateCcw,
  XCircle,
} from "lucide-react";
import {
  SERVICE_LABELS,
  TRANSACTION_STATUS_LABELS,
  formatDateTime,
  formatNaira,
  type TransactionDTO,
  type WalletDTO,
} from "@paylane/shared";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badges";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const statusTheme = {
  SUCCESS: {
    icon: CheckCircle2,
    wrap: "bg-success-soft text-success",
    title: "Payment successful",
    note: "The vendor accepted this transaction.",
  },
  PENDING: {
    icon: Clock3,
    wrap: "bg-amber-soft text-[#9a6200]",
    title: "Payment processing",
    note: "The vendor accepted the request and will confirm shortly.",
  },
  FAILED: {
    icon: XCircle,
    wrap: "bg-danger-soft text-danger",
    title: "Payment failed",
    note: "No value was delivered for this request.",
  },
  REFUNDED: {
    icon: RotateCcw,
    wrap: "bg-violet-soft text-violet",
    title: "Payment refunded",
    note: "The amount was returned to your Paylane wallet.",
  },
} as const;

export function PurchaseReceipt({
  open,
  onClose,
  transaction,
  wallet,
}: {
  open: boolean;
  onClose: () => void;
  transaction: TransactionDTO;
  wallet: WalletDTO | null;
}) {
  const { toast } = useToast();
  const theme = statusTheme[transaction.status];

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(transaction.reference);
      toast({ title: "Reference copied", variant: "success" });
    } catch {
      toast({ title: "Copy failed", description: "Select the reference and copy it manually.", variant: "error" });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transaction receipt"
      description="Keep this reference for support or reconciliation."
      size="sm"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={copyReference}>
            <Copy className="size-4" aria-hidden />
            Copy reference
          </Button>
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className={cn("flex items-center gap-3 rounded-2xl p-4", theme.wrap)}>
          <span className="grid size-11 place-items-center rounded-full bg-white/70">
            <theme.icon className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight text-ink">
              {theme.title}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{theme.note}</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted">
            Total charged
          </p>
          <p className="mt-1 font-display text-4xl font-bold tracking-tight text-ink">
            {formatNaira(transaction.totalKobo)}
          </p>
          <div className="mt-2 flex justify-center">
            <StatusBadge status={transaction.status} />
          </div>
        </div>

        <dl className="divide-y divide-line/80 rounded-2xl border border-line">
          <Row label="Service" value={SERVICE_LABELS[transaction.type]} />
          <Row label="Recipient" value={transaction.recipient} />
          <Row label="Amount" value={formatNaira(transaction.amountKobo)} />
          <Row label="Fee" value={formatNaira(transaction.feeKobo)} />
          <Row label="Reference" value={transaction.reference} mono />
          {transaction.providerRef ? (
            <Row label="Provider ref" value={transaction.providerRef} mono />
          ) : null}
          <Row label="Date" value={formatDateTime(transaction.createdAt)} />
          {wallet ? <Row label="Wallet balance" value={formatNaira(wallet.balanceKobo)} strong /> : null}
        </dl>

        {transaction.failureReason ? (
          <div className="rounded-2xl bg-danger-soft px-4 py-3 text-xs leading-relaxed text-danger">
            <p className="font-bold">Why this failed</p>
            <p className="mt-0.5">{transaction.failureReason}</p>
          </div>
        ) : null}

        {transaction.status === "REFUNDED" ? (
          <p className="text-center text-[0.68rem] text-muted">
            Refunded transactions show the original status as{" "}
            {TRANSACTION_STATUS_LABELS.REFUNDED.toLowerCase()} in your history.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function Row({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-all text-right text-ink",
          mono && "font-mono text-xs",
          strong ? "font-bold" : "font-semibold",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
