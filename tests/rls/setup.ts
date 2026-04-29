import "dotenv/config";
import { beforeAll } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";

const dialect = new PgDialect();

export const appPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});
export const migratorPool = new Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
  max: 2,
});

export const appDb = drizzle(appPool, { schema });
export const migratorDb = drizzle(migratorPool, { schema });

const SENSITIVE_TABLES = [
  "daily_logs", "expenses", "invoices", "invoice_items", "invoice_payments",
  "quotes", "quote_items", "loans", "loan_payments", "receivables",
  "receivable_payments", "cash_transactions", "audit_logs",
  "payroll_periods", "staff_leaves", "staff_schedules",
  "vehicle_assignments", "paddy_farms", "farm_cycles", "farm_inputs",
  "farm_harvests", "push_subscriptions",
  // staff_profiles + users are seeded by seedUserAndStaff and must not be
  // truncated mid-suite — beforeAll handles initial state.
];

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for RLS integration tests");
  }
  // Sanity: ensure runtime role does NOT have BYPASSRLS.
  const r = await appPool.query<{ rolbypassrls: boolean; rolsuper: boolean }>(
    "SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user"
  );
  if (r.rows[0]?.rolsuper || r.rows[0]?.rolbypassrls) {
    throw new Error(
      "RLS tests require DATABASE_URL to be the jpr_app role (NOSUPERUSER NOBYPASSRLS)"
    );
  }
});

// Truncate sensitive tables once per file (beforeAll in setupFiles runs before
// each test file's own beforeAll hooks). This isolates files from each other
// without wiping fixtures between individual tests within a file.
beforeAll(async () => {
  // Reset row state between test files. Migrator role bypasses RLS so this
  // is allowed even though the policies forbid bulk deletes from app role.
  // RESTART IDENTITY keeps any bigserial keys deterministic; CASCADE follows FKs.
  await migratorPool.query(
    `TRUNCATE TABLE ${SENSITIVE_TABLES.join(", ")} RESTART IDENTITY CASCADE`
  );
  // Also truncate users and staff_profiles so each file gets a clean slate.
  // Users referenced by other tables are cascaded via FK constraints.
  await migratorPool.query(
    `TRUNCATE TABLE staff_profiles, users RESTART IDENTITY CASCADE`
  );
});

/**
 * RLS-aware transaction context passed to asRole callbacks.
 * Wraps a raw pg.PoolClient so tests can call execute(sql`...`) directly.
 */
export interface RlsTx {
  /** Execute a drizzle sql`` query in the RLS-scoped transaction. */
  execute<T extends Record<string, unknown>>(
    query: SQL
  ): Promise<{ rows: T[] }>;
}

/**
 * Run `fn` inside a transaction where app.current_user_id and
 * app.current_user_role are set via SET LOCAL.
 *
 * Implementation note: PostgreSQL's RLS WITH CHECK evaluation for parameterized
 * INSERT/UPDATE statements uses the extended query protocol, which in some
 * driver configurations can evaluate STABLE helper functions in the planner
 * context rather than at execution time.  Sending BEGIN + SET LOCAL as a
 * single multi-statement simple-query message guarantees the session variables
 * are visible to all subsequent statements in that connection, including those
 * sent via the extended protocol.  The raw PoolClient is therefore used here
 * instead of drizzle's transaction wrapper.
 */
export async function asRole<T>(
  userId: string,
  role: string,
  fn: (tx: RlsTx) => Promise<T>
): Promise<T> {
  // Escape userId and role for safe embedding in SQL literals.
  // Both are app-controlled values (UUIDs and role enum strings) — not user input.
  const safeUserId = userId.replace(/'/g, "''");
  const safeRole = role.replace(/'/g, "''");

  const client = await appPool.connect();
  try {
    // Send BEGIN + SET LOCAL in one round-trip (simple query protocol).
    // This avoids the extended-protocol plan-caching issue that causes
    // STABLE RLS helper functions to see NULL when SET LOCAL is a separate message.
    await client.query(
      `BEGIN; SET LOCAL app.current_user_id = '${safeUserId}'; SET LOCAL app.current_user_role = '${safeRole}';`
    );

    const tx: RlsTx = {
      async execute<T2 extends Record<string, unknown>>(
        query: SQL
      ): Promise<{ rows: T2[] }> {
        // Convert drizzle's sql`` template to {sql, params} using PgDialect,
        // then send as a raw pg query.  This preserves parameterized binding
        // (prevents SQL injection) while running inside the RLS-scoped transaction.
        const built = dialect.sqlToQuery(query);
        const result = await client.query<T2>(built.sql, built.params as unknown[]);
        return { rows: result.rows };
      },
    };

    const result = await fn(tx);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function unwrapped<T>(
  fn: (db: typeof appDb) => Promise<T>
): Promise<T> {
  return fn(appDb);
}

// Seed helpers
export async function seedUserAndStaff(opts: {
  phone: string;
  role: string;
}): Promise<{ userId: string; staffId: string | null }> {
  const u = await migratorPool.query<{ id: string }>(
    `INSERT INTO users(phone, password_hash, role, preferred_locale, is_active)
     VALUES ($1, '$2b$10$test', $2, 'en', true)
     ON CONFLICT (phone) DO UPDATE SET role = EXCLUDED.role
     RETURNING id`,
    [opts.phone, opts.role]
  );
  const userId = u.rows[0].id;

  let staffId: string | null = null;
  if (opts.role === "operator") {
    const s = await migratorPool.query<{ id: string }>(
      `INSERT INTO staff_profiles(user_id, full_name, phone, pay_rate, pay_type)
       VALUES ($1, $2, $3, 1000, 'daily')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [userId, opts.phone, opts.phone]
    );
    staffId = s.rows[0]?.id ?? null;
    if (!staffId) {
      const e = await migratorPool.query<{ id: string }>(
        `SELECT id FROM staff_profiles WHERE user_id = $1`,
        [userId]
      );
      staffId = e.rows[0].id;
    }
  }

  return { userId, staffId };
}

/** Seed a vehicle and return its id. Vehicles are not RLS-protected so any pool works. */
export async function seedVehicle(): Promise<string> {
  const v = await migratorPool.query<{ id: string }>(
    `INSERT INTO vehicles(name, vehicle_type, billing_model, rate_per_hour)
     VALUES ('Test Vehicle', 'tractor', 'hourly', 500)
     RETURNING id`
  );
  return v.rows[0].id;
}
