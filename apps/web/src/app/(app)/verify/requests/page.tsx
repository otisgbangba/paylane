import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import type { IdentityRequestDTO } from "@paylane/shared";
import { IdentityHistory } from "@/components/identity/identity-history";
import { fetchData } from "@/lib/server-api";

export const metadata: Metadata = { title: "Identity requests" };

export default async function IdentityRequestsPage() {
  const history = await fetchData<{ requests: IdentityRequestDTO[] }>("/identity/requests");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted">
            Identity services
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
            Every check, slip and record request
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink/55">
            Open a request to see the returned fields, download a document and keep the reference
            for support.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/verify" className="btn btn-ghost btn-sm">
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to services
          </Link>
          <Link href="/verify" className="btn btn-primary btn-sm">
            <Plus className="size-3.5" aria-hidden />
            New request
          </Link>
        </div>
      </div>

      <IdentityHistory initialRequests={history?.requests ?? []} />
    </div>
  );
}
