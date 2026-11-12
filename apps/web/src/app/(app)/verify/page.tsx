import type { Metadata } from "next";
import {
  IDENTITY_SERVICES,
  type IdentityProductDTO,
  type IdentityRequestDTO,
} from "@paylane/shared";
import { VerifyHub } from "@/components/identity/verify-hub";
import { fetchData } from "@/lib/server-api";

export const metadata: Metadata = { title: "Identity services" };

const fallbackProducts: IdentityProductDTO[] = IDENTITY_SERVICES.map((service, index) => ({
  id: service.id,
  code: service.code,
  name: service.name,
  tagline: service.tagline,
  description: service.description,
  category: service.category,
  priceKobo: service.priceKobo,
  turnaroundLabel: service.turnaroundLabel,
  resultKind: service.resultKind,
  popular: Boolean(service.popular),
  isActive: true,
  sortOrder: (index + 1) * 10,
  fields: service.fields,
}));

export default async function VerifyPage() {
  const [catalog, history] = await Promise.all([
    fetchData<{ products: IdentityProductDTO[]; mode: "SANDBOX" | "HTTP" }>("/identity/products"),
    fetchData<{ requests: IdentityRequestDTO[] }>("/identity/requests"),
  ]);

  const products = catalog?.products?.length ? catalog.products : fallbackProducts;

  return (
    <VerifyHub
      products={products}
      initialRequests={history?.requests ?? []}
      providerMode={catalog?.mode ?? "SANDBOX"}
    />
  );
}
