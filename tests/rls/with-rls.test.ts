import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { withRLS } from "@/db";

describe("withRLS()", () => {
  it("binds app.current_user_id as a parameterized value (not interpolated literal)", async () => {
    const userId = "00000000-0000-0000-0000-000000000099";
    const role = "operator";

    const result = await withRLS(userId, role, async (tx) => {
      const r = await tx.execute<{
        uid: string | null;
        role: string | null;
      }>(sql`
        SELECT current_setting('app.current_user_id', true) AS uid,
               current_setting('app.current_user_role', true) AS role
      `);
      return r.rows[0];
    });

    expect(result.uid).toBe(userId);
    expect(result.role).toBe(role);
  });

  it("rejects an attempted SQL injection via userId by binding as a value", async () => {
    const malicious = "x'; DROP TABLE users; --";

    const result = await withRLS(malicious, "operator", async (tx) => {
      const r = await tx.execute<{ uid: string | null }>(sql`
        SELECT current_setting('app.current_user_id', true) AS uid
      `);
      return r.rows[0];
    });

    expect(result.uid).toBe(malicious);
  });

  it("settings are local to the transaction (not leaked to subsequent connections)", async () => {
    await withRLS("00000000-0000-0000-0000-0000000000aa", "admin", async () => {
      // intentionally empty
    });

    const leaked = await withRLS(
      "00000000-0000-0000-0000-0000000000bb",
      "operator",
      async (tx) => {
        const r = await tx.execute<{ uid: string | null }>(sql`
          SELECT current_setting('app.current_user_id', true) AS uid
        `);
        return r.rows[0];
      }
    );

    expect(leaked.uid).toBe("00000000-0000-0000-0000-0000000000bb");
  });
});
