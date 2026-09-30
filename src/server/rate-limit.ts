import "server-only";
import { sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { RateLimitError } from "./errors";

const memory = new Map<string, { count: number; start: number }>();

function memoryHit(key: string, limit: number, windowSec: number): boolean {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSec * 1000) {
    memory.set(key, { count: 1, start: now });
    if (memory.size > 10_000) memory.clear();
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

/**
 * Fixed-window rate limiter. Uses Postgres so limits hold across serverless instances; falls back to
 * per-instance memory when no database is configured (public demo).
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  if (!isDatabaseConfigured()) return memoryHit(key, limit, windowSec);
  try {
    const db = getDb();
    const res = await db.execute<{ count: number }>(sql`
      INSERT INTO rate_limits (key, count, window_start) VALUES (${key}, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN now() ELSE rate_limits.window_start END
      RETURNING count`);
    return Number(res.rows[0]?.count ?? 0) <= limit;
  } catch {
    return memoryHit(key, limit, windowSec);
  }
}

export async function enforceRateLimit(key: string, limit: number, windowSec: number): Promise<void> {
  if (!(await rateLimit(key, limit, windowSec))) throw new RateLimitError();
}
