"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  ACCOUNT_TYPES,
  detectNetwork,
  normalizeNigerianPhone,
  type AccountType,
  type UserDTO,
} from "@paylane/shared";
import { apiRequest } from "@/lib/client-api";
import { Button, FieldError, FieldLabel } from "@/components/ui/button";
import { NetworkBadge } from "@/components/brand";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  pin: string;
  confirmPin: string;
  accountType: AccountType;
}

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  pin: "",
  confirmPin: "",
  accountType: "INDIVIDUAL",
};

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const network = detectNetwork(form.phone);
  const phoneValid = Boolean(normalizeNigerianPhone(form.phone));
  const passwordValid = form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError(null);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.firstName.trim().length < 2) next.firstName = "Enter your first name.";
    if (form.lastName.trim().length < 2) next.lastName = "Enter your last name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (!phoneValid) next.phone = "Enter a valid Nigerian mobile number.";
    if (!passwordValid) next.password = "Use at least 8 characters with a letter and a number.";
    if (!/^\d{4}$/.test(form.pin)) next.pin = "Choose a 4-digit PIN.";
    else if (form.pin !== form.confirmPin) next.confirmPin = "The two PINs do not match.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setBusy(true);
    setError(null);
    const response = await apiRequest<{ user: UserDTO }>("/auth/register", {
      body: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        pin: form.pin,
        accountType: form.accountType,
      },
    });
    if (!response.success) {
      setBusy(false);
      setError(response.message);
      return;
    }
    toast({
      title: `Welcome to Paylane, ${response.data.user.firstName}`,
      description: "Fund your wallet to make your first purchase.",
      variant: "success",
    });
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="animate-fade-up">
      <span className="chip border-ink/10 bg-white text-ink/60">
        <ShieldCheck className="size-3.5 text-success" aria-hidden />
        Free to open · No paperwork
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Open your Paylane wallet.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink/55">
        One account for airtime, data, cable, electricity and identity checks. Fund a wallet and
        run your first request in under a minute.
      </p>

      {error ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="font-medium">{error}</p>
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="register-first">
              <span className="inline-flex items-center gap-1.5">
                <User className="size-3" aria-hidden />
                First name
              </span>
            </FieldLabel>
            <input
              id="register-first"
              className={cn("field", fieldErrors.firstName && "field-error")}
              autoComplete="given-name"
              value={form.firstName}
              onChange={(event) => update("firstName", event.target.value)}
              placeholder="Adaeze"
            />
            <FieldError>{fieldErrors.firstName}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="register-last">Last name</FieldLabel>
            <input
              id="register-last"
              className={cn("field", fieldErrors.lastName && "field-error")}
              autoComplete="family-name"
              value={form.lastName}
              onChange={(event) => update("lastName", event.target.value)}
              placeholder="Okafor"
            />
            <FieldError>{fieldErrors.lastName}</FieldError>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="register-email">Email address</FieldLabel>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              className={cn("field pl-11", fieldErrors.email && "field-error")}
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <FieldError>{fieldErrors.email}</FieldError>
        </div>

        <div>
          <FieldLabel
            htmlFor="register-phone"
            hint={network ? <NetworkBadge network={network} /> : phoneValid ? <CheckCircle2 className="size-4 text-success" /> : "0803 123 4567"}
          >
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3" aria-hidden />
              Phone number
            </span>
          </FieldLabel>
          <input
            id="register-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cn("field", fieldErrors.phone && "field-error")}
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="0803 123 4567"
          />
          <FieldError>{fieldErrors.phone}</FieldError>
        </div>

        <div>
          <FieldLabel htmlFor="register-account-type">How will you use Paylane?</FieldLabel>
          <div id="register-account-type" className="grid gap-2 sm:grid-cols-3">
            {ACCOUNT_TYPES.map((type) => {
              const selected = form.accountType === type.id;
              return (
                <label
                  key={type.id}
                  className={cn(
                    "cursor-pointer rounded-2xl border p-3 transition",
                    selected
                      ? "border-ink bg-ink text-cream shadow-[0_14px_30px_-22px_rgba(11,22,19,0.9)]"
                      : "border-line bg-white hover:border-ink/25",
                  )}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={type.id}
                    checked={selected}
                    onChange={() => update("accountType", type.id)}
                    className="sr-only"
                  />
                  <span className={cn("block text-xs font-bold", selected ? "text-white" : "text-ink")}>
                    {type.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[0.6rem] leading-relaxed",
                      selected ? "text-white/50" : "text-muted",
                    )}
                  >
                    {type.description}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="register-password" hint="8+ characters, letter and number">
            Password
          </FieldLabel>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className={cn("field pr-11", fieldErrors.password && "field-error")}
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              placeholder="Create a password"
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
          {form.password && !passwordValid ? (
            <p className="mt-2 flex items-center gap-1.5 text-[0.68rem] text-muted">
              <span className="status-dot bg-amber" />
              Keep going: add a letter, a number and at least 8 characters.
            </p>
          ) : null}
          <FieldError>{fieldErrors.password}</FieldError>
        </div>

        <div className="rounded-2xl border border-line bg-white/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink">Choose a transaction PIN</p>
              <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted">
                Four digits, required for every purchase. Five wrong tries lock spending for ten
                minutes.
              </p>
            </div>
            <span className="chip shrink-0 bg-cream text-ink/50">4 digits</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="register-pin">PIN</FieldLabel>
              <input
                id="register-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                className={cn("field text-center text-lg font-bold tracking-[0.35em]", fieldErrors.pin && "field-error")}
                value={form.pin}
                onChange={(event) => update("pin", event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
              />
              <FieldError>{fieldErrors.pin}</FieldError>
            </div>
            <div>
              <FieldLabel htmlFor="register-confirm-pin">Confirm PIN</FieldLabel>
              <input
                id="register-confirm-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                className={cn("field text-center text-lg font-bold tracking-[0.35em]", fieldErrors.confirmPin && "field-error")}
                value={form.confirmPin}
                onChange={(event) => update("confirmPin", event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
              />
              <FieldError>{fieldErrors.confirmPin}</FieldError>
            </div>
          </div>
        </div>

        <Button type="submit" variant="accent" className="w-full" loading={busy}>
          Create my wallet
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </form>

      <p className="mt-4 text-center text-[0.65rem] leading-relaxed text-muted">
        Wallet funding runs in sandbox mode, so no real card is charged. Identity results are
        labelled sandbox until live vendor credentials are configured.
      </p>

      <p className="mt-5 text-center text-sm text-ink/55">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-ink underline decoration-lime decoration-2 underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
