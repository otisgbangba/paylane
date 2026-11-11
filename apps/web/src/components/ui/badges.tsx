import type { TransactionStatus, TransactionType } from "@paylane/shared";
import { cn } from "@/lib/utils";

const statusStyles: Record<TransactionStatus, string> = {
  SUCCESS: "bg-success-soft text-success",
  PENDING: "bg-amber-soft text-[#8a5a00]",
  FAILED: "bg-danger-soft text-danger",
  REFUNDED: "bg-violet-soft text-violet",
};

const statusDot: Record<TransactionStatus, string> = {
  SUCCESS: "bg-success",
  PENDING: "bg-amber",
  FAILED: "bg-danger",
  REFUNDED: "bg-violet",
};

const statusLabel: Record<TransactionStatus, string> = {
  SUCCESS: "Successful",
  PENDING: "Pending",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span className={cn("chip", statusStyles[status])}>
      <span className={cn("status-dot", statusDot[status])} />
      {statusLabel[status]}
    </span>
  );
}

export function TypeChip({ type }: { type: TransactionType }) {
  const labels: Record<TransactionType, string> = {
    AIRTIME: "Airtime",
    DATA: "Data",
    CABLE: "Cable TV",
    ELECTRICITY: "Electricity",
    WALLET_FUNDING: "Funding",
  };
  return (
    <span className="chip border-line bg-cream/70 text-ink/70">{labels[type]}</span>
  );
}
