import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 10,
});

export const db = drizzle(pool, { schema });

/**
 * Execute a function within a transaction with RLS session variables set.
 * This enforces row-level security at the PostgreSQL level.
 */
export async function withRLS<T>(
  userId: string,
  role: string,
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.current_user_id = ${userId}`);
    await tx.execute(sql`SET LOCAL app.current_user_role = ${role}`);
    return fn(tx as unknown as typeof db);
  });
}

export type DB = typeof db;
