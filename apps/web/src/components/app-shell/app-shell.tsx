"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  Code2,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  Smartphone,
  Tv,
  Users,
  Wallet,
  Wifi,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  ADMIN_SECTIONS,
  formatNaira,
  type AdminSection,
} from "@paylane/shared";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useWallet } from "@/components/wallet/wallet-provider";
import { apiRequest } from "@/lib/client-api";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  activeTint: string;
  section?: AdminSection;
  superOnly?: boolean;
}

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, activeTint: "bg-sky-soft text-sky" },
  { href: "/airtime", label: "Airtime top-up", icon: Smartphone, activeTint: "bg-lime text-ink" },
  { href: "/data", label: "Data bundles", icon: Wifi, activeTint: "bg-sky-soft text-sky" },
  { href: "/cable", label: "Cable TV", icon: Tv, activeTint: "bg-violet-soft text-violet" },
  { href: "/electricity", label: "Electricity", icon: Zap, activeTint: "bg-amber-soft text-[#9a6200]" },
  { href: "/wallet", label: "Wallet", icon: Wallet, activeTint: "bg-coral-soft text-coral" },
  { href: "/transactions", label: "Transactions", icon: ReceiptText, activeTint: "bg-white/15 text-white" },
];

const secondaryNav: NavItem[] = [
  { href: "/api-docs", label: "API documentation", icon: Code2, activeTint: "bg-violet-soft text-violet" },
  { href: "/settings", label: "Settings", icon: Settings, activeTint: "bg-cream text-ink" },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: Gauge, activeTint: "bg-lime text-ink", section: "OVERVIEW" },
  { href: "/admin/users", label: "Customers", icon: Users, activeTint: "bg-sky-soft text-sky", section: "USERS" },
  { href: "/admin/wallets", label: "Wallets", icon: Wallet, activeTint: "bg-coral-soft text-coral", section: "WALLETS" },
  { href: "/admin/transactions", label: "Transactions", icon: BarChart3, activeTint: "bg-amber-soft text-[#9a6200]", section: "TRANSACTIONS" },
  { href: "/admin/audit", label: "Audit trail", icon: ShieldCheck, activeTint: "bg-white/15 text-white", section: "AUDIT" },
  { href: "/admin/team", label: "Team & access", icon: Users, activeTint: "bg-violet-soft text-violet", superOnly: true },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/airtime": "Airtime top-up",
  "/data": "Data bundles",
  "/cable": "Cable TV",
  "/electricity": "Electricity",
  "/wallet": "Wallet",
  "/transactions": "Transactions",
  "/api-docs": "API documentation",
  "/settings": "Settings",
  "/admin": "Admin overview",
  "/admin/users": "Customers",
  "/admin/wallets": "Wallets & funding",
  "/admin/transactions": "Platform transactions",
  "/admin/audit": "Audit trail",
  "/admin/team": "Team & access",
};

const bottomNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/airtime", label: "Airtime", icon: Smartphone },
  { href: "/data", label: "Data", icon: Wifi },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/transactions", label: "History", icon: ReceiptText },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, wallet, openFund } = useWallet();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const sections = user.adminSections;
  const canSee = (item: NavItem) =>
    item.superOnly ? user.isSuperAdmin : !item.section || user.isSuperAdmin || sections.includes(item.section);
  const visibleAdmin = adminNav.filter(canSee);
  const title = pageTitles[pathname] ?? "Paylane";
  const adminSectionCount = user.isSuperAdmin
    ? ADMIN_SECTIONS.length
    : sections.length;

  async function signOut() {
    setSigningOut(true);
    await apiRequest("/auth/logout", { method: "POST" });
    toast({ title: "Signed out", description: "See you on the next top-up.", variant: "info" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-cream">
      <Sidebar
        pathname={pathname}
        canSee={canSee}
        visibleAdmin={visibleAdmin}
        adminSectionCount={adminSectionCount}
        isSuperAdmin={user.isSuperAdmin}
        walletKobo={wallet.balanceKobo}
        ledgerBalanced={wallet.ledgerBalanced}
        hasPin={user.hasPin}
        onFund={() => openFund()}
        className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] lg:flex"
      />

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="animate-pop absolute inset-y-0 left-0 flex w-[18rem] max-w-[88vw] flex-col">
            <Sidebar
              pathname={pathname}
              canSee={canSee}
              visibleAdmin={visibleAdmin}
              adminSectionCount={adminSectionCount}
              isSuperAdmin={user.isSuperAdmin}
              walletKobo={wallet.balanceKobo}
              ledgerBalanced={wallet.ledgerBalanced}
              hasPin={user.hasPin}
              onFund={() => {
                setDrawerOpen(false);
                openFund();
              }}
              onClose={() => setDrawerOpen(false)}
              className="h-full w-full"
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-dvh flex-col lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-cream/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-white text-ink/70 transition hover:text-ink lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-4.5" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="hidden text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted sm:block">
                {new Date().toLocaleDateString("en-NG", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  timeZone: "Africa/Lagos",
                })}{" "}
                · Lagos
              </p>
              <h1 className="truncate font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
                {title}
              </h1>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 sm:flex">
              <span className="grid size-6 place-items-center rounded-full bg-lime-soft text-[#4d6b00]">
                <Wallet className="size-3.5" aria-hidden />
              </span>
              <span className="text-sm font-bold text-ink">{formatNaira(wallet.balanceKobo)}</span>
            </div>

            <Button variant="accent" size="sm" className="hidden sm:inline-flex" onClick={() => openFund()}>
              <Plus className="size-3.5" aria-hidden />
              Fund
            </Button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="flex items-center gap-1.5 rounded-full border border-line bg-white p-1 pr-2 transition hover:border-ink/20"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
              >
                <span className="grid size-8 place-items-center rounded-full bg-ink text-[0.68rem] font-bold text-lime">
                  {initials(user.firstName, user.lastName)}
                </span>
                <ChevronDown className={cn("size-3.5 text-muted transition", menuOpen && "rotate-180")} aria-hidden />
              </button>

              {menuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-30 cursor-default"
                    aria-label="Close account menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="animate-pop absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-white shadow-float"
                  >
                    <div className="border-b border-line px-4 py-3">
                      <p className="truncate text-sm font-bold text-ink">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                      <span className="chip mt-2 bg-cream px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.1em] text-ink/55">
                        {user.isSuperAdmin
                          ? "Super administrator"
                          : user.isAdmin
                            ? `Administrator · ${adminSectionCount} section${adminSectionCount === 1 ? "" : "s"}`
                            : "Customer"}
                      </span>
                    </div>
                    <div className="p-1.5">
                      <Link
                        href="/settings"
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-cream hover:text-ink"
                      >
                        <Settings className="size-4" aria-hidden />
                        Profile &amp; security
                      </Link>
                      {user.isAdmin ? (
                        <Link
                          href="/admin"
                          role="menuitem"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-cream hover:text-ink"
                        >
                          <ShieldCheck className="size-4" aria-hidden />
                          Administration
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={signOut}
                        disabled={signingOut}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger-soft disabled:opacity-50"
                      >
                        <LogOut className="size-4" aria-hidden />
                        {signingOut ? "Signing out…" : "Sign out"}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-12">
          {children}
        </main>

        <footer className="hidden border-t border-line/60 px-8 py-4 text-[0.62rem] text-muted lg:block">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
            <span>Paylane · virtual top-ups and utility payments</span>
            <span className="flex items-center gap-1.5">
              <span className={cn("status-dot", wallet.ledgerBalanced ? "bg-success" : "bg-danger")} />
              {wallet.ledgerBalanced ? "Ledger balanced" : "Ledger mismatch flagged"}
            </span>
          </div>
        </footer>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 px-2 py-1.5">
          {bottomNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[0.6rem] font-semibold transition",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-xl transition",
                    active ? "bg-lime text-ink" : "text-muted",
                  )}
                >
                  <item.icon className="size-4.5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Sidebar({
  pathname,
  canSee,
  visibleAdmin,
  adminSectionCount,
  isSuperAdmin,
  walletKobo,
  ledgerBalanced,
  hasPin,
  onFund,
  onClose,
  className,
}: {
  pathname: string;
  canSee: (item: NavItem) => boolean;
  visibleAdmin: NavItem[];
  adminSectionCount: number;
  isSuperAdmin: boolean;
  walletKobo: number;
  ledgerBalanced: boolean;
  hasPin: boolean;
  onFund: () => void;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <aside className={cn("flex-col overflow-y-auto bg-forest text-white", className)}>
      <div className="relative overflow-hidden px-5 pb-4 pt-5">
        <span className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-lime/10 blur-2xl" aria-hidden />
        <span className="pointer-events-none absolute -left-10 top-24 size-40 rounded-full bg-violet/15 blur-2xl" aria-hidden />
        <div className="relative flex items-center justify-between">
          <Link href="/dashboard" aria-label="Paylane dashboard">
            <Brand dark />
          </Link>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-white/40">
              Available balance
            </p>
            <span className="grid size-6 place-items-center rounded-full bg-lime/15 text-lime">
              <Wallet className="size-3.5" aria-hidden />
            </span>
          </div>
          <p className="mt-1.5 font-display text-2xl font-bold tracking-tight">
            {formatNaira(walletKobo)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.55rem] font-semibold",
                ledgerBalanced ? "bg-success/15 text-[#7ef0c2]" : "bg-danger/20 text-[#ffb4ac]",
              )}
            >
              <span className={cn("status-dot", ledgerBalanced ? "bg-[#7ef0c2]" : "bg-[#ffb4ac]")} />
              {ledgerBalanced ? "Ledger balanced" : "Check ledger"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.55rem] font-semibold",
                hasPin ? "bg-white/10 text-white/60" : "bg-amber/20 text-amber",
              )}
            >
              {hasPin ? "PIN set" : "PIN missing"}
            </span>
          </div>
          <Button variant="accent" size="sm" className="mt-3 w-full" onClick={onFund}>
            <Plus className="size-3.5" aria-hidden />
            Fund wallet
          </Button>
        </div>
      </div>

      <nav className="flex-1 px-3 pb-4" aria-label="Sections">
        <p className="px-3 pb-2 pt-3 text-[0.55rem] font-bold uppercase tracking-[0.18em] text-white/30">
          Money
        </p>
        <div className="space-y-0.5">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>

        <p className="px-3 pb-2 pt-5 text-[0.55rem] font-bold uppercase tracking-[0.18em] text-white/30">
          Workspace
        </p>
        <div className="space-y-0.5">
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>

        {visibleAdmin.length > 0 ? (
          <>
            <div className="flex items-center justify-between px-3 pb-2 pt-5">
              <p className="text-[0.55rem] font-bold uppercase tracking-[0.18em] text-white/30">
                Administration
              </p>
              <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.08em] text-lime">
                {isSuperAdmin ? "Owner" : `${adminSectionCount} sections`}
              </span>
            </div>
            <div className="space-y-0.5">
              {visibleAdmin.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
              ))}
            </div>
          </>
        ) : null}
      </nav>

      <div className="border-t border-white/10 px-4 py-3.5">
        <p className="flex items-center gap-1.5 text-[0.55rem] font-medium text-white/30">
          <ShieldCheck className="size-3 text-lime/60" aria-hidden />
          Section-scoped administrators
        </p>
        <p className="mt-1 text-[0.55rem] leading-relaxed text-white/25">
          Access is enforced by the API, not just this menu.
        </p>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[0.82rem] font-semibold transition",
        active
          ? "bg-white/10 text-white ring-1 ring-inset ring-white/10"
          : "text-white/50 hover:bg-white/[0.05] hover:text-white/90",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-lg transition",
          active ? item.activeTint : "bg-white/[0.06] text-white/40 group-hover:text-white/70",
        )}
      >
        <item.icon className="size-3.5" strokeWidth={2.2} aria-hidden />
      </span>
      <span className="truncate">{item.label}</span>
      {active ? <span className="ml-auto status-dot bg-lime" /> : null}
    </Link>
  );
}
