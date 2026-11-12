"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Fingerprint,
  Gauge,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean }[] = [
  { href: "/admin", label: "Overview", icon: Gauge, match: (path) => path === "/admin" },
  { href: "/admin/users", label: "Customers", icon: Users, match: (path) => path.startsWith("/admin/users") },
  { href: "/admin/wallets", label: "Wallets", icon: Wallet, match: (path) => path.startsWith("/admin/wallets") },
  { href: "/admin/transactions", label: "Transactions", icon: BarChart3, match: (path) => path.startsWith("/admin/transactions") },
  { href: "/admin/verifications", label: "Identity", icon: Fingerprint, match: (path) => path.startsWith("/admin/verifications") },
  { href: "/admin/audit", label: "Audit", icon: ShieldCheck, match: (path) => path.startsWith("/admin/audit") },
  { href: "/admin/team", label: "Team & access", icon: Users, match: (path) => path.startsWith("/admin/team") },
];

export function AdminTabs({
  allowed,
  isSuperAdmin,
}: {
  allowed: string[];
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const keyFor: Record<string, string> = {
    "/admin": "OVERVIEW",
    "/admin/users": "USERS",
    "/admin/wallets": "WALLETS",
    "/admin/transactions": "TRANSACTIONS",
    "/admin/verifications": "VERIFICATIONS",
    "/admin/audit": "AUDIT",
    "/admin/team": "TEAM",
  };

  const visible = TABS.filter((tab) => {
    const key = keyFor[tab.href];
    if (!key) return false;
    if (key === "TEAM") return isSuperAdmin;
    return isSuperAdmin || allowed.includes(key);
  });

  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {visible.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[0.72rem] font-bold transition",
              active
                ? "bg-ink text-lime shadow-sm"
                : "bg-white text-ink/55 ring-1 ring-line hover:bg-cream hover:text-ink",
            )}
          >
            <tab.icon className="size-3.5" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
