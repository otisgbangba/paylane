import type { Metadata } from "next";
import { DataForm } from "@/components/services/data-form";
import { fetchData } from "@/lib/server-api";
import type { CatalogDTO } from "@paylane/shared";

export const metadata: Metadata = { title: "Data bundles" };

export default async function DataPage() {
  const catalog = await fetchData<CatalogDTO>("/catalog");
  return <DataForm plans={catalog?.dataPlans ?? []} />;
}
