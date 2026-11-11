import { createServer } from "node:http";
import { app } from "./app";
import { env } from "./config/env";
import { closeDatabase } from "./db/client";

const server = createServer(app);

server.listen(env.port, () => {
  console.log(`[api] Paylane API listening on http://localhost:${env.port}`);
  console.log(`[api] Web origin allowed: ${env.webOrigin}`);
});

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
