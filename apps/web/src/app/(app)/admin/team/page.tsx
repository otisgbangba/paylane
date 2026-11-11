import type { Metadata } from "next";
import type { AdminDTO } from "@paylane/shared";
import { TeamManager } from "@/components/admin/team-manager";
import { requireAdminSection } from "@/lib/admin";
import { fetchData } from "@/lib/server-api";

export const metadata: Metadata = { title: "Team & access · Admin" };

export default async function AdminTeamPage() {
  const user = await requireAdminSection("TEAM");
  const payload = await fetchData<{ administrators: AdminDTO[] }>("/admin/admins");

  return (
    <TeamManager initialAdmins={payload?.administrators ?? []} currentUserId={user.id} />
  );
}
