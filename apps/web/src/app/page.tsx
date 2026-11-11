import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Code2,
  CreditCard,
  Fingerprint,
  Gauge,
  LayoutDashboard,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Tv,
  Users,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import { NETWORKS, formatNaira } from "@paylane/shared";
import { Brand, ServiceIcon } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { AdSlot } from "@/components/ads/ad-slot";
import { getSessionUser } from "@/lib/server-api";
import { cn } from "@/lib/utils";

const services = [
  {
    type: "AIRTIME",
    title: "Airtime top-up",
    copy: "MTN, Airtel, Glo and 9mobile in a few taps, with the right price before you confirm.",
    tint: "from-lime-soft to-white",
    ring: "hover:border-[#b2e240]",
  },
  {
    type: "DATA",
    title: "Data bundles",
    copy: "Sized for daily, weekly and monthly browsing. No expired bundles or surprise charges.",
    tint: "from-sky-soft to-white",
    ring: "hover:border-sky",
  },
  {
    type: "CABLE",
    title: "Cable TV",
    copy: "Verify the smartcard first, then renew DStv, GOtv or StarTimes in one clean step.",
    tint: "from-violet-soft to-white",
    ring: "hover:border-violet",
  },
  {
    type: "ELECTRICITY",
    title: "Electricity",
    copy: "Prepaid tokens and postpaid bills from every major disco, with the meter checked.",
    tint: "from-amber-soft to-white",
    ring: "hover:border-amber",
  },
  {
    type: "WALLET_FUNDING",
    title: "Wallet funding",
    copy: "Card or transfer top-ups that land instantly and reconcile against a running ledger.",
    tint: "from-coral-soft to-white",
    ring: "hover:border-coral",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "A ledger you can audit",
    copy: "Every credit, debit and refund is written to an append-only ledger and reconciled on each wallet read.",
    tint: "bg-success-soft text-success",
  },
  {
    icon: RefreshCcw,
    title: "Refunds that actually land",
    copy: "When a vendor rejects a purchase, Paylane reverses the debit in the same flow, not days later.",
    tint: "bg-violet-soft text-violet",
  },
  {
    icon: Fingerprint,
    title: "PIN-protected payments",
    copy: "A four-digit transaction PIN with lockout after five attempts keeps a stolen session from spending.",
    tint: "bg-coral-soft text-coral",
  },
  {
    icon: Users,
    title: "Scoped administrators",
    copy: "The owner creates as many admins as needed and ticks exactly which sections each one can open.",
    tint: "bg-sky-soft text-sky",
  },
  {
    icon: Gauge,
    title: "Vendor failover",
    copy: "Provider calls retry, log a redacted payload and fall over to a backup adapter when transport breaks.",
    tint: "bg-lime-soft text-[#4d6b00]",
  },
  {
    icon: Code2,
    title: "Developer-ready API",
    copy: "Typed requests, idempotency keys and one response envelope for success, pending and failed states.",
    tint: "bg-amber-soft text-[#9a6200]",
  },
];

const navLinks = [
  { href: "#services", label: "Services" },
  { href: "#platform", label: "Platform" },
  { href: "#access", label: "Admin access" },
  { href: "#how", label: "How it works" },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="page-backdrop min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-ink/5 bg-cream/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Paylane home">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-ink/65 lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-ink">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="btn btn-ghost btn-sm hidden sm:inline-flex"
            >
              Sign in
            </Link>
            <ButtonLink href="/register" variant="primary" size="sm">
              Get started
              <ArrowRight className="size-3.5" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative">
          <span className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-lime/30 blur-3xl" aria-hidden />
          <span className="pointer-events-none absolute -right-20 top-40 size-80 rounded-full bg-violet/15 blur-3xl" aria-hidden />
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-10 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:pb-16">
            <div className="animate-fade-up">
              <span className="chip border-ink/10 bg-white/80 text-ink/70 shadow-sm">
                <Sparkles className="size-3.5 text-violet" aria-hidden />
                Built in Lagos for every Nigerian wallet
              </span>
              <h1 className="mt-5 font-display text-[2.6rem] font-bold leading-[1.02] tracking-[-0.045em] text-ink sm:text-6xl lg:text-[4.15rem]">
                Every top-up.
                <br />
                Every bill.
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">One bright lane.</span>
                  <span
                    className="absolute inset-x-0 bottom-1 z-0 h-4 -rotate-1 rounded-full bg-lime sm:bottom-2 sm:h-5"
                    aria-hidden
                  />
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/65 sm:text-lg">
                Paylane turns airtime, data, cable TV and electricity into one clean checkout.
                Fund a protected wallet, see the price before you pay, and keep every receipt in
                one place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/register" variant="accent" className="group px-6">
                  Create your free wallet
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                </ButtonLink>
                <ButtonLink href="/login" variant="outline" className="px-6">
                  <LayoutDashboard className="size-4" aria-hidden />
                  Enter the demo
                </ButtonLink>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-ink/60">
                {[
                  "Instant price breakdown",
                  "PIN-protected checkout",
                  "Automatic refunds",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Wallet preview */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -left-5 top-8 z-10 hidden rounded-2xl border border-white/70 bg-white/90 p-3 shadow-float backdrop-blur sm:block">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
                  Delivery median
                </p>
                <p className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-ink">
                  18s
                  <span className="chip bg-success-soft px-2 py-0.5 text-[0.6rem] text-success">
                    <span className="status-dot bg-success" /> live
                  </span>
                </p>
              </div>
              <div className="absolute -right-3 bottom-14 z-10 hidden rounded-2xl border border-white/70 bg-white/90 p-3 shadow-float backdrop-blur sm:block">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
                  Success rate
                </p>
                <p className="mt-1 font-display text-xl font-bold text-ink">99.2%</p>
              </div>

              <div className="wallet-mesh relative overflow-hidden rounded-[2rem] border border-white/10 p-5 text-white shadow-[0_45px_100px_-40px_rgba(7,24,18,0.85)] sm:p-7">
                <div className="bg-dots absolute inset-0 opacity-10" aria-hidden />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-xl bg-lime text-ink">
                        <Zap className="size-4 fill-ink" />
                      </span>
                      <span className="leading-none">
                        <span className="block font-display text-base font-bold">Paylane</span>
                        <span className="mt-1 block text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-lime/70">
                          Wallet preview
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[0.6rem] font-semibold text-lime">
                      <span className="status-dot bg-lime" />
                      Ledger balanced
                    </span>
                  </div>

                  <p className="mt-7 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Available balance
                  </p>
                  <p className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-[2.7rem]">
                    {formatNaira(9_830_000)}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      { icon: Smartphone, label: "Airtime", tint: "text-lime" },
                      { icon: Wifi, label: "Data", tint: "text-sky" },
                      { icon: Tv, label: "Cable", tint: "text-violet" },
                    ].map((action) => (
                      <span
                        key={action.label}
                        className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.07] px-2 py-3 ring-1 ring-inset ring-white/10"
                      >
                        <action.icon className={cn("size-4", action.tint)} aria-hidden />
                        <span className="text-[0.62rem] font-semibold text-white/75">{action.label}</span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 space-y-1.5">
                    {[
                      { icon: Smartphone, label: "MTN airtime", meta: "0803 •••• 4567", amount: "-₦1,000", tint: "bg-lime-soft text-[#4d6b00]" },
                      { icon: Tv, label: "DStv Compact", meta: "Smartcard verified", amount: "-₦19,000", tint: "bg-violet-soft text-violet" },
                      { icon: Zap, label: "EKEDC prepaid", meta: "Token delivered", amount: "-₦7,500", tint: "bg-amber-soft text-[#9a6200]" },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-inset ring-white/5"
                      >
                        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", row.tint)}>
                          <row.icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-white">{row.label}</span>
                          <span className="block text-[0.6rem] text-white/40">{row.meta}</span>
                        </span>
                        <span className="text-xs font-bold text-white/80">{row.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {NETWORKS.map((network) => (
                  <span
                    key={network.id}
                    className="flex items-center gap-1.5 rounded-full border border-ink/5 bg-white/80 px-2.5 py-1 text-[0.62rem] font-bold text-ink/65"
                  >
                    <span
                      className="grid size-4 place-items-center rounded-full text-[0.5rem] font-black"
                      style={{
                        backgroundColor: network.color,
                        color: network.id === "MTN" || network.id === "GLO" ? "#0b1613" : "#fff",
                      }}
                    >
                      {network.short}
                    </span>
                    {network.id === "ETISALAT" ? "9mobile" : network.id}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
            <AdSlot format="leaderboard" />
          </div>
        </section>

        {/* Stats strip */}
        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-3 rounded-3xl border border-ink/5 bg-white p-4 shadow-card sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            {[
              { value: "₦12.4m", label: "Monthly volume processed", tone: "text-ink" },
              { value: "99.2%", label: "Successful deliveries", tone: "text-success" },
              { value: "18s", label: "Median delivery time", tone: "text-violet" },
              { value: "4.9/5", label: "Customer satisfaction", tone: "text-coral" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-cream/70 px-4 py-3 sm:px-5">
                <p className={cn("font-display text-2xl font-bold tracking-tight sm:text-3xl", stat.tone)}>
                  {stat.value}
                </p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section id="services" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="chip border-ink/10 bg-white text-ink/60">Five services, one checkout</span>
              <h2 className="mt-4 max-w-lg font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Everything a household tops up, without five different apps.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-ink/60">
              Switch networks or providers inside the flow. Paylane validates the number, shows
              the exact total and keeps the receipt.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {services.map((service, index) => (
              <Link
                key={service.type}
                href="/register"
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-gradient-to-b p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-float",
                  service.tint,
                  service.ring,
                  index === 0 && "sm:col-span-2 lg:col-span-1",
                )}
              >
                <div className="flex items-start justify-between">
                  <ServiceIcon type={service.type} className="bg-white/80 backdrop-blur" />
                  <ArrowUpRight className="size-4 text-ink/25 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink/60" aria-hidden />
                </div>
                <h3 className="mt-8 font-display text-lg font-bold text-ink">{service.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink/55">{service.copy}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Platform features */}
        <section id="platform" className="scroll-mt-24 bg-white/60 py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="chip border-ink/10 bg-cream text-ink/60">The plumbing behind the colour</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Pretty on the surface. Serious underneath.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink/60 sm:text-base">
                A wallet is only useful if the money adds up. Paylane is built around locks,
                ledgers and idempotency so every naira has a trail.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-float">
                  <span className={cn("grid size-11 place-items-center rounded-2xl", feature.tint)}>
                    <feature.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{feature.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Admin access */}
        <section id="access" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
          <div className="wallet-mesh relative overflow-hidden rounded-[2rem] px-5 py-8 text-white sm:px-10 sm:py-12 lg:px-14">
            <span className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-violet/30 blur-3xl" aria-hidden />
            <span className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-lime/15 blur-3xl" aria-hidden />
            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="chip bg-white/10 text-lime">Access, not guesswork</span>
                <h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  One owner. As many administrators as the business needs.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
                  The super administrator creates a teammate, then ticks the sections they should
                  reach: overview, customers, wallets, transactions or audit. Everything else stays
                  closed, and the backend enforces it.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-white/75">
                  {[
                    "Section-level grants, not one blunt admin role",
                    "Super-admin-only team management",
                    "Every access change written to the audit trail",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lime text-ink">
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/login" variant="accent" className="mt-8">
                  Sign in as a scoped admin
                  <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="font-display text-base font-bold">Team &amp; access</p>
                    <p className="mt-0.5 text-[0.62rem] text-white/45">Super administrator view</p>
                  </div>
                  <span className="rounded-full bg-lime px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-ink">
                    Owner only
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { name: "Precious O.", role: "Operations admin", sections: ["Overview", "Customers", "Wallets", "Transactions"], active: true },
                    { name: "Ibrahim M.", role: "Compliance admin", sections: ["Audit trail"], active: true },
                    { name: "Ngozi E.", role: "Support admin", sections: ["Customers"], active: false },
                  ].map((member) => (
                    <div key={member.name} className="rounded-2xl bg-white/[0.05] p-3.5 ring-1 ring-inset ring-white/5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 place-items-center rounded-full bg-lime/15 text-[0.6rem] font-bold text-lime">
                            {member.name.split(" ").map((part) => part[0]).join("")}
                          </span>
                          <div>
                            <p className="text-xs font-bold">{member.name}</p>
                            <p className="text-[0.58rem] text-white/40">{member.role}</p>
                          </div>
                        </div>
                        <span className={cn("status-dot", member.active ? "bg-lime" : "bg-white/25")} />
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {member.sections.map((section) => (
                          <span key={section} className="rounded-full bg-white/10 px-2 py-0.5 text-[0.55rem] font-semibold text-white/65">
                            {section}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-white/15 px-3.5 py-3 text-[0.62rem] text-white/45">
                  <span>Grant sections per teammate</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-lime">Configurable</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ad + how it works */}
        <section id="how" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <span className="chip border-ink/10 bg-white text-ink/60">Live in three moves</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                From first sign-up to first receipt.
              </h2>
              <ol className="mt-8 space-y-5">
                {[
                  {
                    icon: CreditCard,
                    title: "Open a wallet",
                    copy: "Register with your name, phone and email. Choose a transaction PIN so purchases stay yours.",
                  },
                  {
                    icon: Wallet,
                    title: "Fund it once",
                    copy: "Top up by card or bank transfer. The credit is posted against a ledger entry you can inspect.",
                  },
                  {
                    icon: ReceiptText,
                    title: "Pay and keep the proof",
                    copy: "Buy airtime, data, cable or electricity. Every result gets a reference and a receipt.",
                  },
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-lime">
                      <step.icon className="size-5" aria-hidden />
                      <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-coral text-[0.55rem] font-black text-white ring-2 ring-cream">
                        {index + 1}
                      </span>
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-ink">{step.title}</h3>
                      <p className="mt-1 max-w-md text-sm leading-relaxed text-ink/60">{step.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-4">
              <AdSlot format="rectangle" />
              <div className="card flex items-center gap-4 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-soft text-violet">
                  <BadgeCheck className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Demo credentials included</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    Sign in as the customer or the super administrator to try every flow with seeded
                    money.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-ink/5 bg-lime px-6 py-10 sm:px-10 sm:py-14">
            <span className="bg-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden />
            <span className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/30 blur-2xl" aria-hidden />
            <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <span className="chip bg-white/60 text-ink/70">
                  <Star className="size-3.5 fill-ink/70" aria-hidden />
                  Ready when you are
                </span>
                <h2 className="mt-4 max-w-xl font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  Give every top-up a brighter lane.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/60">
                  Create an account in under a minute, or step into the seeded demo and watch the
                  ledger move.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <ButtonLink href="/register" variant="primary" className="px-6">
                  Create free account
                  <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
                <ButtonLink href="/login" variant="outline" className="px-6">
                  Sign in
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <AdSlot format="leaderboard" label="Sponsored" />
        </div>
      </main>

      <footer className="border-t border-ink/5 bg-white/70">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-ink/55">
              A virtual top-up and utility payments platform for Nigerian customers, with a wallet
              ledger designed for operators.
            </p>
            <p className="mt-4 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">
              Lagos · Nigeria
            </p>
          </div>
          {[
            {
              title: "Services",
              links: [
                { label: "Airtime", href: "/register" },
                { label: "Data bundles", href: "/register" },
                { label: "Cable TV", href: "/register" },
                { label: "Electricity", href: "/register" },
              ],
            },
            {
              title: "Platform",
              links: [
                { label: "Dashboard", href: "/login" },
                { label: "Transaction history", href: "/login" },
                { label: "API documentation", href: "/login" },
                { label: "Admin access", href: "/login" },
              ],
            },
            {
              title: "Account",
              links: [
                { label: "Sign in", href: "/login" },
                { label: "Create account", href: "/register" },
                { label: "Wallet settings", href: "/login" },
                { label: "Support", href: "/login" },
              ],
            },
          ].map((column) => (
            <div key={column.title}>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                {column.title}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-xs font-medium text-ink/60 transition hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-ink/5">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-[0.65rem] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} Paylane. Demo platform, not a licensed financial institution.</p>
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-success" aria-hidden />
              Money movements simulated for demonstration
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
