import type { Metadata } from "next";
import type { TransactionDTO } from "@paylane/shared";
import { PlatformTransactions } from "@/components/admin/platform-transactions";
import { requireAdminSection } from "@/lib/admin";
import { fetchData } from "@/lib/server-api";

export const metadata: Metadata = { title: "Transactions · Admin" };

export default async function AdminTransactionsPage() {
  await requireAdminSection("TRANSACTIONS");
  const payload = await fetchData<{ transactions: TransactionDTO[]; total: number }>(
    "/admin/transactions?limit=20&offset=0",
  );

  return (
    <PlatformTransactions
      initialTransactions={payload?.transactions ?? []}
      initialTotal={payload?.total ?? 0}
    />
  );
}
