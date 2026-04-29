import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { asRole, migratorPool, seedUserAndStaff } from "./setup";

describe("users RLS", () => {
  let operatorUser: string;
  let adminUser: string;
  let superAdminUser: string;
  let targetSuperAdminUser: string;

  beforeAll(async () => {
    ({ userId: operatorUser } = await seedUserAndStaff({
      phone: "0773000010",
      role: "operator",
    }));
    ({ userId: adminUser } = await seedUserAndStaff({
      phone: "0773000020",
      role: "admin",
    }));
    // super_admin — insert directly since seedUserAndStaff uses ON CONFLICT DO UPDATE
    const sa = await migratorPool.query<{ id: string }>(
      `INSERT INTO users(phone, password_hash, role, preferred_locale, is_active)
       VALUES ('0773000030', '$2b$10$test', 'super_admin', 'en', true)
       ON CONFLICT (phone) DO UPDATE SET role = 'super_admin'
       RETURNING id`
    );
    superAdminUser = sa.rows[0].id;

    // A separate super_admin to be the target for admin-cannot-update test
    const tsa = await migratorPool.query<{ id: string }>(
      `INSERT INTO users(phone, password_hash, role, preferred_locale, is_active)
       VALUES ('0773000031', '$2b$10$test', 'super_admin', 'en', true)
       ON CONFLICT (phone) DO UPDATE SET role = 'super_admin'
       RETURNING id`
    );
    targetSuperAdminUser = tsa.rows[0].id;
  });

  it("operator can update own preferred_locale", async () => {
    const result = await asRole(operatorUser, "operator", (tx) =>
      tx.execute(sql`
        UPDATE users SET preferred_locale = 'si' WHERE id = ${operatorUser} RETURNING id, preferred_locale
      `)
    );
    const rows = result.rows ?? result as any[];
    expect(rows.length).toBe(1);
    expect(rows[0].preferred_locale).toBe("si");
  });

  it("operator cannot self-promote role (WITH CHECK rejects with error)", async () => {
    // PostgreSQL throws when WITH CHECK fails on an UPDATE — it does not silently
    // return 0 rows. The USING clause allows the operator to see their own row,
    // but WITH CHECK pins role to the current value, so setting role = 'admin'
    // violates the policy and raises an error.
    await expect(
      asRole(operatorUser, "operator", (tx) =>
        tx.execute(sql`
          UPDATE users SET role = 'admin' WHERE id = ${operatorUser} RETURNING id, role
        `)
      )
    ).rejects.toThrow(/policy/);

    // Confirm role is unchanged in DB
    const check = await migratorPool.query(
      `SELECT role FROM users WHERE id = $1`,
      [operatorUser]
    );
    expect(check.rows[0].role).toBe("operator");
  });

  it("admin cannot UPDATE a super_admin user", async () => {
    // Policy: admin USING clause excludes rows where role = 'super_admin'
    const result = await asRole(adminUser, "admin", (tx) =>
      tx.execute(sql`
        UPDATE users SET preferred_locale = 'si' WHERE id = ${targetSuperAdminUser} RETURNING id
      `)
    );
    const rows = result.rows ?? result as any[];
    expect(rows.length).toBe(0);
  });

  it("super_admin can update anyone", async () => {
    const result = await asRole(superAdminUser, "super_admin", (tx) =>
      tx.execute(sql`
        UPDATE users SET preferred_locale = 'en' WHERE id = ${operatorUser} RETURNING id
      `)
    );
    const rows = result.rows ?? result as any[];
    expect(rows.length).toBe(1);
  });

  it("users_self_update_no_role_change: admin self-update to super_admin is rejected by policy", async () => {
    // Admin attempts to UPDATE own row setting role = 'super_admin'.
    // users_self_update WITH CHECK pins role to current value — combined WITH
    // CHECK across permissive policies is OR-combined, but the subquery in
    // users_self_update pins the NEW.role to the OLD role value. When the admin
    // tries to set role = 'super_admin', the subquery returns 'admin' ≠ 'super_admin'
    // so that branch fails. users_admin_update WITH CHECK also rejects because
    // NEW.role = 'super_admin' and the policy requires role <> 'super_admin'.
    // Both branches fail → PostgreSQL throws an RLS policy violation error.
    await expect(
      asRole(adminUser, "admin", (tx) =>
        tx.execute(sql`
          UPDATE users SET role = 'super_admin' WHERE id = ${adminUser} RETURNING id, role
        `)
      )
    ).rejects.toThrow(/policy/);

    // Confirm the role is still 'admin'
    const check = await migratorPool.query(
      `SELECT role FROM users WHERE id = $1`,
      [adminUser]
    );
    expect(check.rows[0].role).toBe("admin");
  });
});
