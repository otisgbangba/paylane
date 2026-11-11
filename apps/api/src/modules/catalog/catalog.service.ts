import { asc, eq } from "drizzle-orm";
import {
  FEES_KOBO,
  LIMITS,
  NETWORKS,
  type CablePlanDTO,
  type DataPlanDTO,
  type ElectricityDiscoDTO,
} from "@paylane/shared";
import { db } from "../../db/client";
import { cablePlans, dataPlans, electricityDiscos } from "../../db/schema";

export interface CatalogResponse {
  networks: typeof NETWORKS;
  dataPlans: DataPlanDTO[];
  cablePlans: CablePlanDTO[];
  discos: ElectricityDiscoDTO[];
  fees: typeof FEES_KOBO;
  limits: typeof LIMITS;
}

export async function getCatalog(): Promise<CatalogResponse> {
  const [networkPlans, plans, discos] = await Promise.all([
    db
      .select()
      .from(dataPlans)
      .where(eq(dataPlans.isActive, true))
      .orderBy(asc(dataPlans.sortOrder)),
    db
      .select()
      .from(cablePlans)
      .where(eq(cablePlans.isActive, true))
      .orderBy(asc(cablePlans.sortOrder)),
    db
      .select()
      .from(electricityDiscos)
      .where(eq(electricityDiscos.isActive, true))
      .orderBy(asc(electricityDiscos.shortName)),
  ]);

  return {
    networks: NETWORKS,
    dataPlans: networkPlans.map((plan) => ({
      id: plan.id,
      network: plan.network,
      code: plan.code,
      name: plan.name,
      dataLabel: plan.dataLabel,
      validityLabel: plan.validityLabel,
      priceKobo: Number(plan.priceKobo),
      popular: plan.popular,
    })),
    cablePlans: plans.map((plan) => ({
      id: plan.id,
      provider: plan.provider,
      code: plan.code,
      name: plan.name,
      amountKobo: Number(plan.amountKobo),
      durationLabel: plan.durationLabel,
    })),
    discos: discos.map((disco) => ({
      id: disco.id,
      code: disco.code,
      name: disco.name,
      shortName: disco.shortName,
      minKobo: Number(disco.minKobo),
      maxKobo: Number(disco.maxKobo),
    })),
    fees: FEES_KOBO,
    limits: LIMITS,
  };
}
