import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Database,
  EyeOff,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  Lock,
  RefreshCcw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import {
  IDENTITY_CATEGORIES,
  IDENTITY_SERVICES,
  NETWORKS,
  formatNaira,
  type IdentityProductDTO,
} from "@paylane/shared";
import { Brand, ServiceIcon } from "@/components/brand";
import { IdentityIcon } from "@/components/identity/identity-icon";
import { ButtonLink } from "@/components/ui/button";
import { AdSlot } from "@/components/ads/ad-slot";
import { fetchData, getSessionUser } from "@/lib/server-api";
import { cn } from "@/lib/utils";

const moneyServices = [
  {
    type: "AIRTIME",
    title: "Airtime",
    copy: "MTN, Airtel, Glo and 9mobile with the exact price before you confirm.",
  },
  {
    type: "DATA",
    title: "Data",
    copy: "Daily, weekly and monthly bundles for every network.",
  },
  {
    type: "CABLE",
    title: "Cable TV",
    copy: "DStv, GOtv and StarTimes renewals with the smartcard checked.",
  },
  {
    type: "ELECTRICITY",
    title: "Electricity",
    copy: "Prepaid tokens and postpaid bills from every major disco.",
  },
  {
    type: "WALLET_FUNDING",
    title: "Wallet funding",
    copy: "Card or transfer top-ups posted straight to the ledger.",
  },
];

const features = [
  {
    icon: EyeOff,
    title: "Consent before every check",
    copy: "Each identity request records who asked, what it was for and when consent was given. No consent, no lookup.",
    tint: "bg-success-soft text-success",
  },
  {
    icon: Database,
    title: "No raw identifiers at rest",
    copy: "NIN and BVN values are digested with an HMAC and masked before they touch a table, then purged after settlement.",
    tint: "bg-violet-soft text-violet",
  },
  {
    icon: RefreshCcw,
    title: "Refunds that actually land",
    copy: "When a vendor rejects or times out, the wallet debit is reversed in the same flow and written to the ledger.",
    tint: "bg-coral-soft text-coral",
  },
  {
    icon: Fingerprint,
    title: "PIN-protected spending",
    copy: "A four-digit transaction PIN with a five-attempt lockout keeps a borrowed session from spending.",
    tint: "bg-amber-soft text-[#9a6200]",
  },
  {
    icon: Users,
    title: "Scoped administrators",
    copy: "The owner grants identity, wallet or audit access per teammate. The backend enforces every section.",
    tint: "bg-sky-soft text-sky",
  },
  {
    icon: Code2,
    title: "Developer-ready API",
    copy: "Bearer API keys, typed requests, idempotency keys and one response envelope for every state.",
    tint: "bg-lime-soft text-[#4d6b00]",
  },
];

const steps = [
  {
    icon: Wallet,
    title: "Fund a wallet",
    copy: "Create an account, add money by card or transfer and watch the credit post against a ledger entry.",
  },
  {
    icon: ScanFace,
    title: "Pick a check",
    copy: "Choose NIN, BVN, a slip or a record service, enter the identifier and confirm your consent.",
  },
  {
    icon: BadgeCheck,
    title: "Get the result",
    copy: "The result lands in the dashboard with a reference, a receipt and a downloadable document where one exists.",
  },
];

const navLinks = [
  { href: "#identity", label: "Identity services" },
  { href: "#how", label: "How it works" },
  { href: "#money", label: "Everyday top-ups" },
  { href: "#api", label: "Developers" },
  { href: "#access", label: "Admin access" },
];

const fallbackProducts: IdentityProductDTO[] = IDENTITY_SERVICES.map((service, index) => ({
  id: service.id,
  code: service.code,
  name: service.name,
  tagline: service.tagline,
  description: service.description,
  category: service.category,
  priceKobo: service.priceKobo,
  turnaroundLabel: service.turnaroundLabel,
  resultKind: service.resultKind,
  popular: Boolean(service.popular),
  isActive: true,
  sortOrder: (index + 1) * 10,
  fields: service.fields,
}));

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const catalog = await fetchData<{ products: IdentityProductDTO[]; mode: "SANDBOX" | "HTTP" }>(
    "/identity/products",
  );
  const products = catalog?.products?.length ? catalog.products : fallbackProducts;
  const mode = catalog?.mode ?? "SANDBOX";
  const live = mode === "HTTP";

  const grouped = IDENTITY_CATEGORIES.map((category) => ({
    ...category,
    products: products.filter((product) => product.category === category.id),
  })).filter((group) => group.products.length > 0);

  return (
    <div className="page-backdrop min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-ink/5 bg-cream/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Paylane home">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-ink/65 lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-ink">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              Agent login
            </Link>
            <ButtonLink href="/register" variant="primary" size="sm">
              Create account
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip border-ink/10 bg-white/80 text-ink/70 shadow-sm">
                  <Fingerprint className="size-3.5 text-success" aria-hidden />
                  NIN · BVN · GOVERNMENT ID
                </span>
                <span
                  className={cn(
                    "chip border px-2.5 py-1 text-[0.6rem]",
                    live
                      ? "border-success/20 bg-success-soft text-success"
                      : "border-amber/20 bg-amber-soft text-[#9a6200]",
                  )}
                >
                  <span className={cn("status-dot", live ? "bg-success" : "bg-amber")} />
                  {live ? "Live vendor connected" : "Sandbox results"}
                </span>
              </div>
              <h1 className="mt-5 font-display text-[2.6rem] font-bold leading-[1.02] tracking-[-0.045em] text-ink sm:text-6xl lg:text-[4.15rem]">
                Identity,
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10">verified instantly.</span>
                  <span
                    className="absolute inset-x-0 bottom-1 z-0 h-4 -rotate-1 rounded-full bg-lime sm:bottom-2 sm:h-5"
                    aria-hidden
                  />
                </span>
                <br />
                Not in a queue.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/65 sm:text-lg">
                NIN and BVN checks, NIN slip retrieval, IPE clearance and record updates, backed by
                a wallet-ready dashboard for agents, businesses and developers. One account, one
                ledger, every result receipted.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/register" variant="accent" className="group px-6">
                  Create your free account
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                </ButtonLink>
                <ButtonLink href="/login" variant="outline" className="px-6">
                  <LayoutDashboard className="size-4" aria-hidden />
                  Agent login
                </ButtonLink>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-ink/60">
                {[
                  `${products.length} identity services`,
                  "Consent logged per request",
                  "Wallet-funded, no contracts",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Verification console preview */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -left-5 top-8 z-10 hidden rounded-2xl border border-white/70 bg-white/90 p-3 shadow-float backdrop-blur sm:block">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
                  Median verify
                </p>
                <p className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-ink">
                  9s
                  <span className="chip bg-success-soft px-2 py-0.5 text-[0.6rem] text-success">
                    <span className="status-dot bg-success" /> live
                  </span>
                </p>
              </div>
              <div className="absolute -right-3 bottom-20 z-10 hidden rounded-2xl border border-white/70 bg-white/90 p-3 shadow-float backdrop-blur sm:block">
                <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
                  Slip delivery
                </p>
                <p className="mt-1 font-display text-xl font-bold text-ink">PDF ready</p>
              </div>

              <div className="wallet-mesh relative overflow-hidden rounded-[2rem] border border-white/10 p-5 text-white shadow-[0_45px_100px_-40px_rgba(7,24,18,0.85)] sm:p-7">
                <div className="bg-dots absolute inset-0 opacity-10" aria-hidden />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-xl bg-lime text-ink">
                        <Fingerprint className="size-4" />
                      </span>
                      <span className="leading-none">
                        <span className="block font-display text-base font-bold">Paylane identity</span>
                        <span className="mt-1 block text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-lime/70">
                          Verification console
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[0.6rem] font-semibold text-lime">
                      <span className="status-dot bg-lime" />
                      Wallet ready
                    </span>
                  </div>

                  <div className="mt-6 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-inset ring-white/10">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-white/80">
                        <ScanFace className="size-4 text-lime" aria-hidden />
                        NIN verification
                      </span>
                      <span className="chip bg-success-soft px-2 py-0.5 text-[0.55rem] text-success">
                        Completed
                      </span>
                    </div>
                    <dl className="mt-3 space-y-2 text-[0.68rem]">
                      {[
                        { label: "Name", value: "ADAEZE C. OKAFOR" },
                        { label: "Date of birth", value: "14 March 1994" },
                        { label: "NIN", value: "•••• •••• 901" },
                        { label: "Watchlist", value: "No match" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-3">
                          <dt className="text-white/40">{row.label}</dt>
                          <dd className="font-semibold text-white/85">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="flex items-center gap-1.5 text-[0.58rem] text-white/40">
                        <ShieldCheck className="size-3 text-lime" aria-hidden />
                        Consent logged · ref PL-8F2K9
                      </span>
                      <span className="text-xs font-bold text-lime">{formatNaira(20_000)}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      { label: "NIN check", icon: Fingerprint, tint: "text-lime" },
                      { label: "BVN check", icon: BadgeCheck, tint: "text-sky" },
                      { label: "NIN slip", icon: Lock, tint: "text-violet" },
                    ].map((action) => (
                      <span
                        key={action.label}
                        className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.07] px-2 py-3 ring-1 ring-inset ring-white/10"
                      >
                        <action.icon className={cn("size-4", action.tint)} aria-hidden />
                        <span className="text-[0.6rem] font-semibold text-white/75">{action.label}</span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      { value: "99.9%", label: "Uptime" },
                      { value: "24/7", label: "API access" },
                      { value: "₦0", label: "Setup fee" },
                    ].map((stat) => (
                      <span key={stat.label} className="rounded-xl bg-white/[0.04] px-2 py-2">
                        <span className="block font-display text-sm font-bold text-white">{stat.value}</span>
                        <span className="mt-0.5 block text-[0.52rem] uppercase tracking-[0.12em] text-white/35">
                          {stat.label}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["NIN verification", "BVN verification", "NIN slip", "IPE clearance"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-ink/5 bg-white/80 px-2.5 py-1 text-[0.62rem] font-bold text-ink/65"
                  >
                    {label}
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
              { value: String(products.length), label: "Identity services on one dashboard", tone: "text-ink" },
              { value: "Instant", label: "Lookup turnaround, subject to the vendor", tone: "text-success" },
              { value: "1 wallet", label: "Funds identity checks and everyday top-ups", tone: "text-violet" },
              { value: "24/7", label: "API access with per-key controls", tone: "text-coral" },
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

        {/* Identity catalogue */}
        <section id="identity" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="chip border-ink/10 bg-white text-ink/60">
                <Fingerprint className="size-3.5 text-success" aria-hidden />
                Identity, all in one place
              </span>
              <h2 className="mt-4 max-w-xl font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Checks, slips, corrections and enrolment. Priced up front.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-ink/60">
              Every service shows its price and turnaround before you pay. The result, the reference
              and the receipt stay in your dashboard.
            </p>
          </div>

          <div className="mt-8 space-y-8">
            {grouped.map((group) => (
              <div key={group.id}>
                <div className="flex items-baseline gap-3">
                  <h3 className="font-display text-lg font-bold text-ink">{group.label}</h3>
                  <span className="text-[0.68rem] text-muted">{group.description}</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.products.map((product) => (
                    <Link
                      key={product.code}
                      href="/register"
                      className="group relative flex flex-col rounded-3xl border border-line bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-success/40 hover:shadow-float"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <IdentityIcon service={product.id} />
                        {product.popular ? (
                          <span className="chip bg-lime-soft px-2 py-0.5 text-[0.55rem] text-[#4d6b00]">
                            Popular
                          </span>
                        ) : (
                          <ArrowUpRight
                            className="size-4 text-ink/25 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink/60"
                            aria-hidden
                          />
                        )}
                      </div>
                      <h4 className="mt-4 font-display text-base font-bold text-ink">{product.name}</h4>
                      <p className="mt-1 flex-1 text-xs leading-relaxed text-ink/55">{product.tagline}</p>
                      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                        <span className="font-display text-sm font-bold text-ink">
                          {formatNaira(product.priceKobo)}
                        </span>
                        <span className="flex items-center gap-1 text-[0.6rem] font-semibold text-muted">
                          <Clock3 className="size-3" aria-hidden />
                          {product.turnaroundLabel}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 bg-white/60 py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="chip border-ink/10 bg-cream text-ink/60">Three steps, one flow</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                From first sign-up to first result.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink/60 sm:text-base">
                No paperwork, no separate vendor account. Fund the wallet once and the dashboard
                handles the rest.
              </p>
            </div>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="card relative p-6">
                  <span className="absolute right-5 top-5 font-display text-3xl font-bold text-ink/10">
                    0{index + 1}
                  </span>
                  <span className="grid size-11 place-items-center rounded-2xl bg-ink text-lime">
                    <step.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/60">{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Everyday top-ups */}
        <section id="money" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="chip border-ink/10 bg-white text-ink/60">The same wallet, every day</span>
              <h2 className="mt-4 max-w-lg font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Identity pays the bills. Airtime and data pay for themselves.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-ink/60">
              The same balance that funds a NIN check also tops up a phone, renews a decoder and
              buys a prepaid token.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {moneyServices.map((service) => (
              <Link
                key={service.type}
                href="/register"
                className="group flex flex-col rounded-3xl border border-line bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-float"
              >
                <div className="flex items-start justify-between">
                  <ServiceIcon type={service.type} />
                  <ArrowUpRight
                    className="size-4 text-ink/25 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink/60"
                    aria-hidden
                  />
                </div>
                <h3 className="mt-6 font-display text-base font-bold text-ink">{service.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink/55">{service.copy}</p>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted">
              Networks covered
            </span>
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
        </section>

        {/* Platform features */}
        <section id="platform" className="scroll-mt-24 bg-white/60 py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="chip border-ink/10 bg-cream text-ink/60">The plumbing behind the colour</span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Sensitive data deserves serious handling.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink/60 sm:text-base">
                Identity data is not like a data bundle. Paylane is built around consent, minimisation
                and a ledger that can be audited line by line.
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

        {/* API */}
        <section id="api" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="chip border-ink/10 bg-white text-ink/60">
                <Code2 className="size-3.5 text-violet" aria-hidden />
                For developers
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                One endpoint family. Keys you can revoke.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/60 sm:text-base">
                Create a live or test key from settings, send the identifier and consent flag, and
                receive the same response envelope the dashboard uses. Idempotency keys make retries
                safe.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-ink/70">
                {[
                  { icon: KeyRound, text: "Bearer keys scoped to your account, revoked in one click" },
                  { icon: RefreshCcw, text: "Idempotency-Key support with a replay header" },
                  { icon: ShieldCheck, text: "Consent is part of the request body, not an afterthought" },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                      <item.icon className="size-3.5" aria-hidden />
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/register" variant="primary" className="mt-8">
                Get an API key
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>

            <div className="wallet-mesh overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-white/70">
                  <span className="status-dot bg-lime" />
                  POST /api/v1/verify/nin-verification
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.12em] text-white/55">
                  JSON
                </span>
              </div>
              <pre className="overflow-x-auto px-5 py-4 text-[0.7rem] leading-relaxed text-white/80">
                <code>{`curl -X POST https://your-api.com/api/v1/verify/nin-verification \\
  -H "Authorization: Bearer plk_live_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: 6f3d9c2a" \\
  -d '{
    "fields": { "nin": "12345678901" },
    "consent": true
  }'`}</code>
              </pre>
              <div className="border-t border-white/10 px-5 py-4">
                <p className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-white/35">
                  Response
                </p>
                <pre className="mt-2 overflow-x-auto text-[0.7rem] leading-relaxed text-lime/85">
                  <code>{`{
  "success": true,
  "message": "Identity verified.",
  "data": {
    "request": {
      "reference": "PL-8F2K9",
      "status": "SUCCESS",
      "subjectMasked": "•••• •••• 901"
    },
    "result": { "kind": "IDENTITY", "fields": [ ... ] }
  }
}`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <AdSlot format="leaderboard" label="Sponsored" />
          </div>
        </section>

        {/* Privacy strip */}
        <section className="border-y border-ink/5 bg-cream/70">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success-soft text-success">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-ink">Built with NDPR in mind</h3>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/60">
                  Consent is recorded against every request, raw identifiers are not stored, results
                  are retained only for the configured window, and each administrator sees only the
                  sections they were granted.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted">
              {["Consent per request", "HMAC digests", "Retention purge", "Scoped admins"].map((item) => (
                <span key={item} className="chip border-ink/10 bg-white px-2.5 py-1 text-ink/55">
                  {item}
                </span>
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
                  reach: overview, customers, wallets, transactions, identity services or audit.
                  Everything else stays closed, and the backend enforces it.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-white/75">
                  {[
                    "Section-level grants, not one blunt admin role",
                    "Identity requests and pricing under their own section",
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
                    {
                      name: "Precious O.",
                      role: "Operations admin",
                      sections: ["Overview", "Identity services", "Wallets", "Transactions"],
                      active: true,
                    },
                    {
                      name: "Ibrahim M.",
                      role: "Compliance admin",
                      sections: ["Audit trail", "Identity services"],
                      active: true,
                    },
                    {
                      name: "Ngozi E.",
                      role: "Support admin",
                      sections: ["Customers"],
                      active: false,
                    },
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
                          <span
                            key={section}
                            className="rounded-full bg-white/10 px-2 py-0.5 text-[0.55rem] font-semibold text-white/65"
                          >
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

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-ink/5 bg-lime px-6 py-10 sm:px-10 sm:py-14">
            <span className="bg-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden />
            <span className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/30 blur-2xl" aria-hidden />
            <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <span className="chip bg-white/60 text-ink/70">
                  <Sparkles className="size-3.5 fill-ink/70" aria-hidden />
                  Ready when you are
                </span>
                <h2 className="mt-4 max-w-xl font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  Give every identity check a clean lane.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/60">
                  Create an account in under a minute, fund the wallet and run your first check.
                  Developers can mint an API key from settings.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <ButtonLink href="/register" variant="primary" className="px-6">
                  Create free account
                  <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
                <ButtonLink href="/login" variant="outline" className="px-6">
                  Agent login
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
              A wallet-ready identity and utility payments platform for Nigerian agents, businesses
              and developers. Made for Nigeria.
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">
              <span className={cn("status-dot", live ? "bg-success" : "bg-amber")} />
              {live ? "Identity vendor connected" : "Sandbox identity results"}
            </p>
            <p className="mt-1 text-[0.6rem] leading-relaxed text-muted">
              {live
                ? "Identity requests are sent to the configured vendor."
                : "Configure the vendor credentials in .env to run live checks. Results are simulated until then."}
            </p>
          </div>
          {[
            {
              title: "Identity",
              links: [
                { label: "NIN verification", href: "/register" },
                { label: "BVN verification", href: "/register" },
                { label: "NIN slip retrieval", href: "/register" },
                { label: "IPE clearance", href: "/register" },
              ],
            },
            {
              title: "Platform",
              links: [
                { label: "Dashboard", href: "/login" },
                { label: "Everyday top-ups", href: "/register" },
                { label: "API documentation", href: "/login" },
                { label: "Admin access", href: "/login" },
              ],
            },
            {
              title: "Account",
              links: [
                { label: "Agent login", href: "/login" },
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
              Wallet movements simulated · identity results labelled by mode
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
