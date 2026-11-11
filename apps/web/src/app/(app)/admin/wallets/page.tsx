import type { Metadata } from "next";
import type { AdminUserDTO } from "@paylane/shared";
import { WalletsTable } from "@/components/admin/wallets-table";
import { requireAdminSection } from "@/lib/admin";
import { fetchData } from "@/lib/server-api";

export const metadata: Metadata = { title: "Wallets · Admin" };

export default async function AdminWalletsPage() {
  await requireAdminSection("WALLETS");
  const payload = await fetchData<{ users: AdminUserDTO[] }>("/admin/wallets?limit=50");

  return <WalletsTable initialUsers={payload?.users ?? []} />;
}
