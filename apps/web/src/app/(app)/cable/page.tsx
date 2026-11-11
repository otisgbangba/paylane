import type { Metadata } from "next";
import { CableForm } from "@/components/services/cable-form";
import { fetchData } from "@/lib/server-api";
import type { CatalogDTO } from "@paylane/shared";

export const metadata: Metadata = { title: "Cable TV" };

export default async function CablePage() {
  const catalog = await fetchData<CatalogDTO>("/catalog");
  return <CableForm plans={catalog?.cablePlans ?? []} />;
}
