import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Clock3,
  Gauge,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  ADMIN_SECTIONS,
  formatDateTime,
  formatNaira,
  SERVICE_LABELS,
  type AdminOverviewDTO,
  type TransactionType,
} from "@paylane/shared";
import { AdSlot } from "@/components/ads/ad-slot";
import { requireAdminSection } from "@/lib/admin";
import { fetchData } from "@/lib/server-api";
import { cn } from "@/lib/utils";

const MIX_COLORS: Record<TransactionType, string> = {
  AIRTIME: "bg-lime-dark",
  DATA: "bg-sky",
  CABLE: "bg-violet",
  ELECTRICITY: "bg-amber",
  VERIFICATION: "bg-success",
  WALLET_FUNDING: "bg-coral",
};

export default async function AdminOverviewPage() {
  const user = await requireAdminSection("OVERVIEW");
  const payload = await fetchData<{ overview: AdminOverviewDTO }>("/admin/overview");
  const overview = payload?.overview;

  if (!overview) {
    return (
      <div className="card p-6 text-sm text-muted">
        The overview could not be loaded. Refresh the page or check the API service.
      </div>
    );
  }

  const stats = [
    {
      label: "Customers",
      value: overview.totalUsers.toLocaleString("en-NG"),
      detail: `${overview.activeWallets} active wallets`,
      icon: Users,
      tint: "bg-sky-soft text-sky",
    },
    {
      label: "Wallet liability",
      value: formatNaira(overview.walletLiabilityKobo),
      detail: "Customer funds held",
      icon: Wallet,
      tint: "bg-lime-soft text-[#4d6b00]",
    },
    {
      label: "Volume today",
      value: formatNaira(overview.volumeTodayKobo),
      detail: `${overview.transactionsToday} attempts`,
      icon: CircleDollarSign,
      tint: "bg-coral-soft text-coral",
    },
    {
      label: "Success rate",
      value: `${overview.successRate}%`,
      detail: `${overview.pendingTransactions} pending settlement`,
      icon: Gauge,
      tint: "bg-violet-soft text-violet",
    },
  ];

  const mixTotal = overview.serviceMix.reduce((sum, item) => sum + item.amountKobo, 0);
  const shortcuts = ADMIN_SECTIONS.filter(
    (section) =>
      section.key !== "OVERVIEW" &&
      section.key !== "TEAM" &&
      (user.isSuperAdmin || user.adminSections.includes(section.key)),
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card relative overflow-hidden p-4">
            <div className="flex items-start justify-between gap-2">
              <span className={cn("grid size-9 place-items-center rounded-xl", stat.tint)}>
                <stat.icon className="size-4" aria-hidden />
              </span>
              <span className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted">
                {stat.label}
              </span>
            </div>
            <p className="mt-4 font-display text-[1.45rem] font-bold leading-none tracking-tight text-ink">
              {stat.value}
            </p>
            <p className="mt-1.5 text-[0.65rem] text-muted">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink">Service mix</h3>
              <p className="mt-0.5 text-[0.65rem] text-muted">Successful volume, last 30 days</p>
            </div>
            <span className="chip bg-cream text-[0.58rem] text-ink/55">
              <BarChart3 className="size-3" aria-hidden />
              {formatNaira(mixTotal)}
            </span>
          </div>

          {overview.serviceMix.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted">No settled volume in this window yet.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {overview.serviceMix.map((item) => {
                const share = mixTotal === 0 ? 0 : Math.round((item.amountKobo / mixTotal) * 100);
                return (
                  <div key={item.type}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[0.68rem]">
                      <span className="font-semibold text-ink">
                        {SERVICE_LABELS[item.type] ?? item.type}
                      </span>
                      <span className="text-muted">
                        {formatNaira(item.amountKobo)} · {item.count} tx
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-cream">
                      <div
                        className={cn("h-full rounded-full", MIX_COLORS[item.type] ?? "bg-ink")}
                        style={{ width: `${Math.max(share, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-cream/70 px-3 py-2.5">
              <p className="text-[0.55rem] font-bold uppercase tracking-[0.12em] text-muted">
                Administrators
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink">{overview.adminCount}</p>
            </div>
            <div className="rounded-xl bg-cream/70 px-3 py-2.5">
              <p className="text-[0.55rem] font-bold uppercase tracking-[0.12em] text-muted">
                Pending settlements
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink">{overview.pendingTransactions}</p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line/80 px-4 py-3.5">
              <h3 className="font-display text-base font-bold text-ink">Recent activity</h3>
              <ShieldCheck className="size-4 text-success" aria-hidden />
            </div>
            {overview.recentAudit.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted">No audited actions yet.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {overview.recentAudit.map((event) => (
                  <li key={event.id} className="px-4 py-3">
                    <p className="text-[0.7rem] font-semibold leading-snug text-ink">
                      {event.description}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[0.58rem] text-muted">
                      <Clock3 className="size-3" aria-hidden />
                      {event.actorName || event.actorEmail} · {formatDateTime(event.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <AdSlot format="rectangle" />
        </aside>
      </div>

      {shortcuts.length > 0 ? (
        <section>
          <h3 className="mb-2.5 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted">
            Your sections
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {shortcuts.map((section) => {
              const href = {
                USERS: "/admin/users",
                WALLETS: "/admin/wallets",
                TRANSACTIONS: "/admin/transactions",
                VERIFICATIONS: "/admin/verifications",
                AUDIT: "/admin/audit",
                OVERVIEW: "/admin",
                TEAM: "/admin/team",
              }[section.key];
              return (
                <Link
                  key={section.key}
                  href={href}
                  className="group card flex items-start justify-between gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <div>
                    <p className="text-xs font-bold text-ink">{section.label}</p>
                    <p className="mt-1 text-[0.63rem] leading-relaxed text-muted">
                      {section.description}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-ink/30 transition group-hover:text-ink" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <AdSlot format="leaderboard" label="Sponsored" />
    </div>
  );
}
