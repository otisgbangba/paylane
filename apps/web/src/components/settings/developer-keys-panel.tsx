"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  KeyRound,
  Plus,
  ShieldOff,
  Trash2,
} from "lucide-react";
import {
  formatDateTime,
  type ApiKeyDTO,
  type IssuedApiKeyDTO,
} from "@paylane/shared";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export function DeveloperKeysPanel({
  initialKeys,
  mode,
  statusMessage,
}: {
  initialKeys: ApiKeyDTO[];
  mode: "SANDBOX" | "HTTP";
  statusMessage: string;
}) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyDTO[]>(initialKeys);
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"LIVE" | "TEST">("LIVE");
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedApiKeyDTO | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createKey(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Give the key a name so you can recognise it later.");
      return;
    }
    setCreating(true);
    const response = await apiRequest<{ apiKey: IssuedApiKeyDTO }>("/developer/keys", {
      body: { name: name.trim(), environment },
    });
    setCreating(false);
    if (!response.success) {
      setError(response.message);
      return;
    }
    setIssued(response.data.apiKey);
    setKeys((current) => [response.data.apiKey, ...current]);
    setName("");
    setCopied(false);
    toast({
      title: "API key created",
      description: "Copy it now — Paylane will not show it again.",
      variant: "success",
    });
  }

  async function copyKey() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast({ title: "Copy failed", description: "Select the key and copy it manually.", variant: "error" });
    }
  }

  async function revoke(key: ApiKeyDTO) {
    const confirmed = window.confirm(
      `Revoke "${key.name}"? Applications using it will stop working immediately.`,
    );
    if (!confirmed) return;
    setRevoking(key.id);
    const response = await apiRequest<{ apiKey: ApiKeyDTO }>(`/developer/keys/${key.id}`, {
      method: "DELETE",
    });
    setRevoking(null);
    if (!response.success) {
      toast({ title: "Could not revoke key", description: response.message, variant: "error" });
      return;
    }
    setKeys((current) =>
      current.map((item) => (item.id === key.id ? response.data.apiKey : item)),
    );
    toast({ title: "API key revoked", description: key.name, variant: "info" });
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line/80 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-violet-soft text-violet">
            <Code2 className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-ink">Developer API</h3>
            <p className="mt-0.5 max-w-xl text-[0.68rem] leading-relaxed text-muted">
              Issue keys for your own backend and call the identity services directly. Keys carry
              your wallet balance, so keep them server-side.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "chip shrink-0 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.08em]",
            mode === "HTTP" ? "bg-success-soft text-success" : "bg-amber-soft text-[#9a6200]",
          )}
        >
          <span className={cn("status-dot", mode === "HTTP" ? "bg-success" : "bg-amber")} />
          {mode === "HTTP" ? "Live vendor" : "Sandbox"}
        </span>
      </div>

      <div className="px-5 py-4">
        <p className="rounded-xl bg-cream px-3 py-2 text-[0.65rem] leading-relaxed text-ink/60">
          {statusMessage}
        </p>

        {issued ? (
          <div className="mt-4 rounded-2xl border border-success/25 bg-success-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <KeyRound className="size-3.5" aria-hidden />
                  {issued.name} · {issued.environment}
                </p>
                <p className="mt-1 text-[0.65rem] leading-relaxed text-ink/60">
                  This is the only time the key is shown. Store it in your server environment.
                </p>
              </div>
              <button
                type="button"
                onClick={copyKey}
                className="btn btn-primary btn-sm shrink-0"
              >
                {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <code className="mt-3 block break-all rounded-xl bg-forest px-3 py-2.5 font-mono text-[0.65rem] text-lime">
              {issued.key}
            </code>
          </div>
        ) : null}

        <form onSubmit={createKey} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label" htmlFor="api-key-name">
              Key name
            </label>
            <input
              id="api-key-name"
              className="field"
              placeholder="e.g. Backend production"
              maxLength={60}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="api-key-environment">
              Environment
            </label>
            <select
              id="api-key-environment"
              className="field sm:w-36"
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as "LIVE" | "TEST")}
            >
              <option value="LIVE">Live</option>
              <option value="TEST">Test</option>
            </select>
          </div>
          <Button type="submit" variant="accent" loading={creating} className="sm:w-auto">
            <Plus className="size-4" aria-hidden />
            Create key
          </Button>
        </form>

        {error ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="mt-5">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted">
            Your keys
          </p>
          {keys.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-dashed border-line px-4 py-6 text-center">
              <ShieldOff className="mx-auto size-5 text-muted" aria-hidden />
              <p className="mt-1.5 text-xs font-semibold text-ink">No API keys yet</p>
              <p className="mt-0.5 text-[0.65rem] text-muted">
                Create one above to call /api/v1/verify from your backend.
              </p>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-line/70 rounded-2xl border border-line">
              {keys.map((key) => {
                const revoked = Boolean(key.revokedAt);
                return (
                  <li
                    key={key.id}
                    className={cn(
                      "flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between",
                      revoked && "opacity-60",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-xs font-bold text-ink">{key.name}</p>
                        <span className="chip bg-cream px-1.5 py-0 text-[0.52rem] font-bold uppercase tracking-[0.06em] text-ink/55">
                          {key.environment}
                        </span>
                        {revoked ? (
                          <span className="chip bg-danger-soft px-1.5 py-0 text-[0.52rem] font-bold uppercase tracking-[0.06em] text-danger">
                            Revoked
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 font-mono text-[0.62rem] text-muted">
                        {key.prefix}••••••••••••
                      </p>
                      <p className="mt-0.5 text-[0.58rem] text-muted">
                        Created {formatDateTime(key.createdAt)}
                        {key.lastUsedAt ? ` · last used ${formatDateTime(key.lastUsedAt)}` : " · never used"}
                      </p>
                    </div>
                    {!revoked ? (
                      <button
                        type="button"
                        onClick={() => revoke(key)}
                        disabled={revoking === key.id}
                        className="btn btn-ghost btn-sm shrink-0 text-danger disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        {revoking === key.id ? "Revoking…" : "Revoke"}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-cream px-4 py-3">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-muted">
            Quick start
          </p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-forest px-3 py-2.5 text-[0.6rem] leading-relaxed text-lime/90">
{`curl -X POST /api/v1/verify/nin-verification \\
  -H "Authorization: Bearer ${issued?.key ?? "plk_live_…"}" \\
  -H "Idempotency-Key: <uuid>" \\
  -H "Content-Type: application/json" \\
  -d '{"fields":{"nin":"12345678901"},"consent":true}'`}
          </pre>
          <p className="mt-2 text-[0.62rem] leading-relaxed text-muted">
            Discovery for every service: <span className="font-semibold text-ink">GET /api/v1/verify</span>.
            API calls do not need a transaction PIN; the key is the authorisation.
          </p>
        </div>
      </div>
    </section>
  );
}
