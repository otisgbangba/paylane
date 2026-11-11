import type { Request } from "express";
import { db } from "../db/client";
import { auditLogs, type UserRow } from "../db/schema";

interface AuditInput {
  actor: UserRow;
  action: string;
  description: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  await db.insert(auditLogs).values({
    actorId: input.actor.id,
    actorName: `${input.actor.firstName} ${input.actor.lastName}`.trim(),
    actorEmail: input.actor.email,
    action: input.action,
    description: input.description,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    ipAddress: input.request?.ip ?? null,
    metadata: input.metadata ?? null,
  });
}
