import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getSessionUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  return <RegisterForm />;
}
