-- Wave 2.0 RLS posture: split runtime role from migrator role.
-- See docs/wave2/postgres-roles.md. Runs once on first init of the pgdata volume
-- (postgres image executes /docker-entrypoint-initdb.d/*.sql as the bootstrap superuser).

CREATE ROLE jpr_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD 'jpr_app';
CREATE ROLE jpr_migrator LOGIN NOSUPERUSER BYPASSRLS PASSWORD 'jpr_migrator';

GRANT CONNECT ON DATABASE jpr TO jpr_app, jpr_migrator;
GRANT USAGE ON SCHEMA public TO jpr_app;
GRANT ALL ON SCHEMA public TO jpr_migrator;
GRANT CREATE ON DATABASE jpr TO jpr_migrator;

-- Existing-object grants (none yet on fresh init, but harmless and matches docs).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jpr_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jpr_app;

-- Future objects created by jpr_migrator must auto-grant to jpr_app, otherwise
-- the runtime role gets "permission denied" on every drizzle-migrated table.
ALTER DEFAULT PRIVILEGES FOR ROLE jpr_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jpr_app;
ALTER DEFAULT PRIVILEGES FOR ROLE jpr_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO jpr_app;
