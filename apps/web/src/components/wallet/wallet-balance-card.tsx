"use client";

import Link from "next/link";
import { ArrowUpRight, Fingerprint, Plus, ShieldCheck, Wallet } from "lucide-react";
import { formatDateTime, formatNaira } from "@paylane/shared";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";

export function WalletBalanceCard() {
  const { user, wallet, openFund } = useWallet();

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-ink/5 bg-white p-5 shadow-card sm:p-6">
      <span className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-lime/30 blur-3xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-16 left-1/3 size-40 rounded-full bg-violet/10 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-ink text-lime">
              <Wallet className="size-4.5" aria-hidden />
            </span>
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted">
                Paylane wallet
              </p>
              <p className="text-[0.62rem] text-muted">
                Updated {formatDateTime(wallet.updatedAt)}
              </p>
            </div>
          </div>
          <p className="mt-5 font-display text-4xl font-bold tracking-tight text-ink sm:text-[2.8rem]">
            {formatNaira(wallet.balanceKobo)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span
              className={cn(
                "chip text-[0.6rem]",
                wallet.status === "ACTIVE"
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger",
              )}
            >
              <span className={cn("status-dot", wallet.status === "ACTIVE" ? "bg-success" : "bg-danger")} />
              {wallet.status === "ACTIVE" ? "Wallet active" : "Wallet frozen"}
            </span>
            <span
              className={cn(
                "chip text-[0.6rem]",
                wallet.ledgerBalanced ? "bg-lime-soft text-[#3d5600]" : "bg-danger-soft text-danger",
              )}
            >
              <ShieldCheck className="size-3" aria-hidden />
              {wallet.ledgerBalanced ? "Ledger reconciled" : "Ledger mismatch"}
            </span>
            <span className="chip bg-cream text-[0.6rem] text-ink/55">
              <Fingerprint className="size-3" aria-hidden />
              {user.hasPin ? "PIN protected" : "No PIN set"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <Button variant="accent" onClick={() => openFund()} className="w-full sm:w-auto">
            <Plus className="size-4" aria-hidden />
            Fund wallet
          </Button>
          <Link
            href="/transactions"
            className="btn btn-outline btn-sm w-full text-ink/70 sm:w-auto"
          >
            View transactions
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
          <p className="max-w-[15rem] text-center text-[0.6rem] leading-relaxed text-muted sm:text-right">
            Wallet ID {wallet.id.slice(0, 8).toUpperCase()} · NGN
          </p>
        </div>
      </div>
    </section>
  );
}
