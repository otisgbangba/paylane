import type { Metadata } from "next";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { formatDateTime, type AuditEventDTO } from "@paylane/shared";
import { AdSlot } from "@/components/ads/ad-slot";
import { requireAdminSection } from "@/lib/admin";
import { fetchData } from "@/lib/server-api";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit trail · Admin" };

const ACTION_TINT: Record<string, string> = {
  "admin.created": "bg-violet-soft text-violet",
  "admin.updated": "bg-sky-soft text-sky",
  "admin.deactivated": "bg-danger-soft text-danger",
  "wallet.frozen": "bg-coral-soft text-coral",
  "wallet.unfrozen": "bg-success-soft text-success",
};

export default async function AdminAuditPage() {
  await requireAdminSection("AUDIT");
  const payload = await fetchData<{ events: AuditEventDTO[] }>("/admin/audit");
  const events = payload?.events ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-ink">Administrative audit trail</h3>
          <p className="mt-0.5 max-w-xl text-[0.68rem] leading-relaxed text-muted">
            Append-only record of access changes and wallet controls. Entries cannot be edited from
            the dashboard.
          </p>
        </div>
        <span className="chip w-fit bg-white text-[0.62rem] text-ink/55">
          <ShieldCheck className="size-3.5 text-success" aria-hidden />
          {events.length} events
        </span>
      </div>

      <section className="card overflow-hidden">
        {events.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-cream text-ink/35">
              <Fingerprint className="size-6" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-bold text-ink">No audited actions yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
              Creating an administrator or freezing a wallet will write the first event here.
            </p>
          </div>
        ) : (
          <ol className="relative divide-y divide-line/60">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3 px-4 py-4 sm:px-5">
                <span
                  className={cn(
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl",
                    ACTION_TINT[event.action] ?? "bg-cream text-ink/50",
                  )}
                >
                  <Fingerprint className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="rounded-md bg-ink/5 px-1.5 py-0.5 font-mono text-[0.55rem] font-semibold text-ink/60">
                      {event.action}
                    </span>
                    <span className="text-[0.6rem] text-muted">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-ink">
                    {event.description}
                  </p>
                  <p className="mt-1 text-[0.6rem] text-muted">
                    {event.actorName || event.actorEmail}
                    {event.actorName ? ` · ${event.actorEmail}` : ""}
                    {event.ipAddress ? ` · ${event.ipAddress}` : ""}
                    {event.targetId ? ` · target ${event.targetId.slice(0, 8)}…` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <AdSlot format="leaderboard" label="Sponsored" />
    </div>
  );
}
