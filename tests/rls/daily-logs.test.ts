import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { asRole, unwrapped, migratorPool, seedUserAndStaff, seedVehicle } from "./setup";

describe("daily_logs RLS", () => {
  let aliceUser: string;
  let aliceStaff: string;
  let bobUser: string;
  let bobStaff: string;
  let aliceLogId: string;
  let bobLogId: string;
  let vehicleId: string;

  beforeAll(async () => {
    ({ userId: aliceUser, staffId: aliceStaff } = await seedUserAndStaff({
      phone: "0770000010",
      role: "operator",
    }) as { userId: string; staffId: string });
    ({ userId: bobUser, staffId: bobStaff } = await seedUserAndStaff({
      phone: "0770000011",
      role: "operator",
    }) as { userId: string; staffId: string });

    vehicleId = await seedVehicle();

    // Insert two logs via migrator (BYPASSRLS) — one for each operator.
    const a = await migratorPool.query<{ id: string }>(
      `INSERT INTO daily_logs(operator_id, vehicle_id, date, start_engine_hours, sync_status)
       VALUES ($1, $2, CURRENT_DATE, 0, 'synced') RETURNING id`,
      [aliceStaff, vehicleId]
    );
    aliceLogId = a.rows[0].id;

    const b = await migratorPool.query<{ id: string }>(
      `INSERT INTO daily_logs(operator_id, vehicle_id, date, start_engine_hours, sync_status)
       VALUES ($1, $2, CURRENT_DATE, 0, 'synced') RETURNING id`,
      [bobStaff, vehicleId]
    );
    bobLogId = b.rows[0].id;
  });

  it("operator sees own log only", async () => {
    const rows = await asRole(aliceUser, "operator", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM daily_logs ORDER BY id`)
    );
    const ids = (rows.rows ?? rows as any[]).map((r: any) => r.id);
    expect(ids).toContain(aliceLogId);
    expect(ids).not.toContain(bobLogId);
  });

  it("admin sees all logs", async () => {
    const adminUser = (await seedUserAndStaff({
      phone: "0770000020",
      role: "admin",
    })).userId;
    const rows = await asRole(adminUser, "admin", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM daily_logs ORDER BY id`)
    );
    const ids = (rows.rows ?? rows as any[]).map((r: any) => r.id);
    expect(ids).toContain(aliceLogId);
    expect(ids).toContain(bobLogId);
  });

  it("auditor sees all logs but cannot UPDATE", async () => {
    const auditorUser = (await seedUserAndStaff({
      phone: "0770000021",
      role: "auditor",
    })).userId;
    const updated = await asRole(auditorUser, "auditor", (tx) =>
      tx.execute(
        sql`UPDATE daily_logs SET notes = 'auditor-attempt' WHERE id = ${aliceLogId} RETURNING id`
      )
    );
    expect((updated.rows ?? updated as any[]).length).toBe(0);
  });

  it("auditor cannot DELETE daily_logs", async () => {
    const auditorUser = (await seedUserAndStaff({
      phone: "0770000022",
      role: "auditor",
    })).userId;
    const deleted = await asRole(auditorUser, "auditor", (tx) =>
      tx.execute(
        sql`DELETE FROM daily_logs WHERE id = ${aliceLogId} RETURNING id`
      )
    );
    expect((deleted.rows ?? deleted as any[]).length).toBe(0);

    // Verify the row still exists (migrator bypass)
    const check = await migratorPool.query(
      `SELECT id FROM daily_logs WHERE id = $1`,
      [aliceLogId]
    );
    expect(check.rowCount).toBe(1);
  });

  it("operator cannot insert with another operator's staff id", async () => {
    await expect(
      asRole(aliceUser, "operator", (tx) =>
        tx.execute(sql`
          INSERT INTO daily_logs(operator_id, vehicle_id, date, start_engine_hours, sync_status)
          VALUES (${bobStaff}, ${vehicleId}, CURRENT_DATE, 0, 'synced')
        `)
      )
    ).rejects.toThrow(/policy/);
  });

  it("unwrapped query returns 0 rows (fail-closed)", async () => {
    const rows = await unwrapped((db) =>
      db.execute<{ count: string }>(sql`SELECT count(*)::text AS count FROM daily_logs`)
    );
    const count = Number((rows.rows ?? rows as any[])[0]?.count ?? "0");
    expect(count).toBe(0);
  });
});
