import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { asRole, migratorPool, seedUserAndStaff } from "./setup";

describe("expenses RLS", () => {
  let aliceUser: string;
  let aliceStaff: string;
  let bobUser: string;
  let bobStaff: string;
  let aliceExpenseId: string;
  let bobExpenseId: string;

  beforeAll(async () => {
    ({ userId: aliceUser, staffId: aliceStaff } = await seedUserAndStaff({
      phone: "0771000010",
      role: "operator",
    }) as { userId: string; staffId: string });
    ({ userId: bobUser, staffId: bobStaff } = await seedUserAndStaff({
      phone: "0771000011",
      role: "operator",
    }) as { userId: string; staffId: string });

    // Seed expenses via migrator (BYPASSRLS).
    const a = await migratorPool.query<{ id: string }>(
      `INSERT INTO expenses(created_by, staff_id, category, amount, date)
       VALUES ($1, $2, 'fuel', 1000, CURRENT_DATE) RETURNING id`,
      [aliceUser, aliceStaff]
    );
    aliceExpenseId = a.rows[0].id;

    const b = await migratorPool.query<{ id: string }>(
      `INSERT INTO expenses(created_by, staff_id, category, amount, date)
       VALUES ($1, $2, 'fuel', 2000, CURRENT_DATE) RETURNING id`,
      [bobUser, bobStaff]
    );
    bobExpenseId = b.rows[0].id;
  });

  it("operator sees own expense only (by created_by)", async () => {
    const rows = await asRole(aliceUser, "operator", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM expenses ORDER BY id`)
    );
    const ids = (rows.rows ?? rows as any[]).map((r: any) => r.id);
    expect(ids).toContain(aliceExpenseId);
    expect(ids).not.toContain(bobExpenseId);
  });

  it("operator INSERT with mismatched staff_id is rejected", async () => {
    await expect(
      asRole(aliceUser, "operator", (tx) =>
        tx.execute(sql`
          INSERT INTO expenses(created_by, staff_id, category, amount, date)
          VALUES (${aliceUser}, ${bobStaff}, 'fuel', 500, CURRENT_DATE)
        `)
      )
    ).rejects.toThrow(/policy/);
  });

  it("operator INSERT with correct created_by and staff_id succeeds", async () => {
    const result = await asRole(aliceUser, "operator", (tx) =>
      tx.execute<{ id: string }>(sql`
        INSERT INTO expenses(created_by, staff_id, category, amount, date)
        VALUES (${aliceUser}, ${aliceStaff}, 'repair', 300, CURRENT_DATE)
        RETURNING id
      `)
    );
    expect((result.rows ?? result as any[]).length).toBe(1);
  });

  it("finance role can read all expenses", async () => {
    const financeUser = (await seedUserAndStaff({
      phone: "0771000020",
      role: "admin",
    })).userId;
    const rows = await asRole(financeUser, "finance", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM expenses ORDER BY id`)
    );
    const ids = (rows.rows ?? rows as any[]).map((r: any) => r.id);
    expect(ids).toContain(aliceExpenseId);
    expect(ids).toContain(bobExpenseId);
  });

  it("auditor cannot DELETE expenses", async () => {
    const auditorUser = (await seedUserAndStaff({
      phone: "0771000021",
      role: "auditor",
    })).userId;
    const deleted = await asRole(auditorUser, "auditor", (tx) =>
      tx.execute(
        sql`DELETE FROM expenses WHERE id = ${aliceExpenseId} RETURNING id`
      )
    );
    expect((deleted.rows ?? deleted as any[]).length).toBe(0);

    // Verify the row still exists.
    const check = await migratorPool.query(
      `SELECT id FROM expenses WHERE id = $1`,
      [aliceExpenseId]
    );
    expect(check.rowCount).toBe(1);
  });
});
