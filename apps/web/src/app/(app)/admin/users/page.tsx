import type { Metadata } from "next";
import type { AdminUserDTO } from "@paylane/shared";
import { CustomersTable } from "@/components/admin/customers-table";
import { requireAdminSection } from "@/lib/admin";
import { fetchData } from "@/lib/server-api";

export const metadata: Metadata = { title: "Customers · Admin" };

export default async function AdminUsersPage() {
  const user = await requireAdminSection("USERS");
  const payload = await fetchData<{ users: AdminUserDTO[] }>("/admin/users?limit=50");

  return (
    <CustomersTable
      initialUsers={payload?.users ?? []}
      canViewWallets={user.isSuperAdmin || user.adminSections.includes("WALLETS")}
    />
  );
}
