"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import type { UserDTO } from "@paylane/shared";
import { apiRequest } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const demoAccounts = [
  {
    label: "Customer",
    detail: "adaeze@paylane.test",
    password: "Paylane123",
    tone: "border-[#b2e240] bg-lime-soft text-[#3d5600]",
  },
  {
    label: "Super admin",
    detail: "super@paylane.test",
    password: "SuperAdmin123",
    tone: "border-violet/25 bg-violet-soft text-violet",
  },
  {
    label: "Ops admin",
    detail: "ops@paylane.test",
    password: "OpsAdmin123",
    tone: "border-sky/25 bg-sky-soft text-sky",
  },
  {
    label: "Audit admin",
    detail: "audit@paylane.test",
    password: "AuditAdmin123",
    tone: "border-amber/30 bg-amber-soft text-[#8a5a00]",
  },
];

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await apiRequest<{ user: UserDTO }>("/auth/login", {
      body: { email, password },
    });
    if (!response.success) {
      setBusy(false);
      setError(response.message);
      return;
    }
    toast({ title: `Welcome back, ${response.data.user.firstName}`, variant: "success" });
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="animate-fade-up">
      <span className="chip border-ink/10 bg-white text-ink/60">
        <ShieldCheck className="size-3.5 text-success" aria-hidden />
        Secure session · HttpOnly cookie
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Welcome back.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink/55">
        Sign in to fund your wallet and keep the bills moving.
      </p>

      {error ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="font-medium">{error}</p>
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="login-email">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              className="field pl-11"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label className="label mb-0" htmlFor="login-password">
              Password
            </label>
            <span className="text-[0.65rem] font-medium text-muted">Case sensitive</span>
          </div>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="field px-11"
              placeholder="Your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-ink/5 hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" variant="accent" className="w-full" loading={busy}>
          Sign in
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted">
          Or use a demo account
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {demoAccounts.map((account) => (
          <button
            key={account.label}
            type="button"
            onClick={() => {
              setEmail(account.detail);
              setPassword(account.password);
              setError(null);
            }}
            className={cn(
              "rounded-2xl border px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
              account.tone,
            )}
          >
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.1em] opacity-70">
              {account.label}
            </span>
            <span className="mt-0.5 block truncate text-[0.68rem] font-semibold">{account.detail}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[0.62rem] text-muted">
        Tapping a demo card fills the form. Customer PIN is 1234.
      </p>

      <p className="mt-7 text-center text-sm text-ink/55">
        New to Paylane?{" "}
        <Link href="/register" className="font-bold text-ink underline decoration-lime decoration-2 underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
