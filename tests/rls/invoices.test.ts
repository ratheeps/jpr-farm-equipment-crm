import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { asRole, migratorPool, seedUserAndStaff } from "./setup";

describe("invoices RLS", () => {
  let invoiceId: string;

  beforeAll(async () => {
    await seedUserAndStaff({ phone: "0772000010", role: "operator" });

    // Seed an invoice via migrator (BYPASSRLS).
    const inv = await migratorPool.query<{ id: string }>(
      `INSERT INTO invoices(invoice_number, client_name, subtotal, total, status)
       VALUES ('INV-TEST-001', 'Test Client', 5000, 5000, 'draft') RETURNING id`
    );
    invoiceId = inv.rows[0].id;
  });

  it("operator is denied SELECT on invoices (0 rows)", async () => {
    const operatorUser = (await seedUserAndStaff({
      phone: "0772000011",
      role: "operator",
    })).userId;
    const rows = await asRole(operatorUser, "operator", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM invoices`)
    );
    expect((rows.rows ?? rows as any[]).length).toBe(0);
  });

  it("operator INSERT on invoices is rejected", async () => {
    const operatorUser = (await seedUserAndStaff({
      phone: "0772000012",
      role: "operator",
    })).userId;
    await expect(
      asRole(operatorUser, "operator", (tx) =>
        tx.execute(sql`
          INSERT INTO invoices(invoice_number, client_name, subtotal, total, status)
          VALUES ('INV-HACK-001', 'Hacker', 0, 0, 'draft')
        `)
      )
    ).rejects.toThrow(/policy/);
  });

  it("admin can read and write invoices", async () => {
    const adminUser = (await seedUserAndStaff({
      phone: "0772000020",
      role: "admin",
    })).userId;

    const rows = await asRole(adminUser, "admin", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM invoices`)
    );
    const ids = (rows.rows ?? rows as any[]).map((r: any) => r.id);
    expect(ids).toContain(invoiceId);

    // Admin can update
    const updated = await asRole(adminUser, "admin", (tx) =>
      tx.execute(sql`UPDATE invoices SET notes = 'admin note' WHERE id = ${invoiceId} RETURNING id`)
    );
    expect((updated.rows ?? updated as any[]).length).toBe(1);
  });

  it("auditor can SELECT invoices but cannot DELETE", async () => {
    const auditorUser = (await seedUserAndStaff({
      phone: "0772000021",
      role: "auditor",
    })).userId;

    const rows = await asRole(auditorUser, "auditor", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM invoices`)
    );
    const ids = (rows.rows ?? rows as any[]).map((r: any) => r.id);
    expect(ids).toContain(invoiceId);

    // Auditor cannot DELETE
    const deleted = await asRole(auditorUser, "auditor", (tx) =>
      tx.execute(sql`DELETE FROM invoices WHERE id = ${invoiceId} RETURNING id`)
    );
    expect((deleted.rows ?? deleted as any[]).length).toBe(0);

    // Verify row still exists
    const check = await migratorPool.query(
      `SELECT id FROM invoices WHERE id = $1`,
      [invoiceId]
    );
    expect(check.rowCount).toBe(1);
  });

  it("finance role can write invoices", async () => {
    const financeUser = (await seedUserAndStaff({
      phone: "0772000022",
      role: "admin",
    })).userId;
    const result = await asRole(financeUser, "finance", (tx) =>
      tx.execute<{ id: string }>(sql`
        INSERT INTO invoices(invoice_number, client_name, subtotal, total, status)
        VALUES ('INV-FIN-001', 'Finance Client', 1000, 1000, 'draft')
        RETURNING id
      `)
    );
    expect((result.rows ?? result as any[]).length).toBe(1);
  });
});
