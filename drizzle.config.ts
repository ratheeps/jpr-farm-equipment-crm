import type { Config } from "drizzle-kit";

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "Missing MIGRATION_DATABASE_URL (preferred) or DATABASE_URL for drizzle-kit"
  );
}
if (process.env.NODE_ENV === "production" && !process.env.MIGRATION_DATABASE_URL) {
  throw new Error(
    "MIGRATION_DATABASE_URL is required in production; do not run migrations under the runtime app role"
  );
}

export default {
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
