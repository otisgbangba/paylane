import fs from "node:fs";
import path from "node:path";

async function main(): Promise<void> {
  if (process.env.DATABASE_URL) {
    throw new Error(
      "Refusing to reset a server database from this script. Drop and recreate it with your DBA tooling instead.",
    );
  }

  const dataDir = path.resolve(process.cwd(), process.env.PGLITE_DIR ?? ".data/pglite");
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
    console.log(`[reset] Removed embedded database at ${dataDir}`);
  }

  await import("./seed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
