import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { NETWORKS, formatNaira } from "@paylane/shared";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.02fr_0.98fr]">
      <aside className="wallet-mesh relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14">
        <span className="pointer-events-none absolute -right-24 top-16 size-80 rounded-full bg-violet/25 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute -bottom-20 -left-16 size-72 rounded-full bg-lime/15 blur-3xl" aria-hidden />
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />

        <div className="relative">
          <Link href="/" aria-label="Paylane home">
            <Brand dark />
          </Link>
        </div>

        <div className="relative max-w-md">
          <span className="chip bg-white/10 text-lime">
            <Sparkles className="size-3.5" aria-hidden />
            One wallet. Every bill.
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-[-0.04em] xl:text-[3.15rem]">
            The bright lane between your money and the bills.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/55">
            Airtime, data, cable and electricity with a ledger that balances, a PIN that protects
            every purchase and receipts you can actually find later.
          </p>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Demo wallet
                </p>
                <p className="mt-1.5 font-display text-3xl font-bold">{formatNaira(9_830_000)}</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-lime/15 px-2.5 py-1 text-[0.58rem] font-semibold text-lime">
                <span className="status-dot bg-lime" />
                Reconciled
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-[0.62rem]">
              <div className="rounded-2xl bg-white/[0.06] px-3 py-2.5">
                <p className="text-white/40">Transactions</p>
                <p className="mt-0.5 text-sm font-bold">12 this week</p>
              </div>
              <div className="rounded-2xl bg-white/[0.06] px-3 py-2.5">
                <p className="text-white/40">Refunds</p>
                <p className="mt-0.5 text-sm font-bold">Automatic</p>
              </div>
            </div>
          </div>

          <ul className="mt-8 space-y-3 text-sm text-white/70">
            {[
              "Wallet debit, vendor call and ledger entry in one flow",
              "Failed purchases reversed before you refresh",
              "Section-scoped admin access for operators",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lime text-ink">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {NETWORKS.map((network) => (
              <span
                key={network.id}
                className="grid size-7 place-items-center rounded-full text-[0.6rem] font-black ring-2 ring-white/10"
                style={{
                  backgroundColor: network.color,
                  color: network.id === "MTN" || network.id === "GLO" ? "#0b1613" : "#fff",
                }}
                title={network.name}
              >
                {network.short}
              </span>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-[0.6rem] font-medium text-white/35">
            <ShieldCheck className="size-3.5 text-lime/70" aria-hidden />
            Sandbox money only
          </p>
        </div>
      </aside>

      <div className="page-backdrop flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-4 py-5 sm:px-8">
          <Link href="/" className="lg:hidden" aria-label="Paylane home">
            <Brand />
          </Link>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink/60 transition hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to site
          </Link>
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:px-8">
          <div className="w-full max-w-[27rem]">{children}</div>
        </main>
        <footer className="px-4 pb-6 text-center text-[0.62rem] text-muted sm:px-8">
          © {new Date().getFullYear()} Paylane · Lagos, Nigeria · Demo environment
        </footer>
      </div>
    </div>
  );
}
