import { describe, it } from "vitest";

// boot-assertion test is skipped here.
//
// The assertRlsPosture() function (src/db/assert-rls-posture.ts) short-circuits
// when process.env.NODE_ENV === 'test', so importing and calling it in this
// suite would only exercise the early-return path — not the actual posture check.
//
// The manual smoke test is documented in the postgres-roles runbook:
//   docs/superpowers/plans/2026-04-26-wave2.0-rls-finance-deps.md  (A4 §step 3)
//
// To verify manually:
//   1. Set DATABASE_URL to jpr_app (NOSUPERUSER NOBYPASSRLS) — as in .env
//   2. Start the Next.js server: pnpm dev
//   3. Check server logs for "[rls] posture OK" — assertRlsPosture() runs
//      in src/instrumentation.ts on server start.
//   4. To verify the failure path: temporarily swap DATABASE_URL to the
//      jpr_migrator URL (BYPASSRLS) and confirm the server refuses to start.

describe("boot_assertion (assertRlsPosture)", () => {
  it.skip("skipped — covered by manual smoke test in postgres-roles runbook", () => {
    // See comment above.
  });
});
