import type { Metadata } from "next";
import type { ApiKeyDTO } from "@paylane/shared";
import { DeveloperKeysPanel } from "@/components/settings/developer-keys-panel";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { fetchData } from "@/lib/server-api";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [keys, status] = await Promise.all([
    fetchData<{ keys: ApiKeyDTO[] }>("/developer/keys"),
    fetchData<{ mode: "SANDBOX" | "HTTP"; live: boolean; message: string }>("/developer/status"),
  ]);

  return (
    <div className="space-y-5">
      <SettingsPanel />
      <DeveloperKeysPanel
        initialKeys={keys?.keys ?? []}
        mode={status?.mode ?? "SANDBOX"}
        statusMessage={
          status?.message ??
          "Requests run against the Paylane sandbox until vendor credentials are configured."
        }
      />
    </div>
  );
}
