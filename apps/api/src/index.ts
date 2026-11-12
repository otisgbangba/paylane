import { createServer } from "node:http";
import { app } from "./app";
import { env, identityVendorConfigured } from "./config/env";
import { closeDatabase } from "./db/client";
import { identityAdapterMode } from "./modules/identity/identity.provider";
import { purgeExpiredIdentityResults } from "./modules/identity/identity.service";

const server = createServer(app);

async function purgeIdentityResults(): Promise<void> {
  try {
    const removed = await purgeExpiredIdentityResults();
    if (removed > 0) console.log(`[identity] Purged ${removed} expired result(s).`);
  } catch (error) {
    console.error("[identity] Result purge failed:", error);
  }
}

server.listen(env.port, () => {
  console.log(`[api] Paylane API listening on http://localhost:${env.port}`);
  console.log(`[api] Web origin allowed: ${env.webOrigin}`);
  console.log(`[identity] Verification adapter: ${identityAdapterMode()}`);
  if (env.identity.mode === "HTTP" && !identityVendorConfigured) {
    console.warn(
      "[identity] HTTP mode selected but IDENTITY_VENDOR_BASE_URL / IDENTITY_VENDOR_API_KEY are blank. Requests will be refused until they are set.",
    );
  }
});

void purgeIdentityResults();
const purgeTimer = setInterval(() => void purgeIdentityResults(), 6 * 60 * 60 * 1000);
purgeTimer.unref();

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[api] ${signal} received, shutting down.`);

  const forceExit = setTimeout(() => process.exit(1), 10_000);
  forceExit.unref();

  server.close(async () => {
    await closeDatabase();
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
