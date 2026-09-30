import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
    this.name = "DatabaseNotConfiguredError";
  }
}

const globalForDb = globalThis as unknown as { __hvacPool?: Pool; __hvacDb?: Database };

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): Database {
  if (globalForDb.__hvacDb) return globalForDb.__hvacDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();
  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    ssl: /sslmode=require|neon\.tech|supabase|vercel-storage/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  globalForDb.__hvacPool = pool;
  globalForDb.__hvacDb = drizzle(pool, { schema });
  return globalForDb.__hvacDb;
}

export { schema };
