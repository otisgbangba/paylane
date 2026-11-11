"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Fingerprint, RefreshCcw, ShieldCheck, Wallet } from "lucide-react";
import { formatDateTime, formatNaira } from "@paylane/shared";
import { useWallet } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";

export function WalletHealth() {
  const { user, wallet, openFund } = useWallet();

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-ink">Wallet health</h2>
          <p className="mt-0.5 text-[0.65rem] text-muted">Live status from the ledger.</p>
        </div>
        <span className="grid size-9 place-items-center rounded-xl bg-lime-soft text-[#4d6b00]">
          <Wallet className="size-4.5" aria-hidden />
        </span>
      </div>

      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Balance</dt>
          <dd className="font-bold text-ink">{formatNaira(wallet.balanceKobo)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Wallet status</dt>
          <dd
            className={cn(
              "chip px-2 py-0.5 text-[0.65rem]",
              wallet.status === "ACTIVE" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            {wallet.status === "ACTIVE" ? "Active" : "Frozen"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Ledger check</dt>
          <dd
            className={cn(
              "flex items-center gap-1.5 text-xs font-bold",
              wallet.ledgerBalanced ? "text-success" : "text-danger",
            )}
          >
            {wallet.ledgerBalanced ? (
              <ShieldCheck className="size-3.5" aria-hidden />
            ) : (
              <AlertTriangle className="size-3.5" aria-hidden />
            )}
            {wallet.ledgerBalanced ? "Reconciled" : "Mismatch"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Transaction PIN</dt>
          <dd className={cn("flex items-center gap-1.5 text-xs font-bold", user.hasPin ? "text-ink" : "text-danger")}>
            <Fingerprint className="size-3.5" aria-hidden />
            {user.hasPin ? "Set" : "Not set"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Updated</dt>
          <dd className="text-xs font-semibold text-ink/75">{formatDateTime(wallet.updatedAt)}</dd>
        </div>
      </dl>

      {!user.hasPin ? (
        <Link
          href="/settings"
          className="mt-4 flex items-center justify-between rounded-xl bg-danger-soft px-3 py-2 text-xs font-semibold text-danger"
        >
          Add a transaction PIN to start buying
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => openFund()} className="btn btn-primary btn-sm flex-1">
          Top up
        </button>
        <Link href="/wallet" className="btn btn-outline btn-sm flex-1">
          <RefreshCcw className="size-3.5" aria-hidden />
          Ledger
        </Link>
      </div>
    </section>
  );
}
