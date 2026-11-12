"use client";

import {
  CheckCircle2,
  Clock3,
  Download,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  formatDateTime,
  formatNaira,
  type IdentityRequestDTO,
} from "@paylane/shared";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const THEME: Record<
  IdentityRequestDTO["status"],
  { icon: typeof CheckCircle2; wrap: string; title: string; note: string }
> = {
  SUCCESS: {
    icon: CheckCircle2,
    wrap: "bg-success-soft text-success",
    title: "Request completed",
    note: "The identity provider returned a result for this request.",
  },
  PENDING: {
    icon: Clock3,
    wrap: "bg-amber-soft text-[#9a6200]",
    title: "Request received",
    note: "The request is queued and will be processed shortly.",
  },
  PROCESSING: {
    icon: Clock3,
    wrap: "bg-amber-soft text-[#9a6200]",
    title: "In progress",
    note: "The identity provider is still working on this request.",
  },
  FAILED: {
    icon: XCircle,
    wrap: "bg-danger-soft text-danger",
    title: "Request failed",
    note: "No result was returned. Any debit was refunded to your wallet.",
  },
  REFUNDED: {
    icon: RotateCcw,
    wrap: "bg-violet-soft text-violet",
    title: "Request refunded",
    note: "The amount was returned to your Paylane wallet.",
  },
};

export function downloadIdentityDocument(doc: {
  fileName: string;
  mimeType: string;
  contentBase64: string;
}) {
  const binary = atob(doc.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: doc.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function IdentityResultModal({
  open,
  onClose,
  request,
  walletBalanceKobo,
}: {
  open: boolean;
  onClose: () => void;
  request: IdentityRequestDTO | null;
  walletBalanceKobo?: number;
}) {
  if (!request) return null;
  const theme = THEME[request.status];
  const document = request.result?.document ?? null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Identity request"
      description="Keep the reference for support and reconciliation."
      size="md"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          {document ? (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => downloadIdentityDocument(document)}
            >
              <Download className="size-4" aria-hidden />
              Download document
            </Button>
          ) : null}
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className={cn("flex items-center gap-3 rounded-2xl p-4", theme.wrap)}>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/70">
            <theme.icon className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight text-ink">{theme.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{theme.note}</p>
          </div>
        </div>

        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted">Service</p>
          <p className="mt-1 font-display text-lg font-bold text-ink">{request.productName}</p>
          <p className="mt-0.5 text-xs text-muted">
            {request.subjectMasked} · {request.turnaroundLabel}
          </p>
        </div>

        {request.result && request.result.fields.length > 0 ? (
          <dl className="divide-y divide-line/80 rounded-2xl border border-line">
            {request.result.fields.map((field, index) => (
              <div
                key={`${field.label}-${index}`}
                className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <dt className="shrink-0 text-muted">{field.label}</dt>
                <dd className="min-w-0 break-words text-right font-semibold text-ink">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {request.result?.note ? (
          <p className="rounded-2xl bg-cream px-4 py-3 text-[0.68rem] leading-relaxed text-ink/60">
            {request.result.note}
          </p>
        ) : null}

        {request.failureReason ? (
          <div className="flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-xs leading-relaxed text-danger">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{request.failureReason}</p>
          </div>
        ) : null}

        <dl className="divide-y divide-line/80 rounded-2xl border border-line">
          <Row label="Reference" value={request.reference} mono />
          <Row label="Amount" value={formatNaira(request.amountKobo)} />
          <Row label="Submitted" value={formatDateTime(request.createdAt)} />
          {request.completedAt ? (
            <Row label="Completed" value={formatDateTime(request.completedAt)} />
          ) : null}
          {walletBalanceKobo !== undefined ? (
            <Row label="Wallet balance" value={formatNaira(walletBalanceKobo)} strong />
          ) : null}
        </dl>

        {document ? (
          <p className="text-[0.65rem] leading-relaxed text-muted">
            The document is available from this dialog for the retention window configured by the
            operator. Download it now if you need a copy.
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
