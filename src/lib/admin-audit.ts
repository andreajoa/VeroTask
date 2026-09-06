import { createHash } from "node:crypto";
import { getDb } from "@/db";
import { adminAuditEvents } from "@/db/analytics-schema";
import { ipHash, requestIp } from "@/lib/visitor-privacy";

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
}

export async function logAdminAudit(input: {
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  headers?: Headers;
  actor?: string;
}) {
  const occurredAt = new Date();
  const actor = input.actor || "password-admin";
  const metadata = input.metadata ?? {};
  const rawIp = input.headers ? requestIp(input.headers) : null;
  const payload = {
    actor,
    action: input.action,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    metadata,
    occurredAt: occurredAt.toISOString()
  };
  const eventHash = createHash("sha256").update(stable(payload)).digest("hex");
  const db = getDb();
  await db.insert(adminAuditEvents).values({
    actor,
    action: input.action.slice(0, 120),
    resourceType: input.resourceType?.slice(0, 80),
    resourceId: input.resourceId?.slice(0, 255),
    ipHash: rawIp ? ipHash(rawIp) : null,
    metadata,
    eventHash,
    occurredAt
  });
  return eventHash;
}
