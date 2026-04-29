-- Wave 2.0 RLS hardening — see docs/superpowers/specs/2026-04-26-wave2-critical-gaps-design.md §2.1
-- Run as jpr_migrator (BYPASSRLS).

-- 0a) Postgres version guard. ALTER TYPE … ADD VALUE was made transaction-safe in PG 12;
--     we additionally rely on policy semantics that are stable in PG 14+.
DO $$
BEGIN
  IF current_setting('server_version_num')::int < 140000 THEN
    RAISE EXCEPTION '[rls] requires PostgreSQL >= 14, found %', current_setting('server_version');
  END IF;
END $$;

-- 0b) Pre-flight orphan check on operator-scoped joins. If any daily_logs row's
--     operator_id has no matching staff_profiles row, the operator self-policy
--     would render those logs invisible after RLS is enforced — operators see 0
--     rows for their own work. Same for expenses.staff_id and expenses.created_by.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM daily_logs dl
    LEFT JOIN staff_profiles sp ON sp.id = dl.operator_id
    WHERE sp.id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '[rls] % daily_logs rows have orphan operator_id; clean up before applying RLS', n; END IF;

  SELECT count(*) INTO n FROM expenses e
    LEFT JOIN staff_profiles sp ON sp.id = e.staff_id
    WHERE e.staff_id IS NOT NULL AND sp.id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '[rls] % expenses rows have orphan staff_id', n; END IF;

  SELECT count(*) INTO n FROM expenses e
    LEFT JOIN users u ON u.id = e.created_by
    WHERE e.created_by IS NOT NULL AND u.id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '[rls] % expenses rows have orphan created_by', n; END IF;
END $$;

-- 1) Helper functions (idempotent via CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_user_role() RETURNS text LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.current_user_role', true), '') $$;

CREATE OR REPLACE FUNCTION app_operator_staff_id() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT id FROM staff_profiles WHERE user_id = app_user_id() $$;

-- Tightened: only the runtime app and migrator roles need to call these.
-- PUBLIC would expose them to any future least-privilege role.
REVOKE ALL ON FUNCTION app_user_id(), app_user_role(), app_operator_staff_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_user_id(), app_user_role(), app_operator_staff_id()
  TO jpr_app, jpr_migrator;

-- 2) Enable + FORCE RLS on every sensitive table
DO $$
DECLARE
  t text;
  sensitive_tables text[] := ARRAY[
    'daily_logs','expenses','invoices','invoice_items','invoice_payments',
    'quotes','quote_items','loans','loan_payments','receivables',
    'receivable_payments','cash_transactions','users','audit_logs',
    'payroll_periods','staff_leaves','staff_schedules','staff_profiles',
    'vehicle_assignments','paddy_farms','farm_cycles','farm_inputs',
    'farm_harvests','push_subscriptions'
  ];
BEGIN
  FOREACH t IN ARRAY sensitive_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- IMPORTANT POLICY-SHAPE RULE
-- Postgres applies WITH CHECK only to INSERT and UPDATE. For DELETE, only USING
-- is evaluated. A `FOR ALL USING (... auditor ...) WITH CHECK (... no auditor ...)`
-- policy therefore lets auditor DELETE rows even though the WITH CHECK would
-- forbid INSERT/UPDATE. So the "RW for admin/super/finance, RO for auditor"
-- pattern MUST be expressed as TWO policies:
--   1. `_modify FOR ALL` USING + WITH CHECK both restricted to admin/super/finance
--      (covers SELECT, INSERT, UPDATE, DELETE for those three roles).
--   2. `_auditor_select FOR SELECT` USING auditor only.
-- Permissive policies are OR-combined per command, so this gives RW to
-- admin/super/finance and RO to auditor — without the DELETE leak.

-- 3) Policies — daily_logs
CREATE POLICY daily_logs_operator_select ON daily_logs FOR SELECT
  USING (app_user_role() = 'operator' AND operator_id = app_operator_staff_id());
CREATE POLICY daily_logs_operator_insert ON daily_logs FOR INSERT
  WITH CHECK (app_user_role() = 'operator' AND operator_id = app_operator_staff_id());
CREATE POLICY daily_logs_operator_update ON daily_logs FOR UPDATE
  USING (app_user_role() = 'operator' AND operator_id = app_operator_staff_id())
  WITH CHECK (operator_id = app_operator_staff_id());
CREATE POLICY daily_logs_modify ON daily_logs FOR ALL
  USING (app_user_role() IN ('admin','super_admin','finance'))
  WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));
CREATE POLICY daily_logs_auditor_select ON daily_logs FOR SELECT
  USING (app_user_role() = 'auditor');

-- 4) expenses
CREATE POLICY expenses_operator_select ON expenses FOR SELECT
  USING (app_user_role() = 'operator' AND created_by = app_user_id());
CREATE POLICY expenses_operator_insert ON expenses FOR INSERT
  WITH CHECK (
    app_user_role() = 'operator'
    AND created_by = app_user_id()
    AND staff_id   = app_operator_staff_id()
  );
CREATE POLICY expenses_modify ON expenses FOR ALL
  USING (app_user_role() IN ('admin','super_admin','finance'))
  WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));
CREATE POLICY expenses_auditor_select ON expenses FOR SELECT
  USING (app_user_role() = 'auditor');

-- 5–7, 12) admin/super/finance RW + auditor RO; no operator
-- invoices/items/payments, quotes/items, loans/payments, receivables/payments,
-- cash_transactions, paddy_farms, farm_cycles, farm_inputs, farm_harvests
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'invoices','invoice_items','invoice_payments',
    'quotes','quote_items',
    'loans','loan_payments','receivables','receivable_payments','cash_transactions',
    'paddy_farms','farm_cycles','farm_inputs','farm_harvests'
  ] LOOP
    EXECUTE format($p$
      CREATE POLICY %1$s_modify ON %1$I FOR ALL
        USING (app_user_role() IN ('admin','super_admin','finance'))
        WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));
      CREATE POLICY %1$s_auditor_select ON %1$I FOR SELECT
        USING (app_user_role() = 'auditor');
    $p$, t);
  END LOOP;
END $$;

-- 8) payroll_periods — operator self-only SELECT; admin/super/finance RW; auditor RO
CREATE POLICY payroll_periods_operator_select ON payroll_periods FOR SELECT
  USING (app_user_role() = 'operator' AND staff_id = app_operator_staff_id());
CREATE POLICY payroll_periods_modify ON payroll_periods FOR ALL
  USING (app_user_role() IN ('admin','super_admin','finance'))
  WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));
CREATE POLICY payroll_periods_auditor_select ON payroll_periods FOR SELECT
  USING (app_user_role() = 'auditor');

-- 9) staff_leaves, staff_schedules — operator self-only; admin/super/finance RW; auditor RO
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['staff_leaves','staff_schedules'] LOOP
    EXECUTE format($p$
      CREATE POLICY %1$s_operator_select ON %1$I FOR SELECT
        USING (app_user_role() = 'operator' AND staff_id = app_operator_staff_id());
      CREATE POLICY %1$s_modify ON %1$I FOR ALL
        USING (app_user_role() IN ('admin','super_admin','finance'))
        WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));
      CREATE POLICY %1$s_auditor_select ON %1$I FOR SELECT
        USING (app_user_role() = 'auditor');
    $p$, t);
  END LOOP;
END $$;

-- 10) staff_profiles — operator self-only SELECT; admin/super/finance RW; auditor RO
CREATE POLICY staff_profiles_operator_select ON staff_profiles FOR SELECT
  USING (app_user_role() = 'operator' AND user_id = app_user_id());
CREATE POLICY staff_profiles_modify ON staff_profiles FOR ALL
  USING (app_user_role() IN ('admin','super_admin','finance'))
  WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));
CREATE POLICY staff_profiles_auditor_select ON staff_profiles FOR SELECT
  USING (app_user_role() = 'auditor');

-- 11) vehicle_assignments — operator self-only SELECT; admin/super/finance RW; auditor RO
CREATE POLICY vehicle_assignments_operator_select ON vehicle_assignments FOR SELECT
  USING (app_user_role() = 'operator' AND staff_id = app_operator_staff_id());
CREATE POLICY vehicle_assignments_modify ON vehicle_assignments FOR ALL
  USING (app_user_role() IN ('admin','super_admin','finance'))
  WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));
CREATE POLICY vehicle_assignments_auditor_select ON vehicle_assignments FOR SELECT
  USING (app_user_role() = 'auditor');

-- 13) push_subscriptions — self only; admin/super may DELETE; no auditor read
CREATE POLICY push_subscriptions_self ON push_subscriptions FOR ALL
  USING (user_id = app_user_id())
  WITH CHECK (user_id = app_user_id());
CREATE POLICY push_subscriptions_admin_revoke ON push_subscriptions FOR DELETE
  USING (app_user_role() IN ('admin','super_admin'));

-- 14) users — admin/super manage roster; self can update own non-role columns only.
--
-- The "self-update without self-promotion" guarantee is enforced by pinning
-- the new role to the requester's existing role via a STABLE subquery.
-- The subquery runs against the pre-UPDATE table state (PG semantics),
-- returning the requester's current role; WITH CHECK passes only when
-- NEW.role = OLD.role. Combined with users_admin_update (super_admin OR
-- admin-and-not-super_admin), this stops an admin from self-promoting to
-- super_admin via own-row UPDATE — which the original draft permitted because
-- WITH CHECK clauses across permissive policies are OR-combined.
CREATE POLICY users_self_select ON users FOR SELECT
  USING (id = app_user_id() OR app_user_role() IN ('admin','super_admin','auditor','finance'));
CREATE POLICY users_self_update ON users FOR UPDATE
  USING (id = app_user_id())
  WITH CHECK (
    id = app_user_id()
    AND role = (SELECT role FROM users WHERE id = app_user_id())
  );
CREATE POLICY users_admin_update ON users FOR UPDATE
  USING (
    app_user_role() = 'super_admin'
    OR (app_user_role() = 'admin' AND role <> 'super_admin')
  )
  WITH CHECK (
    app_user_role() = 'super_admin'
    OR (app_user_role() = 'admin' AND role <> 'super_admin')
  );
CREATE POLICY users_admin_insert ON users FOR INSERT
  WITH CHECK (
    app_user_role() = 'super_admin'
    OR (app_user_role() = 'admin' AND role <> 'super_admin')
  );
CREATE POLICY users_super_delete ON users FOR DELETE
  USING (app_user_role() = 'super_admin');

-- 15) audit_logs — append-only.
-- Tightened: any role can append, but only on behalf of the calling session,
-- OR via the system path under super_admin. Without the user_id pin, an
-- operator with raw-SQL access could forge audit entries impersonating others.
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (app_user_role() IN ('super_admin','auditor'));
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (
    user_id = app_user_id()
    OR app_user_role() = 'super_admin'  -- cron/system path inserts under SYSTEM_USER_ID
  );
-- No UPDATE or DELETE policies → no role can modify history.

-- 16) Post-migration sanity: every sensitive table must have at least one policy
-- and rowsecurity must be both enabled and forced. Aborts the migration if not.
DO $$
DECLARE
  missing text;
  unforced text;
BEGIN
  SELECT string_agg(t, ', ') INTO missing
  FROM unnest(ARRAY[
    'daily_logs','expenses','invoices','invoice_items','invoice_payments',
    'quotes','quote_items','loans','loan_payments','receivables',
    'receivable_payments','cash_transactions','users','audit_logs',
    'payroll_periods','staff_leaves','staff_schedules','staff_profiles',
    'vehicle_assignments','paddy_farms','farm_cycles','farm_inputs',
    'farm_harvests','push_subscriptions'
  ]) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION '[rls] sensitive tables missing policies: %', missing;
  END IF;

  SELECT string_agg(c.relname, ', ') INTO unforced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY(ARRAY[
      'daily_logs','expenses','invoices','invoice_items','invoice_payments',
      'quotes','quote_items','loans','loan_payments','receivables',
      'receivable_payments','cash_transactions','users','audit_logs',
      'payroll_periods','staff_leaves','staff_schedules','staff_profiles',
      'vehicle_assignments','paddy_farms','farm_cycles','farm_inputs',
      'farm_harvests','push_subscriptions'
    ])
    AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity);
  IF unforced IS NOT NULL THEN
    RAISE EXCEPTION '[rls] sensitive tables without ENABLE+FORCE RLS: %', unforced;
  END IF;
END $$;
