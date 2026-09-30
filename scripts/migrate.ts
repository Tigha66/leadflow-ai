/**
 * Applies SQL migrations in ./drizzle. Safe to run repeatedly (drizzle tracks applied migrations).
 * Usage: npm run db:migrate
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[migrate] DATABASE_URL not set — skipping migrations (demo marketing mode).");
    return;
  }
  const pool = new Pool({
    connectionString: url,
    max: 1,
    ssl: /sslmode=require|neon\.tech|supabase|vercel-storage/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("[migrate] migrations applied");
}

main().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
