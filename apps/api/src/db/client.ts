import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNode, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migrateNode } from "drizzle-orm/node-postgres/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import pg from "pg";
import { env } from "../config/env";
import * as schema from "./schema";

/**
 * Production uses node-postgres. Local development falls back to PGlite, an
 * embedded build of the real Postgres engine, so the same schema and SQL run
 * with zero external services. Set DATABASE_URL to switch to a server.
 */
export type Database = NodePgDatabase<typeof schema>;

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

let rawClient: pg.Pool | PGlite | null = null;

async function createDatabase(): Promise<Database> {
  if (!fs.existsSync(migrationsFolder)) {
    throw new Error(
      `Migrations folder not found at ${migrationsFolder}. Run "npm run db:generate" first.`,
    );
  }

  if (env.databaseUrl) {
    const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 });
    await pool.query("select 1");
    const database = drizzleNode(pool, { schema });
    await migrateNode(database, { migrationsFolder });
    rawClient = pool;
    console.log("[db] connected to PostgreSQL");
    return database;
  }

  fs.mkdirSync(env.pgliteDir, { recursive: true });
  const pglite = new PGlite(env.pgliteDir);
  await pglite.waitReady;
  const database = drizzlePglite(pglite, { schema });
  await migratePglite(database, { migrationsFolder });
  rawClient = pglite;
  console.log(`[db] using embedded PGlite at ${env.pgliteDir}`);
  return database as unknown as Database;
}

export const db: Database = await createDatabase();

export async function closeDatabase(): Promise<void> {
  if (rawClient instanceof pg.Pool) await rawClient.end();
  else if (rawClient) await rawClient.close();
  rawClient = null;
}
