"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import {
  formatDate,
  formatNaira,
  normalizeNigerianPhone,
  type UserDTO,
} from "@paylane/shared";
import { AdSlot } from "@/components/ads/ad-slot";
import { Button, FieldError, FieldLabel } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useWallet } from "@/components/wallet/wallet-provider";
import { apiRequest } from "@/lib/client-api";
import { cn, initials } from "@/lib/utils";

type Section = "profile" | "pin" | "password";

export function SettingsPanel() {
  const { toast } = useToast();
  const { user, wallet, applyUser } = useWallet();
  const [busy, setBusy] = useState<Section | null>(null);
  const [error, setError] = useState<Partial<Record<Section, string>>>({});
  const [fieldError, setFieldError] = useState<Partial<Record<Section, string>>>({});

  const [profile, setProfile] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
  });
  const [pin, setPin] = useState({ currentPin: "", pin: "", confirmPin: "" });
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  function clearError(section: Section) {
    setError((current) => ({ ...current, [section]: undefined }));
    setFieldError((current) => ({ ...current, [section]: undefined }));
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    clearError("profile");
    if (profile.firstName.trim().length < 2 || profile.lastName.trim().length < 2) {
      setFieldError((current) => ({ ...current, profile: "Enter your first and last name." }));
      return;
    }
    if (!normalizeNigerianPhone(profile.phone)) {
      setFieldError((current) => ({ ...current, profile: "Enter a valid Nigerian mobile number." }));
      return;
    }
    setBusy("profile");
    const response = await apiRequest<{ user: UserDTO }>("/auth/profile", {
      method: "PATCH",
      body: {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        phone: profile.phone.trim(),
      },
    });
    setBusy(null);
    if (!response.success) {
      setError((current) => ({ ...current, profile: response.message }));
      return;
    }
    applyUser(response.data.user);
    setProfile({
      firstName: response.data.user.firstName,
      lastName: response.data.user.lastName,
      phone: response.data.user.phone,
    });
    toast({ title: "Profile updated", variant: "success" });
  }

  async function savePin(event: React.FormEvent) {
    event.preventDefault();
    clearError("pin");
    if (user.hasPin && !/^\d{4}$/.test(pin.currentPin)) {
      setFieldError((current) => ({ ...current, pin: "Enter your current 4-digit PIN." }));
      return;
    }
    if (!/^\d{4}$/.test(pin.pin)) {
      setFieldError((current) => ({ ...current, pin: "Choose a new 4-digit PIN." }));
      return;
    }
    if (pin.pin !== pin.confirmPin) {
      setFieldError((current) => ({ ...current, pin: "The two PINs do not match." }));
      return;
    }
    setBusy("pin");
    const response = await apiRequest<{ hasPin: boolean }>("/auth/pin", {
      body: {
        ...(user.hasPin ? { currentPin: pin.currentPin } : {}),
        pin: pin.pin,
      },
    });
    setBusy(null);
    if (!response.success) {
      setError((current) => ({ ...current, pin: response.message }));
      return;
    }
    applyUser({ ...user, hasPin: true });
    setPin({ currentPin: "", pin: "", confirmPin: "" });
    toast({ title: user.hasPin ? "Transaction PIN changed" : "Transaction PIN set", variant: "success" });
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    clearError("password");
    if (!password.currentPassword) {
      setFieldError((current) => ({ ...current, password: "Enter your current password." }));
      return;
    }
    if (
      password.newPassword.length < 8 ||
      !/[A-Za-z]/.test(password.newPassword) ||
      !/\d/.test(password.newPassword)
    ) {
      setFieldError((current) => ({
        ...current,
        password: "Use at least 8 characters with a letter and a number.",
      }));
      return;
    }
    if (password.newPassword !== password.confirmPassword) {
      setFieldError((current) => ({ ...current, password: "The two passwords do not match." }));
      return;
    }
    setBusy("password");
    const response = await apiRequest("/auth/password", {
      body: {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      },
    });
    setBusy(null);
    if (!response.success) {
      setError((current) => ({ ...current, password: response.message }));
      return;
    }
    setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    toast({ title: "Password updated", variant: "success" });
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
          Your account
        </span>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.8rem]">
          Profile and security
        </h2>
        <p className="mt-1 max-w-xl text-sm text-ink/55">
          Keep your contact details current, rotate your PIN and change the password that guards
          the session.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.85fr]">
        <div className="space-y-4">
          <section className="card p-5 sm:p-6">
            <SectionTitle
              icon={User}
              tint="bg-sky-soft text-sky"
              title="Profile"
              copy="Contact details used for receipts and support."
            />
            <form onSubmit={saveProfile} className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="settings-first">First name</FieldLabel>
                  <input
                    id="settings-first"
                    className="field"
                    value={profile.firstName}
                    onChange={(event) => {
                      setProfile((current) => ({ ...current, firstName: event.target.value }));
                      clearError("profile");
                    }}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="settings-last">Last name</FieldLabel>
                  <input
                    id="settings-last"
                    className="field"
                    value={profile.lastName}
                    onChange={(event) => {
                      setProfile((current) => ({ ...current, lastName: event.target.value }));
                      clearError("profile");
                    }}
                  />
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="settings-phone">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3" aria-hidden />
                    Phone number
                  </span>
                </FieldLabel>
                <input
                  id="settings-phone"
                  type="tel"
                  className="field"
                  value={profile.phone}
                  onChange={(event) => {
                    setProfile((current) => ({ ...current, phone: event.target.value }));
                    clearError("profile");
                  }}
                />
              </div>
              <FieldError>{fieldError.profile}</FieldError>
              {error.profile ? <InlineError message={error.profile} /> : null}
              <Button type="submit" variant="primary" loading={busy === "profile"}>
                Save profile
              </Button>
            </form>
          </section>

          <section className="card p-5 sm:p-6">
            <SectionTitle
              icon={Fingerprint}
              tint="bg-lime-soft text-[#4d6b00]"
              title="Transaction PIN"
              copy={
                user.hasPin
                  ? "Four digits required for every purchase. Change it whenever you like."
                  : "Set a 4-digit PIN before making your first purchase."
              }
              badge={user.hasPin ? "Set" : "Required"}
              badgeTone={user.hasPin ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}
            />
            <form onSubmit={savePin} className="mt-5 space-y-3">
              {user.hasPin ? (
                <div>
                  <FieldLabel htmlFor="settings-current-pin">Current PIN</FieldLabel>
                  <input
                    id="settings-current-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    className="field text-center text-lg font-bold tracking-[0.35em]"
                    value={pin.currentPin}
                    onChange={(event) => {
                      setPin((current) => ({
                        ...current,
                        currentPin: event.target.value.replace(/\D/g, "").slice(0, 4),
                      }));
                      clearError("pin");
                    }}
                    placeholder="••••"
                  />
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel htmlFor="settings-new-pin">New PIN</FieldLabel>
                  <input
                    id="settings-new-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    className="field text-center text-lg font-bold tracking-[0.35em]"
                    value={pin.pin}
                    onChange={(event) => {
                      setPin((current) => ({
                        ...current,
                        pin: event.target.value.replace(/\D/g, "").slice(0, 4),
                      }));
                      clearError("pin");
                    }}
                    placeholder="••••"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="settings-confirm-pin">Confirm PIN</FieldLabel>
                  <input
                    id="settings-confirm-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    className="field text-center text-lg font-bold tracking-[0.35em]"
                    value={pin.confirmPin}
                    onChange={(event) => {
                      setPin((current) => ({
                        ...current,
                        confirmPin: event.target.value.replace(/\D/g, "").slice(0, 4),
                      }));
                      clearError("pin");
                    }}
                    placeholder="••••"
                  />
                </div>
              </div>
              <FieldError>{fieldError.pin}</FieldError>
              {error.pin ? <InlineError message={error.pin} /> : null}
              <Button type="submit" variant="primary" loading={busy === "pin"}>
                {user.hasPin ? "Change PIN" : "Set PIN"}
              </Button>
            </form>
          </section>

          <section className="card p-5 sm:p-6">
            <SectionTitle
              icon={Lock}
              tint="bg-violet-soft text-violet"
              title="Password"
              copy="Use at least eight characters with a letter and a number."
            />
            <form onSubmit={savePassword} className="mt-5 space-y-3">
              <div>
                <FieldLabel htmlFor="settings-current-password">Current password</FieldLabel>
                <input
                  id="settings-current-password"
                  type="password"
                  autoComplete="current-password"
                  className="field"
                  value={password.currentPassword}
                  onChange={(event) => {
                    setPassword((current) => ({ ...current, currentPassword: event.target.value }));
                    clearError("password");
                  }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="settings-new-password">New password</FieldLabel>
                  <input
                    id="settings-new-password"
                    type="password"
                    autoComplete="new-password"
                    className="field"
                    value={password.newPassword}
                    onChange={(event) => {
                      setPassword((current) => ({ ...current, newPassword: event.target.value }));
                      clearError("password");
                    }}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="settings-confirm-password">Confirm password</FieldLabel>
                  <input
                    id="settings-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className="field"
                    value={password.confirmPassword}
                    onChange={(event) => {
                      setPassword((current) => ({ ...current, confirmPassword: event.target.value }));
                      clearError("password");
                    }}
                  />
                </div>
              </div>
              <FieldError>{fieldError.password}</FieldError>
              {error.password ? <InlineError message={error.password} /> : null}
              <Button type="submit" variant="primary" loading={busy === "password"}>
                Update password
              </Button>
            </form>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="card overflow-hidden">
            <div className="wallet-mesh relative p-5 text-white">
              <span className="bg-dots absolute inset-0 opacity-10" aria-hidden />
              <div className="relative flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-lime font-display text-lg font-bold text-ink">
                  {initials(user.firstName, user.lastName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-bold">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="truncate text-[0.65rem] text-white/50">{user.email}</p>
                </div>
              </div>
              <div className="relative mt-4 flex flex-wrap gap-1.5">
                <span className="chip bg-white/10 text-[0.55rem] text-lime">
                  {user.isSuperAdmin ? "Super administrator" : user.isAdmin ? "Administrator" : "Customer"}
                </span>
                <span className="chip bg-white/10 text-[0.55rem] text-white/60">
                  Member since {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
            <dl className="space-y-2.5 p-5 text-sm">
              <Row label="Email" value={user.email} icon={Mail} />
              <Row label="Phone" value={user.phone} icon={Phone} />
              <Row
                label="Wallet balance"
                value={formatNaira(wallet.balanceKobo)}
                icon={Wallet}
              />
              <Row label="Wallet status" value={wallet.status === "ACTIVE" ? "Active" : "Frozen"} icon={ShieldCheck} />
            </dl>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-success-soft text-success">
                <ShieldCheck className="size-4" aria-hidden />
              </span>
              <h3 className="font-display text-sm font-bold text-ink">Session security</h3>
            </div>
            <ul className="mt-3 space-y-2 text-[0.68rem] leading-relaxed text-muted">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                Your session is stored in an HttpOnly cookie, not in browser storage.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                Purchases require the PIN even when the session is active.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                Five wrong PIN attempts lock spending for ten minutes.
              </li>
            </ul>
          </section>

          <AdSlot format="rectangle" />
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  tint,
  title,
  copy,
  badge,
  badgeTone,
}: {
  icon: typeof User;
  tint: string;
  title: string;
  copy: string;
  badge?: string;
  badgeTone?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", tint)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-bold text-ink">{title}</h3>
          {badge ? (
            <span className={cn("chip px-2 py-0.5 text-[0.55rem]", badgeTone)}>{badge}</span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted">{copy}</p>
      </div>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {message}
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Mail;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="min-w-0 break-all text-right text-xs font-semibold text-ink">{value}</dd>
    </div>
  );
}
