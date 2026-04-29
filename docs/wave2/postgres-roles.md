# Postgres Role Setup (Wave 2.0)

Two roles required for RLS to work safely:

| Role | Properties | Used by |
|------|------------|---------|
| jpr_app | LOGIN NOSUPERUSER NOBYPASSRLS | runtime, src/db/index.ts |
| jpr_migrator | LOGIN NOSUPERUSER BYPASSRLS | drizzle-kit migrate/push, src/db/seed.ts |

## Provisioning SQL (run once per environment as a superuser)

```sql
CREATE ROLE jpr_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '...';
CREATE ROLE jpr_migrator LOGIN NOSUPERUSER BYPASSRLS PASSWORD '...';
GRANT CONNECT ON DATABASE jpr TO jpr_app, jpr_migrator;
GRANT USAGE ON SCHEMA public TO jpr_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jpr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jpr_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jpr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO jpr_app;
GRANT EXECUTE ON FUNCTION app_user_id(), app_user_role(), app_operator_staff_id()
  TO jpr_app, jpr_migrator;
ALTER FUNCTION app_user_id() OWNER TO jpr_migrator;
ALTER FUNCTION app_user_role() OWNER TO jpr_migrator;
ALTER FUNCTION app_operator_staff_id() OWNER TO jpr_migrator;
GRANT ALL ON SCHEMA public TO jpr_migrator;

-- drizzle-kit's bookkeeping schema also needs jpr_migrator privileges
GRANT CREATE ON DATABASE jpr TO jpr_migrator;
GRANT USAGE, CREATE ON SCHEMA drizzle TO jpr_migrator;
GRANT ALL ON ALL TABLES IN SCHEMA drizzle TO jpr_migrator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA drizzle TO jpr_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA drizzle
  GRANT ALL ON TABLES TO jpr_migrator;
```

> The `app_user_id()`, `app_user_role()`, and `app_operator_staff_id()` functions are created
> by the RLS policies migration (see PR 2.0a, Task A5). The grant statements above will fail
> if run before that migration; run them in this order: (1) create roles, (2) apply the first
> RLS migration as `jpr` (the bootstrap superuser), (3) run the GRANT EXECUTE / ALTER OWNER
> block above so subsequent migrations (e.g. `0012_rls_function_volatility`) can run as
> `jpr_migrator`. The ALTER OWNER step is required because PostgreSQL allows
> `CREATE OR REPLACE FUNCTION` only for the function's owner; without it, future migrations
> that touch these helpers will fail with `must be owner of function app_user_id`.

## Verification

```sql
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles
WHERE rolname IN ('jpr_app', 'jpr_migrator');
```

Expected:
- jpr_app: rolsuper=f, rolbypassrls=f
- jpr_migrator: rolsuper=f, rolbypassrls=t

## Local dev escape hatch

For local development you may set `MIGRATION_DATABASE_URL` to the same value as `DATABASE_URL`
(both running as the docker-compose `jpr` superuser). `drizzle.config.ts` and `seed.ts` will
fall back to `DATABASE_URL` if `MIGRATION_DATABASE_URL` is unset and `NODE_ENV !== "production"`.
This convenience does NOT apply in production — `drizzle.config.ts` throws if
`MIGRATION_DATABASE_URL` is missing in prod.
