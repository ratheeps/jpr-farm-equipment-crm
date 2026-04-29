-- Wave 2.0 follow-up: mark RLS helper functions VOLATILE so the Node pg
-- extended query protocol does NOT cache current_setting() at prepared-statement
-- plan time. With STABLE, pg evaluates the function in the plan's initial
-- context (where app.current_user_id is empty), causing RLS WITH CHECK to see
-- NULL and reject parameterized INSERT/UPDATE even when the session variable
-- was correctly set via SET LOCAL / set_config before the statement.

CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql VOLATILE
  AS $$ SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_user_role() RETURNS text LANGUAGE sql VOLATILE
  AS $$ SELECT NULLIF(current_setting('app.current_user_role', true), '') $$;

CREATE OR REPLACE FUNCTION app_operator_staff_id() RETURNS uuid LANGUAGE sql VOLATILE
  AS $$ SELECT id FROM staff_profiles WHERE user_id = app_user_id() $$;
