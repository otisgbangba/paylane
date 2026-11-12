"use client";

import { ChevronRight } from "lucide-react";
import {
  formatDateTime,
  formatNaira,
  type IdentityRequestDTO,
  type IdentityRequestStatus,
} from "@paylane/shared";
import { IdentityIcon } from "@/components/identity/identity-icon";
import { cn } from "@/lib/utils";

export const IDENTITY_STATUS_META: Record<
  IdentityRequestStatus,
  { label: string; className: string }
> = {
  SUCCESS: { label: "Completed", className: "bg-success-soft text-success" },
  PENDING: { label: "Queued", className: "bg-amber-soft text-[#9a6200]" },
  PROCESSING: { label: "Processing", className: "bg-amber-soft text-[#9a6200]" },
  FAILED: { label: "Failed", className: "bg-danger-soft text-danger" },
  REFUNDED: { label: "Refunded", className: "bg-violet-soft text-violet" },
};

export function IdentityRequestList({
  requests,
  onOpen,
  emptyLabel = "No identity requests yet.",
}: {
  requests: IdentityRequestDTO[];
  onOpen: (request: IdentityRequestDTO) => void;
  emptyLabel?: string;
}) {
  if (requests.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm font-semibold text-ink">{emptyLabel}</p>
        <p className="mt-1 text-xs text-muted">
          Completed checks, slips and record requests will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line/70">
      {requests.map((request) => {
        const status = IDENTITY_STATUS_META[request.status];
        return (
          <li key={request.id}>
            <button
              type="button"
              onClick={() => onOpen(request)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cream/70"
            >
              <IdentityIcon
                service={request.productId}
                className="size-9 shrink-0 rounded-xl"
                iconClassName="size-4"
              />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-bold text-ink">{request.productName}</span>
                  <span
                    className={cn(
                      "chip shrink-0 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.06em]",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[0.65rem] text-muted">
                  {request.subjectMasked} · {formatDateTime(request.createdAt)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xs font-bold text-ink">
                  {formatNaira(request.amountKobo)}
                </span>
                <span className="block text-[0.58rem] text-muted">{request.turnaroundLabel}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink/25" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
