import type { Metadata } from "next";
import type {
  AdminIdentityRequestDTO,
  IdentityOverviewDTO,
  IdentityProductDTO,
} from "@paylane/shared";
import { AdminVerifications } from "@/components/admin/admin-verifications";
import { requireAdminSection } from "@/lib/admin";
import { fetchData } from "@/lib/server-api";

export const metadata: Metadata = { title: "Identity services · Admin" };

const emptyOverview: IdentityOverviewDTO = {
  totalRequests: 0,
  successCount: 0,
  failedCount: 0,
  pendingCount: 0,
  revenueKobo: 0,
  todayCount: 0,
  successRate: 0,
  products: [],
};

export default async function AdminVerificationsPage() {
  await requireAdminSection("VERIFICATIONS");

  const [overviewResult, productsResult, requestsResult] = await Promise.all([
    fetchData<{ overview: IdentityOverviewDTO }>("/admin/verifications/overview"),
    fetchData<{ products: IdentityProductDTO[] }>("/admin/verifications/products"),
    fetchData<{ requests: AdminIdentityRequestDTO[] }>("/admin/verifications/requests?limit=100"),
  ]);

  return (
    <AdminVerifications
      overview={overviewResult?.overview ?? emptyOverview}
      products={productsResult?.products ?? []}
      requests={requestsResult?.requests ?? []}
    />
  );
}
