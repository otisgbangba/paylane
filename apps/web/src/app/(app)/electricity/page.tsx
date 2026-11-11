import type { Metadata } from "next";
import { ElectricityForm } from "@/components/services/electricity-form";
import { fetchData } from "@/lib/server-api";
import type { CatalogDTO } from "@paylane/shared";

export const metadata: Metadata = { title: "Electricity" };

export default async function ElectricityPage() {
  const catalog = await fetchData<CatalogDTO>("/catalog");
  return <ElectricityForm discos={catalog?.discos ?? []} />;
}
