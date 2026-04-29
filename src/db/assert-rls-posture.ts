import { sql } from "drizzle-orm";
import { db } from "./index";

let asserted = false;

export async function assertRlsPosture(): Promise<void> {
  if (asserted) return;

  // Skip in test mode and during `next build` page-data collection.
  // NEXT_PHASE === 'phase-production-build' is set by Next 15 throughout the build pass;
  // running the probe here would force every CI build to have a live DB attached.
  // RLS posture must be checked at server startup, not at static-build time.
  if (
    process.env.NODE_ENV === "test" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return;
  }

  const role = await db.execute<{
    rolbypassrls: boolean;
    rolsuper: boolean;
  }>(sql`SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user`);
  const r = (role.rows ?? role)[0] as
    | { rolbypassrls: boolean; rolsuper: boolean }
    | undefined;

  if (!r) {
    throw new Error("[rls] could not read pg_roles for current_user");
  }
  if (r.rolsuper) {
    throw new Error(
      "[rls] runtime DB role is SUPERUSER — refusing to start. Use jpr_app, not the migrator role."
    );
  }
  if (r.rolbypassrls) {
    throw new Error(
      "[rls] runtime DB role has BYPASSRLS — refusing to start. Use jpr_app, not the migrator role."
    );
  }

  // Fail-closed probe — sensitive table without withRLS must return 0 rows.
  // We pick daily_logs because it has policies installed in this PR.
  const probe = await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM daily_logs`
  );
  const count = Number((probe.rows ?? probe)[0]?.count ?? "0");
  if (count !== 0) {
    throw new Error(
      `[rls] fail-closed probe failed: SELECT count(*) FROM daily_logs returned ${count} without withRLS — RLS not enforced`
    );
  }

  asserted = true;
}
