import "server-only";
import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";
import { logger } from "@/lib/logger";

export async function audit(entry: {
  orgId?: string | null;
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await getDb()
      .insert(auditEvents)
      .values({
        orgId: entry.orgId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata ?? {},
        ip: entry.ip,
      });
  } catch (err) {
    logger.warn("audit.write_failed", { action: entry.action, err });
  }
}
