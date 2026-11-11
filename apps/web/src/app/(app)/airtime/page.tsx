import type { Metadata } from "next";
import { AirtimeForm } from "@/components/services/airtime-form";

export const metadata: Metadata = { title: "Airtime top-up" };

export default function AirtimePage() {
  return <AirtimeForm />;
}
