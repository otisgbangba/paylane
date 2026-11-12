import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { ApiKeyDTO, IssuedApiKeyDTO } from "@paylane/shared";
import { env } from "../../config/env";
import { db } from "../../db/client";
import { apiKeys, users, type ApiKeyRow, type UserRow } from "../../db/schema";
import { errorFactory } from "../../lib/errors";

function hashApiKey(raw: string): string {
  return createHash("sha256").update(`${env.apiKeyPepper}:${raw}`).digest("hex");
}

function mapKey(row: ApiKeyRow): ApiKeyDTO {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    environment: row.environment,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listApiKeys(userId: string): Promise<ApiKeyDTO[]> {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
  return rows.map(mapKey);
}

export async function createApiKey(
  userId: string,
  input: { name: string; environment: "LIVE" | "TEST" },
): Promise<IssuedApiKeyDTO> {
  const scope = input.environment === "TEST" ? "test" : "live";
  const raw = `plk_${scope}_${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 20);

  const [created] = await db
    .insert(apiKeys)
    .values({
      userId,
      name: input.name,
      prefix,
      keyHash: hashApiKey(raw),
      environment: input.environment,
    })
    .returning();
  if (!created) throw new Error("API key insert returned no row");

  return { ...mapKey(created), key: raw };
}

export async function revokeApiKey(userId: string, id: string): Promise<ApiKeyDTO> {
  const [existing] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .limit(1);
  if (!existing) throw errorFactory.notFound("That API key was not found.");
  if (existing.revokedAt) return mapKey(existing);

  const [updated] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, id))
    .returning();
  if (!updated) throw new Error("API key update returned no row");
  return mapKey(updated);
}

export interface ApiKeyAuth {
  user: UserRow;
  apiKey: ApiKeyRow;
}

/** Resolves a bearer API key to an active account. */
export async function authenticateApiKey(raw: string): Promise<ApiKeyAuth | null> {
  if (!/^plk_(live|test)_[a-f0-9]{48}$/.test(raw)) return null;

  const [row] = await db
    .select({ key: apiKeys, user: users })
    .from(apiKeys)
    .innerJoin(users, eq(users.id, apiKeys.userId))
    .where(eq(apiKeys.keyHash, hashApiKey(raw)))
    .limit(1);

  if (!row || row.key.revokedAt || !row.user.isActive) return null;

  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.key.id))
    .catch(() => undefined);

  return { user: row.user, apiKey: row.key };
}
