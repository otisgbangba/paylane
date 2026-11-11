"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserRound, Users } from "lucide-react";
import { formatDateTime, formatNaira, type AdminUserDTO } from "@paylane/shared";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export function CustomersTable({
  initialUsers,
  canViewWallets,
}: {
  initialUsers: AdminUserDTO[];
  canViewWallets: boolean;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setLoading(true);
      const response = await apiRequest<{ users: AdminUserDTO[] }>(
        `/admin/users?limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`,
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
      active: users.filter((user) => user.walletStatus === "ACTIVE").length,
      frozen: users.filter((user) => user.walletStatus === "FROZEN").length,
      balance: users.reduce((sum, user) => sum + user.balanceKobo, 0),
    }),
    [users],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Listed customers", value: String(users.length), tint: "bg-sky-soft text-sky" },
          { label: "Active wallets", value: String(totals.active), tint: "bg-lime-soft text-[#4d6b00]" },
          { label: "Frozen wallets", value: String(totals.frozen), tint: "bg-coral-soft text-coral" },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3 p-4">
            <span className={cn("grid size-9 place-items-center rounded-xl", stat.tint)}>
              <Users className="size-4" aria-hidden />
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
            <h3 className="font-display text-base font-bold text-ink">Customers</h3>
            <p className="mt-0.5 text-[0.65rem] text-muted">
              {formatNaira(totals.balance)} held across the listed wallets
            </p>
          </div>
          <label className="relative block w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email or phone"
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
              <UserRound className="size-6" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-bold text-ink">
              {loading ? "Searching customers…" : "No matching customers"}
            </p>
            <p className="mt-1 text-xs text-muted">Try a different name, email or phone number.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line/70 bg-cream/50 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-muted">
                  <th className="px-4 py-2.5 sm:px-5">Customer</th>
                  <th className="px-4 py-2.5">Wallet</th>
                  <th className="px-4 py-2.5">Balance</th>
                  <th className="px-4 py-2.5">Last sign-in</th>
                  <th className="px-4 py-2.5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {users.map((customer) => (
                  <tr key={customer.id} className="text-xs transition hover:bg-cream/40">
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[0.6rem] font-bold text-lime">
                          {customer.firstName.charAt(0)}
                          {customer.lastName.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{customer.name}</p>
                          <p className="truncate text-[0.62rem] text-muted">{customer.email}</p>
                          <p className="font-mono text-[0.58rem] text-muted">{customer.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "chip text-[0.58rem]",
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
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-ink">
                      {formatNaira(customer.balanceKobo)}
                    </td>
                    <td className="px-4 py-3 text-[0.65rem] text-muted">
                      {customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-[0.65rem] text-muted">
                      {formatDateTime(customer.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canViewWallets ? (
          <div className="border-t border-line/70 bg-cream/40 px-4 py-3 text-[0.65rem] text-muted sm:px-5">
            Need to freeze an account?{" "}
            <Link href="/admin/wallets" className="font-semibold text-ink underline-offset-2 hover:underline">
              Open wallet controls
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
