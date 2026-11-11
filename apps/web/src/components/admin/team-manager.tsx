"use client";

import { useState } from "react";
import {
  BadgeCheck,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Users,
} from "lucide-react";
import {
  ADMIN_SECTIONS,
  GRANTABLE_ADMIN_SECTIONS,
  formatDateTime,
  normalizeNigerianPhone,
  type AdminDTO,
  type AdminSection,
} from "@paylane/shared";
import { apiRequest } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const GRANTABLE = ADMIN_SECTIONS.filter((section) =>
  GRANTABLE_ADMIN_SECTIONS.includes(section.key),
);

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  isActive: true,
};

export function TeamManager({
  initialAdmins,
  currentUserId,
}: {
  initialAdmins: AdminDTO[];
  currentUserId: string;
}) {
  const { toast } = useToast();
  const [admins, setAdmins] = useState(initialAdmins);
  const [form, setForm] = useState(emptyForm);
  const [createSections, setCreateSections] = useState<AdminSection[]>(["OVERVIEW"]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminDTO | null>(null);
  const [editSections, setEditSections] = useState<AdminSection[]>([]);
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function toggle(list: AdminSection[], key: AdminSection): AdminSection[] {
    return list.includes(key) ? list.filter((item) => item !== key) : [...list, key];
  }

  async function submitCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setCreateError("Enter the administrator's first and last name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setCreateError("Enter a valid work email address.");
      return;
    }
    const phone = normalizeNigerianPhone(form.phone);
    if (!phone) {
      setCreateError("Enter a valid Nigerian mobile number.");
      return;
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setCreateError("Use a password of at least 8 characters with a letter and a number.");
      return;
    }
    if (createSections.length === 0) {
      setCreateError("Select at least one section for this administrator.");
      return;
    }

    setCreating(true);
    const response = await apiRequest<{ administrator: AdminDTO }>("/admin/admins", {
      body: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone,
        password: form.password,
        sections: createSections,
        isActive: form.isActive,
      },
    });
    setCreating(false);

    if (!response.success) {
      setCreateError(response.message);
      return;
    }

    setAdmins((current) => [response.data.administrator, ...current]);
    setForm(emptyForm);
    setCreateSections(["OVERVIEW"]);
    toast({
      title: "Administrator created",
      description: `${response.data.administrator.name} can now access ${createSections.length} section${
        createSections.length === 1 ? "" : "s"
      }.`,
      variant: "success",
    });
  }

  function openEditor(admin: AdminDTO) {
    setEditing(admin);
    setEditSections(admin.sections.filter((section) => GRANTABLE_ADMIN_SECTIONS.includes(section)));
    setEditActive(admin.isActive);
    setEditError(null);
  }

  async function saveEditor() {
    if (!editing) return;
    if (editSections.length === 0) {
      setEditError("Keep at least one section assigned.");
      return;
    }
    setSaving(true);
    const response = await apiRequest<{ administrator: AdminDTO }>(`/admin/admins/${editing.id}`, {
      method: "PATCH",
      body: { sections: editSections, isActive: editActive },
    });
    setSaving(false);

    if (!response.success) {
      setEditError(response.message);
      return;
    }

    setAdmins((current) =>
      current.map((admin) => (admin.id === editing.id ? response.data.administrator : admin)),
    );
    toast({ title: "Access updated", description: `${editing.name}'s scope has been saved.`, variant: "success" });
    setEditing(null);
  }

  async function toggleActive(admin: AdminDTO) {
    setTogglingId(admin.id);
    const response = await apiRequest<{ administrator: AdminDTO }>(`/admin/admins/${admin.id}`, {
      method: "PATCH",
      body: { isActive: !admin.isActive },
    });
    setTogglingId(null);

    if (!response.success) {
      toast({ title: "No change", description: response.message, variant: "error" });
      return;
    }

    setAdmins((current) =>
      current.map((entry) => (entry.id === admin.id ? response.data.administrator : entry)),
    );
    toast({
      title: response.data.administrator.isActive ? "Administrator activated" : "Administrator deactivated",
      description: response.data.administrator.isActive
        ? `${admin.name} can sign in again.`
        : `${admin.name} cannot sign in until reactivated.`,
      variant: "success",
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Administrators", value: String(admins.length), icon: Users, tint: "bg-violet-soft text-violet" },
          {
            label: "Active",
            value: String(admins.filter((admin) => admin.isActive).length),
            icon: BadgeCheck,
            tint: "bg-success-soft text-success",
          },
          {
            label: "Inactive",
            value: String(admins.filter((admin) => !admin.isActive).length),
            icon: ShieldOff,
            tint: "bg-danger-soft text-danger",
          },
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

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.25fr]">
        <section className="card h-fit p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime-soft text-[#4d6b00]">
              <UserPlus className="size-4" aria-hidden />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-ink">Add an administrator</h3>
              <p className="mt-0.5 text-[0.65rem] leading-relaxed text-muted">
                Pick exactly the sections this person may open. Everything else stays out of reach,
                on the server as well as the sidebar.
              </p>
            </div>
          </div>

          <form onSubmit={submitCreate} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="admin-first" className="label">First name</label>
                <input
                  id="admin-first"
                  value={form.firstName}
                  onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                  className="field py-2.5 text-sm"
                  placeholder="Chidi"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="admin-last" className="label">Last name</label>
                <input
                  id="admin-last"
                  value={form.lastName}
                  onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                  className="field py-2.5 text-sm"
                  placeholder="Okafor"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label htmlFor="admin-email" className="label">Work email</label>
              <input
                id="admin-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="field py-2.5 text-sm"
                placeholder="chidi@paylane.ng"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="admin-phone" className="label">Phone</label>
                <input
                  id="admin-phone"
                  value={form.phone}
                  onChange={(event) => {
                    const digits = event.target.value.slice(0, 14);
                    setForm({ ...form, phone: digits });
                  }}
                  className="field py-2.5 text-sm"
                  placeholder="0803 000 0000"
                  inputMode="tel"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="label">Temporary password</label>
                <input
                  id="admin-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="field py-2.5 text-sm"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <p className="label">Sections</p>
              <div className="grid gap-1.5">
                {GRANTABLE.map((section) => {
                  const checked = createSections.includes(section.key);
                  return (
                    <label
                      key={section.key}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 transition",
                        checked
                          ? "border-ink/25 bg-lime-soft/60"
                          : "border-line bg-white hover:bg-cream/60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setCreateSections((current) => toggle(current, section.key))}
                        className="mt-0.5 size-3.5 accent-[#0b1613]"
                      />
                      <span>
                        <span className="block text-[0.7rem] font-bold text-ink">{section.label}</span>
                        <span className="block text-[0.6rem] leading-snug text-muted">
                          {section.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-cream/50 px-3 py-2.5">
              <span>
                <span className="block text-[0.7rem] font-bold text-ink">Activate immediately</span>
                <span className="block text-[0.6rem] text-muted">They can sign in as soon as you save.</span>
              </span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="size-4 accent-[#0b1613]"
              />
            </label>

            {createError ? (
              <p className="rounded-xl bg-danger-soft px-3 py-2 text-[0.68rem] font-semibold text-danger">
                {createError}
              </p>
            ) : null}

            <Button type="submit" variant="accent" className="w-full" disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              Create administrator
            </Button>
            <p className="text-center text-[0.6rem] leading-relaxed text-muted">
              Share the temporary password over a private channel. Only a super administrator can
              create or change team access.
            </p>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink">Team directory</h3>
            <span className="chip bg-white text-[0.58rem] text-ink/55">
              <ShieldCheck className="size-3 text-success" aria-hidden />
              Section-scoped
            </span>
          </div>

          <div className="space-y-2.5">
            {admins.map((admin) => {
              const isSelf = admin.id === currentUserId;
              return (
                <article key={admin.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-2xl text-xs font-bold",
                        admin.isSuperAdmin ? "bg-ink text-lime" : "bg-violet-soft text-violet",
                      )}
                    >
                      {admin.firstName.charAt(0)}
                      {admin.lastName.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-xs font-bold text-ink">{admin.name}</p>
                        {admin.isSuperAdmin ? (
                          <span className="chip bg-ink px-2 py-0.5 text-[0.5rem] text-lime">Super admin</span>
                        ) : null}
                        {isSelf ? (
                          <span className="chip bg-cream px-2 py-0.5 text-[0.5rem] text-ink/55">You</span>
                        ) : null}
                        <span
                          className={cn(
                            "chip px-2 py-0.5 text-[0.5rem]",
                            admin.isActive
                              ? "bg-success-soft text-success"
                              : "bg-danger-soft text-danger",
                          )}
                        >
                          {admin.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.62rem] text-muted">
                        <Mail className="size-2.5" aria-hidden />
                        {admin.email}
                      </p>
                      <p className="mt-0.5 text-[0.58rem] text-muted">
                        {admin.phone} ·{" "}
                        {admin.lastLoginAt
                          ? `Last seen ${formatDateTime(admin.lastLoginAt)}`
                          : "No sign-in yet"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {admin.isSuperAdmin ? (
                          <span className="chip bg-lime-soft px-2 py-0.5 text-[0.52rem] text-[#4d6b00]">
                            All sections
                          </span>
                        ) : admin.sections.length === 0 ? (
                          <span className="chip bg-cream px-2 py-0.5 text-[0.52rem] text-muted">
                            No sections granted
                          </span>
                        ) : (
                          admin.sections.map((key) => (
                            <span
                              key={key}
                              className="chip bg-cream px-2 py-0.5 text-[0.52rem] text-ink/65"
                            >
                              {ADMIN_SECTIONS.find((section) => section.key === key)?.label ?? key}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {admin.isSuperAdmin ? null : (
                    <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-line/70 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditor(admin)}
                        className="text-[0.65rem]"
                      >
                        <KeyRound className="size-3.5" aria-hidden />
                        Edit access
                      </Button>
                      <Button
                        size="sm"
                        variant={admin.isActive ? "ghost" : "accent"}
                        onClick={() => toggleActive(admin)}
                        disabled={togglingId === admin.id}
                        className={cn("text-[0.65rem]", admin.isActive && "text-danger")}
                      >
                        {togglingId === admin.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : admin.isActive ? (
                          <ShieldOff className="size-3.5" aria-hidden />
                        ) : (
                          <ShieldCheck className="size-3.5" aria-hidden />
                        )}
                        {admin.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => (saving ? undefined : setEditing(null))}
        title="Edit administrator access"
        description={editing ? `${editing.name} · ${editing.email}` : undefined}
        size="md"
        footer={
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[0.68rem] font-semibold text-ink">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(event) => setEditActive(event.target.checked)}
                className="size-3.5 accent-[#0b1613]"
              />
              Account active
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="accent" size="sm" onClick={saveEditor} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Save access
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-1.5">
          {GRANTABLE.map((section) => {
            const checked = editSections.includes(section.key);
            return (
              <label
                key={section.key}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 transition",
                  checked ? "border-ink/25 bg-lime-soft/60" : "border-line bg-white hover:bg-cream/60",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setEditSections((current) => toggle(current, section.key))}
                  className="mt-0.5 size-3.5 accent-[#0b1613]"
                />
                <span>
                  <span className="block text-[0.7rem] font-bold text-ink">{section.label}</span>
                  <span className="block text-[0.6rem] leading-snug text-muted">
                    {section.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {editError ? (
          <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-[0.68rem] font-semibold text-danger">
            {editError}
          </p>
        ) : null}
        <p className="mt-3 text-[0.6rem] leading-relaxed text-muted">
          Changes apply on the next request. Removing a section while the person is signed in blocks
          that API immediately.
        </p>
      </Modal>
    </div>
  );
}
