import { redirect } from "next/navigation";
import type { AdminSection, UserDTO } from "@paylane/shared";
import { requireUser } from "./server-api";

export const ADMIN_HOME: Record<AdminSection, string> = {
  OVERVIEW: "/admin",
  USERS: "/admin/users",
  WALLETS: "/admin/wallets",
  TRANSACTIONS: "/admin/transactions",
  VERIFICATIONS: "/admin/verifications",
  AUDIT: "/admin/audit",
  TEAM: "/admin/team",
};

export function adminLanding(user: UserDTO): string | null {
  if (!user.isAdmin) return null;
  if (user.isSuperAdmin) return "/admin";
  const first = user.adminSections[0];
  return first ? ADMIN_HOME[first] : null;
}

export async function requireAdminSection(section: AdminSection): Promise<UserDTO> {
  const user = await requireUser();
  const landing = adminLanding(user);
  if (!landing) redirect("/dashboard");
  const allowed = user.isSuperAdmin || user.adminSections.includes(section);
  if (!allowed) redirect(landing);
  return user;
}
