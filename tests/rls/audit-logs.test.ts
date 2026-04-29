import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { asRole, migratorPool, seedUserAndStaff } from "./setup";

describe("audit_logs RLS", () => {
  let operatorUser: string;
  let adminUser: string;
  let auditorUser: string;
  let superAdminUser: string;
  let auditLogId: string;

  beforeAll(async () => {
    ({ userId: operatorUser } = await seedUserAndStaff({
      phone: "0774000010",
      role: "operator",
    }));
    ({ userId: adminUser } = await seedUserAndStaff({
      phone: "0774000020",
      role: "admin",
    }));
    ({ userId: auditorUser } = await seedUserAndStaff({
      phone: "0774000021",
      role: "auditor",
    }));
    const sa = await migratorPool.query<{ id: string }>(
      `INSERT INTO users(phone, password_hash, role, preferred_locale, is_active)
       VALUES ('0774000030', '$2b$10$test', 'super_admin', 'en', true)
       ON CONFLICT (phone) DO UPDATE SET role = 'super_admin'
       RETURNING id`
    );
    superAdminUser = sa.rows[0].id;

    // Seed an audit log entry via migrator.
    const al = await migratorPool.query<{ id: string }>(
      `INSERT INTO audit_logs(action, table_name, record_id, user_id)
       VALUES ('update', 'vehicles', gen_random_uuid()::text, $1) RETURNING id`,
      [adminUser]
    );
    auditLogId = al.rows[0].id;
  });

  it("any authenticated session can INSERT audit_logs on own behalf", async () => {
    // INSERT without RETURNING is required here: operators satisfy the INSERT
    // WITH CHECK (user_id = app_user_id()), but they do NOT satisfy the SELECT
    // USING policy (only super_admin/auditor can SELECT audit_logs).  PostgreSQL
    // 16 throws an RLS error — rather than silently returning 0 rows — when
    // INSERT ... RETURNING is used and the caller cannot see the inserted row.
    // We therefore verify success by counting rows via the migrator pool (BYPASSRLS).
    const countBefore = await migratorPool.query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_logs WHERE user_id = $1`,
      [operatorUser]
    );
    const before = parseInt(countBefore.rows[0].count, 10);

    // INSERT succeeds without error if the WITH CHECK policy is satisfied.
    await asRole(operatorUser, "operator", (tx) =>
      tx.execute(sql`
        INSERT INTO audit_logs(action, table_name, record_id, user_id)
        VALUES ('read', 'daily_logs', gen_random_uuid()::text, app_user_id())
      `)
    );

    const countAfter = await migratorPool.query<{ count: string }>(
      `SELECT COUNT(*) FROM audit_logs WHERE user_id = $1`,
      [operatorUser]
    );
    const after = parseInt(countAfter.rows[0].count, 10);
    expect(after).toBe(before + 1);
  });

  it("audit_logs INSERT with forged user_id is rejected (impersonation)", async () => {
    // Operator tries to insert an audit log claiming to be adminUser
    await expect(
      asRole(operatorUser, "operator", (tx) =>
        tx.execute(sql`
          INSERT INTO audit_logs(action, table_name, record_id, user_id)
          VALUES ('delete', 'invoices', gen_random_uuid()::text, ${adminUser})
        `)
      )
    ).rejects.toThrow(/policy/);
  });

  it("UPDATE audit_logs returns 0 rows for any role (no UPDATE policy)", async () => {
    // No UPDATE policy exists — all roles are denied.
    const result = await asRole(adminUser, "admin", (tx) =>
      tx.execute(sql`
        UPDATE audit_logs SET note = 'tampered' WHERE id = ${auditLogId} RETURNING id
      `)
    );
    expect((result.rows ?? result as any[]).length).toBe(0);
  });

  it("DELETE audit_logs returns 0 rows for any role (no DELETE policy)", async () => {
    const result = await asRole(superAdminUser, "super_admin", (tx) =>
      tx.execute(sql`DELETE FROM audit_logs WHERE id = ${auditLogId} RETURNING id`)
    );
    expect((result.rows ?? result as any[]).length).toBe(0);

    // Row must still exist
    const check = await migratorPool.query(
      `SELECT id FROM audit_logs WHERE id = $1`,
      [auditLogId]
    );
    expect(check.rowCount).toBe(1);
  });

  it("auditor can SELECT audit_logs", async () => {
    const rows = await asRole(auditorUser, "auditor", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM audit_logs`)
    );
    const ids = (rows.rows ?? rows as any[]).map((r: any) => r.id);
    expect(ids).toContain(auditLogId);
  });

  it("super_admin can SELECT audit_logs", async () => {
    const rows = await asRole(superAdminUser, "super_admin", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM audit_logs`)
    );
    const ids = (rows.rows ?? rows as any[]).map((r: any) => r.id);
    expect(ids).toContain(auditLogId);
  });

  it("operator cannot SELECT audit_logs (0 rows)", async () => {
    const rows = await asRole(operatorUser, "operator", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM audit_logs`)
    );
    expect((rows.rows ?? rows as any[]).length).toBe(0);
  });

  it("admin cannot SELECT audit_logs (0 rows)", async () => {
    const rows = await asRole(adminUser, "admin", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM audit_logs`)
    );
    expect((rows.rows ?? rows as any[]).length).toBe(0);
  });
});
