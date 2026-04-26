import { withRLS, type DB } from "@/db";

const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID;

export async function withSystemRLS<T>(
  fn: (tx: DB) => Promise<T>
): Promise<T> {
  if (!SYSTEM_USER_ID) {
    throw new Error(
      "SYSTEM_USER_ID env var is missing — cron and background jobs cannot run without an RLS context"
    );
  }
  return withRLS(SYSTEM_USER_ID, "super_admin", fn);
}
