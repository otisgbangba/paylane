"use client";

import type { ReactNode } from "react";
import { AlertTriangle, ShieldCheck, Wallet } from "lucide-react";
import { formatNaira } from "@paylane/shared";
import { useWallet } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";

export interface PriceLine {
  label: string;
  value: string;
  muted?: boolean;
}

export function PriceBreakdown({
  lines,
  totalKobo,
  children,
  footnote,
  badge = "Live total",
}: {
  lines: PriceLine[];
  totalKobo: number;
  children?: ReactNode;
  footnote?: ReactNode;
  badge?: string;
}) {
  const { wallet, openFund } = useWallet();
  const shortfall = totalKobo - wallet.balanceKobo;

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/80 px-5 py-3.5">
        <h3 className="font-display text-sm font-bold text-ink">Price breakdown</h3>
        <span className="chip bg-lime-soft px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.08em] text-[#3d5600]">
          {badge}
        </span>
      </div>
      <div className="px-5 py-4">
        <dl className="space-y-2.5 text-sm">
          {lines.map((line) => (
            <div key={line.label} className="flex items-center justify-between gap-4">
              <dt className="text-muted">{line.label}</dt>
              <dd className={cn("font-semibold text-ink", line.muted && "text-ink/60")}>
                {line.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-end justify-between gap-4 border-t border-dashed border-line pt-3">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted">You pay</span>
          <span className="font-display text-2xl font-bold tracking-tight text-ink">
            {formatNaira(Math.max(0, totalKobo))}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-cream px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 text-muted">
            <Wallet className="size-3.5" aria-hidden />
            Wallet balance
          </span>
          <span
            className={cn(
              "font-bold",
              shortfall > 0 ? "text-danger" : "text-ink",
            )}
          >
            {formatNaira(wallet.balanceKobo)}
          </span>
        </div>

        {shortfall > 0 ? (
          <div className="mt-2.5 rounded-xl bg-danger-soft px-3 py-2.5">
            <p className="flex items-start gap-1.5 text-[0.68rem] font-medium leading-relaxed text-danger">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              You need {formatNaira(shortfall)} more for this purchase.
            </p>
            <button
              type="button"
              onClick={() => openFund()}
              className="btn btn-primary btn-sm mt-2 w-full"
            >
              Fund wallet
            </button>
          </div>
        ) : (
          <p className="mt-2.5 flex items-center gap-1.5 text-[0.62rem] text-muted">
            <ShieldCheck className="size-3.5 text-success" aria-hidden />
            Enough balance. The debit is held until the vendor responds.
          </p>
        )}

        {children ? <div className="mt-4">{children}</div> : null}
        {footnote ? <div className="mt-3 text-[0.62rem] leading-relaxed text-muted">{footnote}</div> : null}
      </div>
    </section>
  );
}
