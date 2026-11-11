"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Fingerprint,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  formatNaira,
  type TransactionSummaryDTO,
} from "@paylane/shared";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";

export function WalletHero({ summary }: { summary: TransactionSummaryDTO | null }) {
  const { user, wallet, openFund } = useWallet();
  const frozen = wallet.status === "FROZEN";

  return (
    <section className="wallet-mesh relative overflow-hidden rounded-[1.75rem] p-5 text-white shadow-float sm:p-7">
      <span className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-lime/20 blur-3xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-violet/25 blur-3xl" aria-hidden />
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-white/10 text-lime">
              <Sparkles className="size-3" aria-hidden />
              Your lane is open
            </span>
            <span
              className={cn(
                "chip",
                frozen ? "bg-danger/20 text-[#ffb4ac]" : "bg-white/10 text-white/65",
              )}
            >
              <span className={cn("status-dot", frozen ? "bg-[#ffb4ac]" : "bg-lime")} />
              {frozen ? "Wallet frozen" : "Wallet active"}
            </span>
          </div>

          <p className="mt-6 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/40">
            Available balance, {user.firstName}
          </p>
          <p className="mt-1 font-display text-[2.6rem] font-bold leading-none tracking-[-0.03em] sm:text-5xl">
            {formatNaira(wallet.balanceKobo)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.62rem]">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold",
                wallet.ledgerBalanced ? "bg-success/15 text-[#8bf3c9]" : "bg-danger/20 text-[#ffb4ac]",
              )}
            >
              <ShieldCheck className="size-3" aria-hidden />
              {wallet.ledgerBalanced ? "Ledger balanced" : "Ledger needs attention"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-semibold text-white/60">
              <Fingerprint className="size-3" aria-hidden />
              {user.hasPin ? "PIN protected" : "PIN not set"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-semibold text-white/60">
              NGN wallet
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button variant="accent" size="sm" onClick={() => openFund()} className="sm:px-5">
              <Plus className="size-4" aria-hidden />
              Fund wallet
            </Button>
            <Link
              href="/wallet"
              className="btn btn-sm border border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Wallet className="size-4" aria-hidden />
              Wallet &amp; ledger
            </Link>
            <Link
              href="/transactions"
              className="btn btn-sm border border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white"
            >
              <ReceiptText className="size-4" aria-hidden />
              Receipts
            </Link>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-2 lg:w-64 lg:grid-cols-1">
          {[
            {
              icon: TrendingUp,
              label: "Spent · 30 days",
              value: summary ? formatNaira(summary.totalSpentKobo) : "—",
              tone: "text-coral",
            },
            {
              icon: CheckCircle2,
              label: "Success rate",
              value: summary ? `${summary.successRate}%` : "—",
              tone: "text-[#8bf3c9]",
            },
            {
              icon: Clock3,
              label: "Pending",
              value: summary ? String(summary.pendingCount) : "—",
              tone: "text-amber",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 backdrop-blur-sm"
            >
              <stat.icon className={cn("size-3.5", stat.tone)} aria-hidden />
              <p className="mt-1.5 text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-white/35">
                {stat.label}
              </p>
              <p className="mt-0.5 truncate font-display text-base font-bold text-white sm:text-lg">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-6 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5">
        <p className="text-[0.65rem] leading-relaxed text-white/45">
          Tip: failed vendor requests are refunded to this balance automatically.
        </p>
        <ArrowUpRight className="size-4 shrink-0 text-lime/70" aria-hidden />
      </div>
    </section>
  );
}
