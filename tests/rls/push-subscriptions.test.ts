import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { asRole, migratorPool, seedUserAndStaff } from "./setup";

describe("push_subscriptions RLS", () => {
  let aliceUser: string;
  let bobUser: string;
  let aliceSubId: string;

  beforeAll(async () => {
    ({ userId: aliceUser } = await seedUserAndStaff({
      phone: "0775000010",
      role: "operator",
    }));
    ({ userId: bobUser } = await seedUserAndStaff({
      phone: "0775000011",
      role: "operator",
    }));

    // Seed Alice's push subscription via migrator.
    const sub = await migratorPool.query<{ id: string }>(
      `INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth)
       VALUES ($1, 'https://push.example.com/alice', 'alice-p256dh', 'alice-auth')
       RETURNING id`,
      [aliceUser]
    );
    aliceSubId = sub.rows[0].id;
  });

  it("user can SELECT own push subscription", async () => {
    const rows = await asRole(aliceUser, "operator", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM push_subscriptions`)
    );
    const ids = (rows.rows ?? rows as any[]).map((r: any) => r.id);
    expect(ids).toContain(aliceSubId);
  });

  it("other user cannot SELECT Alice's push subscription", async () => {
    const rows = await asRole(bobUser, "operator", (tx) =>
      tx.execute<{ id: string }>(sql`SELECT id FROM push_subscriptions`)
    );
    const ids = (rows.rows ?? rows as any[]).map((r: any) => r.id);
    expect(ids).not.toContain(aliceSubId);
  });

  it("user can INSERT own push subscription", async () => {
    const result = await asRole(aliceUser, "operator", (tx) =>
      tx.execute<{ id: string }>(sql`
        INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth)
        VALUES (${aliceUser}, 'https://push.example.com/alice2', 'alice-p256dh-2', 'alice-auth-2')
        RETURNING id
      `)
    );
    expect((result.rows ?? result as any[]).length).toBe(1);
  });

  it("user cannot INSERT push subscription for another user", async () => {
    await expect(
      asRole(bobUser, "operator", (tx) =>
        tx.execute(sql`
          INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth)
          VALUES (${aliceUser}, 'https://push.example.com/bob-impersonate', 'bob-p256dh', 'bob-auth')
        `)
      )
    ).rejects.toThrow(/policy/);
  });

  it("user can DELETE own push subscription", async () => {
    // Insert a sub to delete
    const sub = await migratorPool.query<{ id: string }>(
      `INSERT INTO push_subscriptions(user_id, endpoint, p256dh, auth)
       VALUES ($1, 'https://push.example.com/alice-delete', 'del-p256dh', 'del-auth')
       RETURNING id`,
      [aliceUser]
    );
    const subId = sub.rows[0].id;

    const deleted = await asRole(aliceUser, "operator", (tx) =>
      tx.execute<{ id: string }>(sql`
        DELETE FROM push_subscriptions WHERE id = ${subId} RETURNING id
      `)
    );
    expect((deleted.rows ?? deleted as any[]).length).toBe(1);
  });
});
