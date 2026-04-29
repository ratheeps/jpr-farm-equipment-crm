import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { asRole, migratorPool, seedUserAndStaff, seedVehicle } from "./setup";

// The actual sync handler (src/app/api/logs/sync/route.ts) checks for an
// existing log by client_device_id via SELECT before inserting — there is no
// UNIQUE constraint on client_device_id. This test simulates that pattern.

describe("sync idempotency (clientDeviceId dedup)", () => {
  let operatorUser: string;
  let operatorStaff: string;
  let vehicleId: string;

  beforeAll(async () => {
    ({ userId: operatorUser, staffId: operatorStaff } = await seedUserAndStaff({
      phone: "0776000010",
      role: "operator",
    }) as { userId: string; staffId: string });

    vehicleId = await seedVehicle();
  });

  /** Simulates the sync handler's idempotent insert logic. */
  async function syncInsert(deviceId: string): Promise<string | null> {
    return asRole(operatorUser, "operator", async (tx) => {
      // Step 1: check for existing record (idempotent guard)
      const existing = await tx.execute<{ id: string }>(sql`
        SELECT id FROM daily_logs WHERE client_device_id = ${deviceId}
      `);
      const existingRows = existing.rows ?? (existing as any[]);
      if (existingRows.length > 0) {
        return existingRows[0].id as string;
      }

      // Step 2: insert new record
      const inserted = await tx.execute<{ id: string }>(sql`
        INSERT INTO daily_logs(operator_id, vehicle_id, date, start_engine_hours, sync_status, client_device_id)
        VALUES (${operatorStaff}, ${vehicleId}, CURRENT_DATE, 0, 'synced', ${deviceId})
        RETURNING id
      `);
      const insertedRows = inserted.rows ?? (inserted as any[]);
      return insertedRows[0]?.id ?? null;
    });
  }

  it("POST same clientDeviceId twice yields a single row with the same id", async () => {
    const deviceId = `device-${Date.now()}-sync-test`;

    const firstId = await syncInsert(deviceId);
    expect(firstId).toBeTruthy();

    // Second call with same deviceId — should return the existing row's id
    const secondId = await syncInsert(deviceId);
    expect(secondId).toBe(firstId);

    // Verify exactly one row in DB with this deviceId
    const check = await migratorPool.query(
      `SELECT id FROM daily_logs WHERE client_device_id = $1`,
      [deviceId]
    );
    expect(check.rowCount).toBe(1);
    expect(check.rows[0].id).toBe(firstId);
  });

  it("different clientDeviceIds produce separate rows", async () => {
    const deviceIdA = `device-${Date.now()}-A`;
    const deviceIdB = `device-${Date.now()}-B`;

    const idA = await syncInsert(deviceIdA);
    const idB = await syncInsert(deviceIdB);

    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);

    const check = await migratorPool.query(
      `SELECT client_device_id FROM daily_logs WHERE client_device_id IN ($1, $2)`,
      [deviceIdA, deviceIdB]
    );
    expect(check.rowCount).toBe(2);
  });
});
