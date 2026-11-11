import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ADMIN_SECTIONS } from "@paylane/shared";
import { requireUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");

  const sections = user.isSuperAdmin ? ADMIN_SECTIONS.map((item) => item.key) : user.adminSections;
  if (sections.length === 0) redirect("/dashboard");

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-forest px-4 py-5 text-white sm:px-6">
        <span className="bg-dots pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime text-ink">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <div>
              <span className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-lime/80">
                Control room
              </span>
              <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
                Administration
              </h2>
              <p className="mt-0.5 text-[0.7rem] text-white/60">
                {user.isSuperAdmin
                  ? "Super administrator · every section unlocked"
                  : `Scoped access · ${sections.length} of ${ADMIN_SECTIONS.length - 1} grantable sections`}
              </p>
            </div>
          </div>
          <span className="flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[0.62rem] font-semibold text-white/80 ring-1 ring-white/15">
            <span className="status-dot bg-lime" />
            Actions are written to the audit trail
          </span>
        </div>
      </div>

      <AdminTabs allowed={sections} isSuperAdmin={user.isSuperAdmin} />

      {children}
    </div>
  );
}
