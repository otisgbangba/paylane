"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, Search, Snowflake, Unlock, Wallet } from "lucide-react";
import { formatDateTime, formatNaira, type AdminUserDTO } from "@paylane/shared";
import { apiRequest } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function WalletsTable({ initialUsers }: { initialUsers: AdminUserDTO[] }) {
  const { toast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<AdminUserDTO | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setLoading(true);
      const response = await apiRequest<{ users: AdminUserDTO[] }>(
        `/admin/wallets?limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`,
      );
      if (response.success) {
        setUsers(response.data.users);
        setError(null);
      } else {
        setError(response.message);
      }
      setLoading(false);
    }, 260);
    return () => window.clearTimeout(handle);
  }, [query]);

  const totals = useMemo(
    () => ({
      held: users.reduce((sum, user) => sum + user.balanceKobo, 0),
      active: users.filter((user) => user.walletStatus === "ACTIVE").length,
      frozen: users.filter((user) => user.walletStatus === "FROZEN").length,
    }),
    [users],
  );

  async function applyStatus() {
    if (!target) return;
    const status = target.walletStatus === "ACTIVE" ? "FROZEN" : "ACTIVE";
    setBusy(true);
    const response = await apiRequest<{ user: AdminUserDTO }>(`/admin/users/${target.id}/wallet`, {
      method: "PATCH",
      body: { status },
    });
    setBusy(false);

    if (!response.success) {
      toast({ title: "Wallet unchanged", description: response.message, variant: "error" });
      return;
    }

    setUsers((current) => current.map((user) => (user.id === target.id ? response.data.user : user)));
    toast({
      title: status === "FROZEN" ? "Wallet frozen" : "Wallet restored",
      description:
        status === "FROZEN"
          ? `${target.name} can no longer spend or receive funds.`
          : `${target.name} can transact again.`,
      variant: status === "FROZEN" ? "info" : "success",
    });
    setTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Listed balance", value: formatNaira(totals.held), tint: "bg-lime-soft text-[#4d6b00]", icon: Wallet },
          { label: "Active wallets", value: String(totals.active), tint: "bg-success-soft text-success", icon: Unlock },
          { label: "Frozen wallets", value: String(totals.frozen), tint: "bg-danger-soft text-danger", icon: Snowflake },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3 p-4">
            <span className={cn("grid size-9 place-items-center rounded-xl", stat.tint)}>
              <stat.icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted">
                {stat.label}
              </p>
              <p className="font-display text-lg font-bold text-ink">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 className="font-display text-base font-bold text-ink">Wallet controls</h3>
            <p className="mt-0.5 text-[0.65rem] text-muted">
              Freezing blocks purchases, funding and webhook credits until restored.
            </p>
          </div>
          <label className="relative block w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a wallet by customer"
              className="field py-2.5 pl-9 text-xs"
            />
          </label>
        </div>

        {error ? (
          <p className="bg-danger-soft px-4 py-2 text-[0.68rem] font-semibold text-danger">{error}</p>
        ) : null}

        {users.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-cream text-ink/35">
              <Wallet className="size-6" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-bold text-ink">
              {loading ? "Loading wallets…" : "No matching wallets"}
            </p>
            <p className="mt-1 text-xs text-muted">Try a different customer name or email.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line/60">
            {users.map((customer) => (
              <li
                key={customer.id}
                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      customer.walletStatus === "ACTIVE"
                        ? "bg-ink text-lime"
                        : "bg-danger-soft text-danger",
                    )}
                  >
                    {customer.walletStatus === "ACTIVE" ? (
                      <Wallet className="size-4" aria-hidden />
                    ) : (
                      <Lock className="size-4" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink">{customer.name}</p>
                    <p className="truncate text-[0.62rem] text-muted">{customer.email}</p>
                    <p className="text-[0.58rem] text-muted">
                      Opened {formatDateTime(customer.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-ink">
                      {formatNaira(customer.balanceKobo)}
                    </p>
                    <span
                      className={cn(
                        "chip mt-0.5 text-[0.55rem]",
                        customer.walletStatus === "ACTIVE"
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger",
                      )}
                    >
                      <span
                        className={cn(
                          "status-dot",
                          customer.walletStatus === "ACTIVE" ? "bg-success" : "bg-danger",
                        )}
                      />
                      {customer.walletStatus === "ACTIVE" ? "Active" : "Frozen"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={customer.walletStatus === "ACTIVE" ? "outline" : "accent"}
                    onClick={() => setTarget(customer)}
                    className={cn(
                      "text-[0.68rem]",
                      customer.walletStatus === "ACTIVE" && "text-danger hover:border-danger/40",
                    )}
                  >
                    {customer.walletStatus === "ACTIVE" ? (
                      <>
                        <Snowflake className="size-3.5" aria-hidden />
                        Freeze
                      </>
                    ) : (
                      <>
                        <Unlock className="size-3.5" aria-hidden />
                        Restore
                      </>
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={Boolean(target)}
        onClose={() => (busy ? undefined : setTarget(null))}
        title={target?.walletStatus === "ACTIVE" ? "Freeze this wallet?" : "Restore this wallet?"}
        description={
          target?.walletStatus === "ACTIVE"
            ? `${target?.name} will be blocked from purchases, funding and webhook credits. The balance stays untouched.`
            : `${target?.name} will be able to spend and receive funds again.`
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={target?.walletStatus === "ACTIVE" ? "primary" : "accent"}
              size="sm"
              onClick={applyStatus}
              disabled={busy}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {target?.walletStatus === "ACTIVE" ? "Freeze wallet" : "Restore wallet"}
            </Button>
          </div>
        }
      >
        {target ? (
          <div className="rounded-2xl border border-line bg-cream/60 px-4 py-3 text-xs">
            <p className="font-semibold text-ink">{target.name}</p>
            <p className="mt-0.5 text-muted">{target.email}</p>
            <p className="mt-2 text-[0.68rem] text-muted">
              Balance <span className="font-semibold text-ink">{formatNaira(target.balanceKobo)}</span> ·
              this action is recorded in the audit trail.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
