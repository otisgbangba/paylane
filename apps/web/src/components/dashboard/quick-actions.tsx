"use client";

import Link from "next/link";
import { ArrowRight, Fingerprint, Plus, Smartphone, Tv, Wallet, Wifi, Zap } from "lucide-react";
import { useWallet } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";

const actions = [
  {
    href: "/airtime",
    label: "Airtime",
    copy: "All networks",
    icon: Smartphone,
    tint: "bg-lime text-ink",
    border: "hover:border-[#b2e240]",
  },
  {
    href: "/data",
    label: "Data",
    copy: "Daily to monthly",
    icon: Wifi,
    tint: "bg-sky-soft text-sky",
    border: "hover:border-sky",
  },
  {
    href: "/cable",
    label: "Cable TV",
    copy: "DStv, GOtv, StarTimes",
    icon: Tv,
    tint: "bg-violet-soft text-violet",
    border: "hover:border-violet",
  },
  {
    href: "/electricity",
    label: "Electricity",
    copy: "Tokens & bills",
    icon: Zap,
    tint: "bg-amber-soft text-[#9a6200]",
    border: "hover:border-amber",
  },
  {
    href: "/verify",
    label: "Identity",
    copy: "NIN, BVN & slips",
    icon: Fingerprint,
    tint: "bg-success-soft text-success",
    border: "hover:border-success",
  },
];

export function QuickActions() {
  const { openFund } = useWallet();

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-ink">Quick actions</h2>
          <p className="mt-0.5 text-xs text-muted">Pick a service and the price updates before you pay.</p>
        </div>
        <Link
          href="/transactions"
          className="hidden items-center gap-1 text-xs font-bold text-ink/60 transition hover:text-ink sm:inline-flex"
        >
          View history
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              "group flex flex-col rounded-2xl border border-line bg-white p-3.5 shadow-card transition hover:-translate-y-0.5 hover:shadow-float",
              action.border,
            )}
          >
            <span className={cn("grid size-9 place-items-center rounded-xl", action.tint)}>
              <action.icon className="size-4.5" aria-hidden />
            </span>
            <span className="mt-3 text-sm font-bold text-ink">{action.label}</span>
            <span className="mt-0.5 text-[0.64rem] font-medium text-muted">{action.copy}</span>
          </Link>
        ))}

        <button
          type="button"
          onClick={() => openFund()}
          className="group flex flex-col rounded-2xl border border-line bg-gradient-to-br from-coral-soft to-white p-3.5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-coral hover:shadow-float"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-coral-soft text-coral">
            <Wallet className="size-4.5" aria-hidden />
          </span>
          <span className="mt-3 flex items-center gap-1 text-sm font-bold text-ink">
            Fund
            <Plus className="size-3.5 text-coral" aria-hidden />
          </span>
          <span className="mt-0.5 text-[0.64rem] font-medium text-muted">Card or transfer</span>
        </button>
      </div>
    </section>
  );
}
