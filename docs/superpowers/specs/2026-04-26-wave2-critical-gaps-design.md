# Wave 2 Design — RLS Hardening, Moonlighting Detection, Cash-Flow Forecasting, Quote Pricing, Hour Adjustments, Invoice Drafts

**Date:** 2026-04-26
**Scope:** 6 items closing the critical gaps surfaced by the requirements audit on 2026-04-26. Shipped in two waves: **Wave 2.0** (security + cleanup, urgent) and **Wave 2.1** (feature work).
**Out of scope (later):** GPS privacy UI badge, staff schedule/calendar view, Land Prep phase-typed schema, server-side PDF route.

---

## 1. Context and Goals

The Wave 1 audit (2026-04-26) graded the JPR app against `Machinery Rental & Farming App Requirements.md`. ~85% of requirements are implemented. Six gaps are critical:

1. **RLS not enforced** — `withRLS()` helper exists at [src/db/index.ts:21-35](../../../src/db/index.ts#L21-L35) but is invoked nowhere; no `CREATE POLICY` migrations. Access control runs at app layer only.
2. **Moonlighting / unauthorized use detection missing** — schema captures GPS and timestamps, but no geofence or off-hours logic exists despite explicit requirement (line 58 of requirements doc).
3. **Cash flow forecasting missing** — finance module covers loans + receivables but no projection of incoming/outgoing cash, no farm-cycle revenue/cost forecast.
4. **Quote pricing has no historical data** — admins enter rates manually; requirement calls for historical-similar-project pricing.
5. **Engine hours not admin-editable** — `EDITABLE_FIELDS` whitelist at [src/lib/actions/admin-logs.ts:73-89](../../../src/lib/actions/admin-logs.ts#L73-L89) excludes start/end engine hours; admin cannot adjust for mobilization or correct operator errors.
6. **Unused deps** — `zustand` and `@tanstack/react-query` in package.json with zero imports.

### In-scope items

- **Wave 2.0 (security/cleanup):**
  - 1.1 RLS hybrid (DB policies + `withRLS()` wired into actions)
  - 1.2 Add `finance` role + `/finance/*` route group
  - 1.3 Remove unused deps
- **Wave 2.1 (features):**
  - 2.1 Geofence + off-hours moonlighting detection
  - 2.2 Cash flow forecasting (farm-level + business-wide)
  - 2.3 Quote historical pricing (auto-fill + reference panel)
  - 2.4 Engine-hour admin adjustment (separate audited action + mobilization-adjustment column)
  - 2.5 Invoice draft from pending logs (editable before persist)

### Explicit non-goals

- No rework of existing payroll, daily-log, or paddy-farm schemas beyond additive columns.
- No new auth provider, no JWT format change.
- No visual redesign — new pages match existing mobile-first patterns.
- No change to offline-sync engine.

---

## 2. Wave 2.0 — Security and Cleanup

Ships first as a small, urgent PR. Lets RLS bake in production before feature work lands.

### 2.1 RLS Hybrid Enforcement

**Approach:** DB-level `CREATE POLICY` for sensitive tables + `withRLS()` invocation in every server action that reads/writes them. App-layer role checks remain as belt-and-suspenders for non-sensitive tables.

**Sensitive tables (DB policies required):**
`daily_logs`, `expenses`, `invoices`, `invoice_items`, `invoice_payments`, `quotes`, `quote_items`, `loans`, `loan_payments`, `receivables`, `receivable_payments`, `cash_transactions`, `users`, `audit_logs`, `payroll_periods`, `staff_leaves`, `staff_schedules`, `staff_profiles`, `vehicle_assignments`, `paddy_farms`, `farm_cycles`, `farm_inputs`, `farm_harvests`, `push_subscriptions`.

Categorization rationale:
- `users` carries `passwordHash` and PII.
- `audit_logs` is forensic-grade — read restricted to `super_admin`/`auditor`, no UPDATE/DELETE for any role (append-only).
- `staff_profiles` holds `pay_rate` / `pay_type` + PII (`phone`, `full_name`) — operator self-only; admin/finance RW; auditor RO. (Note: schema uses `pay_rate`/`pay_type`, not `salary_amount`/`monthly_salary`.)
- `staff_leaves`, `staff_schedules` — personal HR data — operator self-only; admin/finance RW; auditor RO.
- `vehicle_assignments` — feeds moonlighting detection; operator must see only own assignments.
- `paddy_farms`, `farm_cycles`, `farm_inputs`, `farm_harvests` — costs and revenues feed cash-flow forecast; operator must NOT read farm financials. Admin/finance/super_admin RW; auditor RO; no operator access.
- `push_subscriptions` — endpoints + keys are replay-sensitive; self-only SELECT, self INSERT/DELETE.

**Non-sensitive tables (app-layer role checks suffice):**
`vehicles`, `projects`, `maintenance_schedules`, `maintenance_records`, `alert_events`, `company_settings`.

**FORCE ROW LEVEL SECURITY required on every sensitive table.** Drizzle migrations run as `jpr_migrator`, which becomes the table OWNER. Owners bypass RLS by default — `ENABLE ROW LEVEL SECURITY` alone is insufficient. Every sensitive table needs `ALTER TABLE … FORCE ROW LEVEL SECURITY`, not just `audit_logs`. Make this part of the policy block template.

#### Schema migration

`daily_logs.operator_id` references `staff_profiles.id`, NOT `users.id`. The session UUID we set via `withRLS()` is `users.id`. Operator policies must join through `staff_profiles.user_id` — either via subquery in the policy or a denormalized `staff_profiles.user_id`-resolved cache. Policy below uses subquery; if perf becomes an issue, materialize a function `app_operator_staff_id()` that resolves `users.id → staff_profiles.id` and is marked `STABLE`.

```sql
-- Enable + FORCE RLS on each sensitive table (idempotent).
-- FORCE is required because jpr_migrator owns the tables; owners bypass RLS by default.
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs FORCE  ROW LEVEL SECURITY;
ALTER TABLE expenses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses   FORCE  ROW LEVEL SECURITY;
-- (... repeat ENABLE + FORCE for every sensitive table listed above)

-- Helper functions read PG session variables set by withRLS()
CREATE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid $$;
CREATE FUNCTION app_user_role() RETURNS text LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.current_user_role', true), '') $$;
CREATE FUNCTION app_operator_staff_id() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT id FROM staff_profiles WHERE user_id = app_user_id() $$;

-- daily_logs policies (operator scoped via staff_profiles.user_id)
CREATE POLICY daily_logs_operator_select ON daily_logs FOR SELECT
  USING (app_user_role() = 'operator' AND operator_id = app_operator_staff_id());
CREATE POLICY daily_logs_operator_insert ON daily_logs FOR INSERT
  WITH CHECK (app_user_role() = 'operator' AND operator_id = app_operator_staff_id());
CREATE POLICY daily_logs_operator_update ON daily_logs FOR UPDATE
  USING (app_user_role() = 'operator' AND operator_id = app_operator_staff_id())
  WITH CHECK (operator_id = app_operator_staff_id());
CREATE POLICY daily_logs_admin_all ON daily_logs FOR ALL
  USING (app_user_role() IN ('admin','super_admin','auditor','finance'))
  WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));  -- auditor read-only

-- expenses: scoped by created_by (= users.id) AND staff_id (= staff_profiles.id).
-- Both checks required: created_by alone lets an operator pin staff_id to another operator
-- and mis-attribute the cost.
CREATE POLICY expenses_operator_select ON expenses FOR SELECT
  USING (app_user_role() = 'operator' AND created_by = app_user_id());
CREATE POLICY expenses_operator_insert ON expenses FOR INSERT
  WITH CHECK (
    app_user_role() = 'operator'
    AND created_by = app_user_id()
    AND staff_id   = app_operator_staff_id()
  );
CREATE POLICY expenses_admin_all ON expenses FOR ALL
  USING (app_user_role() IN ('admin','super_admin','auditor','finance'))
  WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));

-- invoices/invoice_items/invoice_payments/quotes/quote_items/loans/loan_payments/
-- receivables/receivable_payments/cash_transactions: admin/super_admin/finance RW; auditor RO.
-- No operator access.

-- payroll_periods/staff_leaves/staff_schedules: operator SELECT own row only;
-- admin/super_admin/finance RW; auditor RO.

-- staff_profiles: operator SELECT own row only; admin/super_admin/finance RW; auditor RO.
CREATE POLICY staff_profiles_operator_select ON staff_profiles FOR SELECT
  USING (app_user_role() = 'operator' AND user_id = app_user_id());
CREATE POLICY staff_profiles_admin_all ON staff_profiles FOR ALL
  USING (app_user_role() IN ('admin','super_admin','auditor','finance'))
  WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));

-- vehicle_assignments: operator SELECT own assignments (join via staff_profiles);
-- admin/super_admin/finance RW; auditor RO.
CREATE POLICY vehicle_assignments_operator_select ON vehicle_assignments FOR SELECT
  USING (app_user_role() = 'operator' AND staff_id = app_operator_staff_id());
CREATE POLICY vehicle_assignments_admin_all ON vehicle_assignments FOR ALL
  USING (app_user_role() IN ('admin','super_admin','auditor','finance'))
  WITH CHECK (app_user_role() IN ('admin','super_admin','finance'));

-- paddy_farms/farm_cycles/farm_inputs/farm_harvests: admin/super_admin/finance RW;
-- auditor RO; no operator access. Same shape as invoices.

-- push_subscriptions: self-only — user can SELECT/INSERT/DELETE own row;
-- admin/super_admin may DELETE for revocation; no auditor read (avoids leaking endpoints).
CREATE POLICY push_subscriptions_self ON push_subscriptions FOR ALL
  USING (user_id = app_user_id())
  WITH CHECK (user_id = app_user_id());
CREATE POLICY push_subscriptions_admin_revoke ON push_subscriptions FOR DELETE
  USING (app_user_role() IN ('admin','super_admin'));

-- users: super_admin full RW; admin RW non-super rows; operator/auditor/finance self only.
CREATE POLICY users_self_select ON users FOR SELECT
  USING (id = app_user_id() OR app_user_role() IN ('admin','super_admin','auditor','finance'));
CREATE POLICY users_self_update ON users FOR UPDATE
  USING (id = app_user_id())
  WITH CHECK (id = app_user_id());                       -- locale, password change
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

-- audit_logs: append-only. Already FORCE-d above.
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (app_user_role() IN ('super_admin','auditor'));
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (true);  -- any authenticated session can append
-- No UPDATE or DELETE policies → no role can modify history.
```

Each sensitive table needs explicit per-role policies as above. Reviewer to enumerate every sensitive table and produce its policy block before merge — "follow the same shape" is not enough.

#### Postgres role configuration

Two roles required:

| Role | Properties | Used by |
|------|------------|---------|
| `jpr_app` | `NOSUPERUSER NOBYPASSRLS LOGIN` | runtime app pool ([src/db/index.ts](../../../src/db/index.ts)) |
| `jpr_migrator` | `NOSUPERUSER BYPASSRLS LOGIN` | `npm run db:migrate`, `npm run db:push`, seed scripts |

Add `MIGRATION_DATABASE_URL` env var. `drizzle.config.ts` must read `MIGRATION_DATABASE_URL` (fallback to `DATABASE_URL` only outside production). Document the split in `.env.example` and CLAUDE.md.

#### RLS fail-closed posture

Once RLS is enabled, any query running without `app.current_user_id` and `app.current_user_role` set returns zero rows (policies evaluate role IS NULL → false). This is intentional — but means *every existing call site must migrate to `withRLS()` in PR 2.0a*, or the relevant feature breaks silently. See "Action audit" below.

#### Code changes

- `withRLS()` signature is `(userId: string, role: string, fn: (tx) => Promise<T>)` ([src/db/index.ts:25-35](../../../src/db/index.ts#L25-L35)). Already uses `SET LOCAL` inside `db.transaction()` — confirmed safe for pool reuse.
- Every action that reads/writes a sensitive table must use the transaction `tx` argument, not the module-level `db`. Mixed use is a regression source.
- Add an integration test suite (`tests/rls/*.test.ts`) that boots a Postgres test instance, opens a connection per role, and asserts policy enforcement: operator sees only own logs; finance can RW invoices; auditor read-only across all sensitive tables; super_admin full access; cross-role read attempts return 0 rows.

#### Action audit (mandatory before PR 2.0a opens)

Produce a checklist file `docs/wave2/action-audit.md` listing every server action and API route that touches a sensitive table. For each, mark current state (`db` direct vs `withRLS`) and target state. PR 2.0a must convert every row. Files to enumerate (non-exhaustive — verify with `grep -l "from \"@/db\"" src/lib/actions src/app/api`):

- [src/lib/actions/admin-logs.ts](../../../src/lib/actions/admin-logs.ts), [daily-logs.ts](../../../src/lib/actions/daily-logs.ts), [expenses.ts](../../../src/lib/actions/expenses.ts), [invoices.ts](../../../src/lib/actions/invoices.ts), [invoice-generation.ts](../../../src/lib/actions/invoice-generation.ts), [quotes.ts](../../../src/lib/actions/quotes.ts), [finance.ts](../../../src/lib/actions/finance.ts), [reports.ts](../../../src/lib/actions/reports.ts), [payroll.ts](../../../src/lib/actions/payroll.ts), [alerts.ts](../../../src/lib/actions/alerts.ts), [auth.ts](../../../src/lib/actions/auth.ts).
- API routes under [src/app/api/](../../../src/app/api/) — especially `/api/logs/sync`, `/api/expenses/sync`, `/api/auth/*`.

Add an ESLint rule (custom or via `no-restricted-syntax`) that flags `db.select`, `db.insert`, `db.update`, `db.delete`, `db.transaction`, `db.execute`, `db.query` outside `src/db/`, the system-context module, and migration/seed scripts. `db.execute` and `db.query` are the raw-SQL escape hatches and must be banned alongside the query builder methods — otherwise raw SQL silently bypasses the RLS conversion (see [src/lib/actions/invoice-generation.ts:22-25](../../../src/lib/actions/invoice-generation.ts#L22-L25) for an existing call site). CI must fail on violation. Without this, RLS adoption silently rots over time.

#### Edge cases

- **Background jobs / cron** (alert scanner, payroll runner, notification dispatchers): create a seed user `system@internal` in `users` table with role `super_admin` and a stable UUID stored in `SYSTEM_USER_ID` env var. All cron entry points wrap in `withRLS(SYSTEM_USER_ID, 'super_admin', …)`. Audit log entries from these paths get a synthetic `actor_user_id = SYSTEM_USER_ID` so the source is identifiable. *Do not* fabricate UUIDs at runtime — the cast `::uuid` will fail and the cast occurs lazily inside policies, surfacing as a runtime error not a security failure.
  - **`system@internal` MUST be non-loginable.** Set `passwordHash` to a literal sentinel (`'!disabled'`) that bcryptjs verify cannot match, and add an explicit guard in [src/lib/actions/auth.ts](../../../src/lib/actions/auth.ts) login that rejects this email before hash compare. Otherwise anyone discovering the seed credentials via env/DB dump gets cookie-auth super_admin.
- **Sync endpoints** at `/api/logs/sync` and `/api/expenses/sync`: caller is the authenticated operator. Wrap the **entire handler body** (idempotency `SELECT … WHERE client_device_id = …`, the `staff_profiles` lookup, AND the insert) in a single `withRLS(session.userId, session.role, …)` transaction. Wrapping only the insert leaves the idempotency `SELECT` running with no session vars set — operator policies evaluate to false → 0 rows → handler re-inserts → duplicate row, breaking offline-sync idempotency. Reject if session missing. Operator SELECT policies on `daily_logs` and `expenses` already cover device-id lookups since the rows belong to the operator.
- **Drizzle migrations and seed scripts**: run via `MIGRATION_DATABASE_URL` (role `jpr_migrator`, BYPASSRLS). Update `package.json` scripts and `src/db/seed.ts` to read this var.
- **`db.execute(sql\`…FOR UPDATE\`)`** patterns ([src/lib/actions/invoice-generation.ts:22-25](../../../src/lib/actions/invoice-generation.ts#L22-L25)): raw SQL still runs under RLS — confirm the `tx` is the one returned by `withRLS`, not module-level `db`.
- **App-boot RLS posture assertion.** On server startup (e.g., a one-time check in [src/db/index.ts](../../../src/db/index.ts) or a dedicated `assertRlsPosture()` called from instrumentation), open a connection under the runtime role and run:
  ```sql
  SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user;
  ```
  If either is true, throw and refuse to start. Catches the failure mode where a developer kept the legacy superuser DSN and RLS silently no-ops in production. Also run a fail-closed probe: `SELECT count(*) FROM daily_logs` without `withRLS()` — must return 0; abort boot otherwise.

### 2.2 Finance Role + Route Group

#### Schema migration

```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance';
```

**Migration ordering constraint:** `ALTER TYPE … ADD VALUE` cannot be used in the same transaction in which the value was added (Postgres). Place this in its OWN migration file, separate from any migration that references `'finance'` in a policy or default. Order: (a) add enum value → commit → (b) policies referencing it.

`userRoleEnum` in [src/db/schema/enums.ts:18-23](../../../src/db/schema/enums.ts#L18-L23) updated to include `'finance'`.

Same constraint applies later to `alert_type` enum additions in §3.1.

#### Middleware

[src/middleware.ts:17-22](../../../src/middleware.ts#L17-L22) `roleRoutes` map updated:

```ts
const roleRoutes: Record<string, string[]> = {
  super_admin: ["/owner", "/admin", "/operator", "/auditor", "/finance"],
  admin: ["/admin", "/operator", "/finance"],
  operator: ["/operator"],
  auditor: ["/auditor"],
  finance: ["/finance"],
};
```

[src/middleware.ts:88-100](../../../src/middleware.ts#L88-L100) `getRoleDashboard` adds `case "finance": return "/finance"`. Login redirect for fresh `finance` users lands on `/finance`.

#### Pages

New route group `src/app/[locale]/(dashboard)/finance/`:

- `/finance/` — dashboard: outstanding receivables, pending invoices, cash position summary
- `/finance/invoices/` — list + draft creation (Phase 2.5)
- `/finance/invoices/[id]/` — detail + actions
- `/finance/quotes/` — list + create
- `/finance/quotes/[id]/` — detail
- `/finance/loans/` — list (mirrors existing owner finance pages)
- `/finance/receivables/` — list
- `/finance/cash-transactions/` — ledger view
- `/finance/notifications/` — push subscription page (mirrors other roles)
- `/finance/password/` — password change

Pages reuse existing components from `src/components/invoices/`, `src/components/quotes/`, `src/components/finance/`. No component duplication.

#### i18n keys

New keys under `nav.finance`, `pages.finance.*` in `messages/{ta,si,en}.json`.

### 2.3 Remove Unused Deps

- Drop `zustand` (currently `^5.0.3`) and `@tanstack/react-query` (currently `^5.72.2`) from `package.json` `dependencies`.
- `npm install` to refresh lockfile.
- No source changes needed (zero imports verified by audit).
- CI: run `npm run lint && npm run build` to confirm no implicit usage.

---

## 3. Wave 2.1 — Feature Work

Ships after Wave 2.0 has been in production for at least one full daily-digest cycle. Three sub-batches.

### 3.1 Moonlighting Detection (Phase 2.1)

#### Schema migration

```
projects:
  + site_center_lat        NUMERIC(10,7)
  + site_center_lng        NUMERIC(10,7)
  + site_radius_meters     INTEGER          -- null = no geofence (default for legacy)

paddy_farms:
  + site_center_lat        NUMERIC(10,7)
  + site_center_lng        NUMERIC(10,7)
  + site_radius_meters     INTEGER

company_settings:
  + work_window_start      TIME             -- default '06:00'
  + work_window_end        TIME             -- default '18:00'
  + business_timezone      TEXT NOT NULL DEFAULT 'Asia/Colombo'

staff_profiles:
  + work_window_start      TIME             -- override company default, nullable
  + work_window_end        TIME             -- nullable

daily_logs:
  + farm_id  ADD CONSTRAINT daily_logs_farm_id_fk FOREIGN KEY (farm_id) REFERENCES paddy_farms(id)
expenses:
  + farm_id  ADD CONSTRAINT expenses_farm_id_fk FOREIGN KEY (farm_id) REFERENCES paddy_farms(id)
  -- both currently lack FK; comments at src/db/schema/daily-logs.ts:24 and expenses.ts:22
  -- say "added in Phase 6". Add now to support farm-scoped joins for cash flow + moonlighting.

alert_type:  -- enum, NOT a column called "kind". Real schema: src/db/schema/enums.ts:138-142
  ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'geofence_violation';
  ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'off_hours';
  -- Each ADD VALUE in its own migration (see §2.2 ordering note).
```

Persistence target is the existing `alert_events` table (NOT `alerts` — table doesn't exist) at [src/db/schema/alert-events.ts](../../../src/db/schema/alert-events.ts). Column is `type`, not `kind`. The current uniqueness key on `alert_events` is `(type, vehicle_id, detected_date) WHERE resolved_at IS NULL` ([src/lib/actions/alerts.ts:86](../../../src/lib/actions/alerts.ts#L86)) — must be widened to include the source `daily_log_id` (or operator+date) so two distinct violations on the same vehicle+day don't collapse. Add `source_log_id UUID` column on `alert_events` and include it in the conflict key.

Center-and-radius chosen over GeoJSON polygon: simpler arithmetic (haversine), no PostGIS dependency, sufficient for Sri Lankan paddy fields. Polygon support deferred.

#### Detection logic

New module `src/lib/detection/moonlighting.ts`:

- `detectGeofenceViolations(sinceTs)` — for each `daily_logs` row with at least one of (`gps_lat_start`, `gps_lat_end`) populated and an assigned `project_id` or `farm_id`, compute haversine distance from BOTH endpoints to the assigned site center. Violation if either endpoint distance > `site_radius_meters`. Using only `start` would miss operators who depart mid-shift. Severity: `warning` if > radius but < 2× radius; `critical` if ≥ 2× radius.
- `detectOffHoursViolations(sinceTs)` — convert `daily_logs.start_time` / `end_time` (`timestamp WITHOUT TIME ZONE`, stored in business TZ today but ambiguous) to the configured `business_timezone` and compare the time-of-day component against the operator's effective work window (staff override → company default). Severity: `critical` (off-hours is binary — no warning band).

**Timezone correctness:** `daily_logs.start_time` / `end_time` columns are `timestamp` without timezone. Assume the existing convention (whatever it is) and document it. If insertion code stores UTC, convert to `business_timezone` before comparing to the `TIME` window. If it stores local time, compare directly. Add a one-line invariant assertion in the detection module so a future schema change to `timestamptz` doesn't silently break detection. Either way, do not store work windows as TEXT — use `TIME` so DB-level comparisons work.

#### Pipeline integration

Hook into existing `scanAndPersistAlerts()` at [src/lib/actions/alerts.ts:32](../../../src/lib/actions/alerts.ts#L32). The new alert types must be added to the `scannedTypes` set at line 93-96 so unmatched events get auto-resolved. Daily-digest push fans out from `alert_events` already; no new notification path needed.

#### UI

New page `/auditor/moonlighting/`:
- Filter: date range, operator, vehicle, alert kind
- Table: date, operator, vehicle, log GPS, assigned site, distance/window-delta, alert severity, link to log detail
- Map preview (reuse `FleetMapClient`): renders log point + assigned site center + radius circle

Existing alerts list pages get `geofence_violation` and `off_hours` rendered alongside idling/fuel/maintenance alerts.

### 3.2 Cash Flow Forecasting (Phase 2.2)

Two views, both new actions in `src/lib/actions/cash-flow.ts`.

#### Farm-level forecast

`getFarmCashFlow(farmId)` — for each active farm cycle:

- **Invested to date:**
  - `SUM(farm_inputs.total_cost) WHERE cycle_id = :current`
  - Plus farm-attributed daily-log costs: for each `daily_logs` row with `farm_id = :farmId` (FK now exists per §3.1) and the cycle's date range, allocate `(fuel_used_liters × current_fuel_price) + operator_pay_share`. `current_fuel_price` is read from `company_settings.diesel_price_per_liter` (new column, default 350 LKR; admin-editable). Operator pay share is computed from the day's `payroll_periods` row pro-rated by hours.
  - If both `project_id` and `farm_id` are set on a log, allocate to whichever the operator's assignment indicates (look up `vehicle_assignments` for the day); if both, split 50/50 and emit a `low_confidence` flag for the forecast.
- **Projected remaining cost:** average per-stage cost from prior 3 completed cycles on the same farm; fallback to company-wide average if < 3 cycles.
- **Projected revenue:** `area_acres × avg_yield_kg_per_acre × avg_price_per_kg` from prior 3 harvests (farm-specific, then company-wide fallback).
- **Harvest ETA:** cycle `start_date` + median cycle duration from prior cycles.
- **Confidence:** badge `low` if any of (< 3 prior cycles, < 3 prior harvests, fuel price stale > 30 days).

Display on existing farm detail page as a card: "Invested: X / Projected Cost: Y / Projected Revenue: Z / Net: W / Harvest ETA: date / Confidence: low|normal".

`company_settings` migration adds:
```
+ diesel_price_per_liter   NUMERIC(8,2)   -- LKR, used for fuel cost allocation
+ diesel_price_updated_at  TIMESTAMPTZ
```

#### Business-wide 90-day forecast

`getBusinessCashFlow(days = 90)` — bucket by week (day/month configurable):

- **Inflow per bucket:**
  - `receivables` with `due_date` in bucket and `status IN ('pending','partial','overdue')`. Use `outstanding_balance` not `total_due` (already partial-paid).
  - Projected harvest revenue from active farm cycles whose harvest ETA falls in bucket.
  - Projected invoice issuance from in-progress projects: sum of un-invoiced line items via `buildInvoiceLineItems` over `daily_logs WHERE invoiced_at IS NULL` (column added in §3.5).
- **Outflow per bucket:**
  - **Loan obligations:** `loan_payments` table only records *historical* payments — it has no `due_date` ([src/db/schema/finance.ts:52-65](../../../src/db/schema/finance.ts#L52-L65)). Future obligations must be derived from `loans` (`emi_amount`, `start_date`, `term_months`, `interest_type`). Spec adds a *derived* schedule view (no new table for now):
    ```sql
    CREATE VIEW loan_payment_schedule AS
      SELECT id AS loan_id, emi_amount,
             generate_series(start_date, start_date + (term_months || ' months')::interval, '1 month') AS due_date
      FROM loans WHERE status = 'active';
    ```
    Forecast subtracts already-recorded `loan_payments` for matched months. (If a real schedule with reducing-balance amortization is needed, defer to a Wave 3 `loan_schedule` table.)
  - **Recurring expenses:** rolling 3-month average of `cash_transactions` with `transaction_type IN ('expense','lease_payment','debt_repayment')`.
  - **Scheduled maintenance:** estimated cost per overdue/due-soon row in `maintenance_schedules` (use `estimated_cost` if present; else last-actual-cost from `maintenance_records` for the same vehicle+type).

- **Cash balance convention:** `cash_transactions.amount` is unsigned; direction comes from `transaction_type` ([src/db/schema/enums.ts:127-136](../../../src/db/schema/enums.ts#L127-L136)). Define explicit sign mapping in the action:
  ```
  positive (inflow):  income, repayment_received, borrowing_in
  negative (outflow): expense, loan_payment, lease_payment, lending_out, debt_repayment
  ```
  Cumulative balance = sum of signed amounts up to bucket start, then bucket net added.

- **Net per bucket:** inflow − outflow. **Cumulative balance:** running sum starting from current `cash_transactions` balance.

Owner dashboard widget: line chart (Inflow / Outflow / Cumulative Net) + table of upcoming dated events. Finance dashboard gets the same widget; admin dashboard does not.

### 3.3 Quote Historical Pricing (Phase 2.3)

#### New action

`getSimilarProjects({ vehicleType, sizeMetric, sizeValue, tolerance = 0.2 })`:

- `projects` has no `primary_vehicle` column. Derive the project's dominant vehicle by joining through `daily_logs`: for each candidate project, the dominant vehicle is the one with the most logged units (hours/acres/km/tasks) for that project. Filter to projects whose dominant vehicle's `vehicle_type` (via `vehicles` join) matches `vehicleType`. A project may surface for multiple vehicle types if usage is mixed; `getSimilarProjects` queries one vehicleType at a time so this is fine.
- Implementation note: a single SQL CTE that aggregates `SUM(units) GROUP BY project_id, vehicle_id` then `DISTINCT ON (project_id) ORDER BY units DESC` yields one dominant-vehicle row per project. Join to `vehicles` for type filter.
- `sizeMetric` ∈ {`hours`, `acres`, `km`, `tasks`} based on the dominant vehicle's `billing_model`.
- `sizeValue × (1 ± tolerance)` defines range; returns top N (default 5) ordered by recency.
- For `tasks` (integer counts where `sizeValue ≤ 5`), use exact match instead of percent tolerance — 20% of 2 tasks rounds to 0 and matches everything. Rule: if `sizeMetric = 'tasks' AND sizeValue ≤ 5`, match `WHERE tasks = sizeValue`.
- For each match, computes:
  - **Revenue**: `SUM(invoice_items.amount)` joined through `invoices.project_id`.
  - **Cost**: `SUM(expenses.amount WHERE project_id = :p)` + operator pay share for the project's daily logs (look up `payroll_periods` for project-attributed log days, pro-rate by log hours / period hours) + fuel cost (`SUM(daily_logs.fuel_used_liters) × diesel_price_per_liter` from `company_settings`).
  - **Blended rate**: revenue / billable units (units from `daily_logs` summed by billing model).
  - **Margin%**: `(revenue − cost) / revenue`. If revenue = 0, return null margin (don't divide by zero).
- Quote action runs under finance/admin role — RLS allows full project read.

#### UI in quote draft form

- On vehicle/billing-model selection, fire `getSimilarProjects`.
- Auto-fill `ratePerUnit` field with average of returned matches.
- Side panel "Similar projects" lists each match: name, period, units, rate, margin%, "Use this rate" button.
- Empty state (< 2 matches): fallback to `vehicles.ratePerHour` etc., panel shows "No similar history yet — using vehicle default".

No schema change; pure read query + UI.

### 3.4 Engine-Hour Admin Adjustment (Phase 2.4)

Single audited adjustment action with a `kind` discriminator — splitting into two mechanisms (one free-edit, one super_admin-only) is fragile: free-edit "mobilization" can be abused as de facto unrestricted hour edit. One gated entry point with a clear intent label is better.

#### Schema migration

```
hour_adjustment_kind:  CREATE TYPE AS ENUM ('mobilization', 'correction')

daily_logs:
  + mobilization_hours_adjustment NUMERIC(6,2) NOT NULL DEFAULT 0
    -- additive billable hours that don't mutate raw start/end engine hours

hour_adjustments:  -- new table; full audit trail beyond audit_logs.before/after
  id                  UUID PK
  daily_log_id        UUID NOT NULL FK daily_logs(id)
  kind                hour_adjustment_kind NOT NULL
  before_start_hours  NUMERIC(10,1)
  before_end_hours    NUMERIC(10,1)
  after_start_hours   NUMERIC(10,1)
  after_end_hours     NUMERIC(10,1)
  mobilization_delta  NUMERIC(6,2)        -- nonzero only for kind='mobilization'
  reason              TEXT NOT NULL CHECK (length(reason) >= 10)
  actor_user_id       UUID NOT NULL FK users(id)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```

Append-only. RLS: super_admin/auditor SELECT; super_admin INSERT for kind='correction'; admin/super_admin/finance INSERT for kind='mobilization'.

#### Action `adjustHours`

```ts
adjustHours({
  logId: string,
  kind: 'mobilization' | 'correction',
  reason: string,                // min 10 chars
  // for kind='mobilization':
  mobilizationDelta?: number,    // additive; replaces existing if provided
  // for kind='correction':
  newStartHours?: string,
  newEndHours?: string,
})
```

- `kind='mobilization'`: writes `mobilization_hours_adjustment` (NOT raw start/end). Allowed for `admin | super_admin | finance`.
- `kind='correction'`: mutates `start_engine_hours` / `end_engine_hours`. Allowed for `super_admin` only.
- Both write a row to `hour_adjustments` and a `logAudit` entry. Operator pay must be recomputed for `correction` (raw hours change) but NOT for `mobilization` (client-side only). The transaction must reset any finalized payroll period covering the log to `draft`, mirroring the pattern in [src/lib/actions/admin-logs.ts:111-140](../../../src/lib/actions/admin-logs.ts#L111-L140).

#### Invoice generation

[src/lib/actions/invoice-generation.ts](../../../src/lib/actions/invoice-generation.ts) and `buildInvoiceLineItems` sum `(end_engine_hours − start_engine_hours) + mobilization_hours_adjustment` when computing billable hours. Add a unit test that asserts: (a) raw hours used for payroll, (b) raw + mobilization used for invoice, (c) correction kind affects both.

#### EDITABLE_FIELDS

`mobilization_hours_adjustment` is NOT added to the `EDITABLE_FIELDS` whitelist at [src/lib/actions/admin-logs.ts:74](../../../src/lib/actions/admin-logs.ts#L74). It is editable only via `adjustHours({kind:'mobilization'})` so the audit trail captures intent + reason.

#### Auditor surface

`/auditor/hour-adjustments/` lists all rows from `hour_adjustments` with diff (before/after), kind badge, actor, reason, link to log detail.

### 3.5 Invoice Draft From Pending Logs (Phase 2.5)

Currently `generateFromProject` aggregates and persists in one call. Wave 2.1 splits into a draft step.

#### Schema migration

```
daily_logs:
  + invoicedAt        TIMESTAMPTZ                -- null = pending
  + invoiceItemId     UUID REFERENCES invoice_items(id) ON DELETE SET NULL
```

`invoicedAt` and `invoiceItemId` set when a log is consumed by an invoice. Used to:
- Prevent double-billing (only logs with `invoicedAt IS NULL` enter new drafts).
- Allow uninvoicing (invoice deletion sets both back to null, freeing logs to be redrafted).

#### New action

`getPendingLogsForInvoice({ projectId?, clientId?, dateFrom?, dateTo? })`:

- Returns un-invoiced logs grouped by vehicle, with pre-computed line item via `buildInvoiceLineItems`.
- Includes vehicle billing model so UI can label units correctly (hours / acres / km / tasks).
- Includes mobilization fee from project (if `mobilizationBilled = false`) as a synthetic line.

#### Page `/finance/invoices/new` (also `/admin/invoices/new`)

Editable draft table:

| Vehicle | Date | Units | Rate | Line Amount | Include? |
|---------|------|-------|------|-------------|----------|
| Excavator EX-01 | 2026-04-22 | 8.5 hr | 5,000 | 42,500 | ☑ |
| Tractor T-03 | 2026-04-23 | 1 task | 8,000 | 8,000 | ☑ |
| Lorry LR-02 | 2026-04-24 | 120 km | 80 | 9,600 | ☑ |
| Mobilization | — | — | — | 15,000 | ☑ |

Editable: units, rate, line amount (recomputed live), include/exclude checkbox. "Add manual line" for discounts, custom items.

"Create Invoice" button calls `createInvoiceFromDraft({ projectId?, clientName, clientPhone?, lines, notes })`:
- Wrapped in a single transaction with row-locking to prevent two admins double-billing the same logs:
  ```sql
  SELECT id, invoiced_at FROM daily_logs WHERE id = ANY(:logIds) FOR UPDATE
  ```
  After lock, re-check `invoiced_at IS NULL` for every consumed log id. If any row already has `invoiced_at` set, abort with a "logs already invoiced; reload draft" error.
- Persists `invoices` and `invoice_items` (reuse `generateInvoiceNumber` from [src/lib/actions/invoices.ts:264](../../../src/lib/actions/invoices.ts#L264) — do NOT introduce a parallel numbering helper).
- Sets `invoiced_at = now()` and `invoice_item_id = …` on every consumed `daily_logs` row.
- Sets `projects.mobilization_billed = true` if mobilization line was included.
- Returns invoice id for redirect to detail page.

Authorization: `admin | super_admin | finance` only (operators cannot reach draft page; middleware enforces).

#### Backfill plan for `invoiced_at`

Existing logs already invoiced before this migration must be backfilled, otherwise they're eligible for re-billing and double-charge. Backfill query:

```sql
UPDATE daily_logs dl
SET invoiced_at = ii.created_at, invoice_item_id = ii.id
FROM invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
WHERE i.project_id = dl.project_id
  AND i.created_at >= dl.date
  AND ii.description ILIKE '%' || COALESCE((SELECT name FROM vehicles WHERE id = dl.vehicle_id), '') || '%'
  AND dl.invoiced_at IS NULL;
```

The match is fuzzy (description-based). Any unmatched logs remain `invoiced_at = NULL` AND get added to a one-shot `legacy_uninvoiced_logs` view that admins must explicitly mark "do-not-bill" or attach to an invoice before creating new drafts. Block `getPendingLogsForInvoice` from returning logs older than the migration date until they're cleared from the legacy view — prevents accidental re-billing of historical work.

#### Existing `generateFromProject`

Becomes a convenience that pre-loads the draft form with all pending logs for the project, then redirects to the draft page. The persist path moves entirely to `createInvoiceFromDraft`. Update [src/lib/actions/invoice-generation.ts:14](../../../src/lib/actions/invoice-generation.ts#L14) — current implementation persists in one call and must be split.

---

## 4. Sequencing and Rollout

### Wave 2.0 PR plan

Order matters because `ALTER TYPE … ADD VALUE` cannot share a transaction with code that uses the new value, and RLS policies must reference all roles that exist:

- **PR 2.0c (ships first, lowest risk):** Remove unused deps. Trivial.
- **PR 2.0b-pre:** Single migration: `ALTER TYPE user_role ADD VALUE 'finance'`. Ships and commits *before* anything references `'finance'`.
- **PR 2.0b:** Finance role middleware + route group skeleton + i18n keys. Pages reuse existing components. No DB policies yet.
- **PR 2.0a-pre:** Action audit checklist (`docs/wave2/action-audit.md`) + ESLint rule that flags direct `db.*` calls in action files. Fails CI if violations exist.
- **PR 2.0a:** RLS migration (helper functions, policies for every sensitive table including finance role) + conversion of every flagged action to `withRLS()` + integration test suite + new `MIGRATION_DATABASE_URL` and `SYSTEM_USER_ID` env wiring + seed `system@internal` user. Largest PR.

Wave 2.0 must bake in production for at least one full **payroll + invoicing cycle** — minimum 7 days — before Wave 2.1 starts. The 24h daily-digest window does not exercise month-end reports, payroll runs, or invoice generation. Monitor server logs for "permission denied" or unexpected zero-row results during the soak; both indicate missed `withRLS()` conversions.

### Wave 2.1 PR plan

- **PR 2.1a:** Moonlighting detection (geofence + off-hours) — schema, detection module, pipeline hook, auditor page.
- **PR 2.1b:** Cash flow forecasting — actions + farm card + dashboard widget.
- **PR 2.1c:** Quote historical pricing — action + form integration.
- **PR 2.1d:** Engine-hour adjustment — schema, action, UI hooks.
- **PR 2.1e:** Invoice draft — schema, action, draft page, redirect of `generateFromProject`.

PRs 2.1a–2.1e are independent and can land in any order or in parallel.

### Migration safety

All schema changes are additive (new columns nullable or defaulted; new enum values; new tables/policies). Backfill required for:
- `daily_logs.mobilization_hours_adjustment` defaults to 0 (zero behavior change).
- `daily_logs.invoiced_at` / `invoice_item_id` — backfilled per the fuzzy-match query in §3.5. Unmatched rows surface in `legacy_uninvoiced_logs` view for explicit admin disposition; `getPendingLogsForInvoice` ignores any log dated before the migration cutoff until cleared.
- `daily_logs.farm_id` and `expenses.farm_id` — gain FK constraints. Validate first that no orphaned `farm_id` values exist (any non-null `farm_id` not present in `paddy_farms.id`). Migration must include a pre-flight SELECT and abort if orphans found, with a manual cleanup runbook entry.

**Enum value migrations** (`user_role`, `alert_type`, new `hour_adjustment_kind`) each ship in their own dedicated migration that does nothing else, per the Postgres constraint that added enum values cannot be referenced in the same transaction.

### Risk and mitigation

| Risk | Mitigation |
|------|------------|
| RLS misconfigured → operators see admin data, or admins blocked from own data | Integration test per role per sensitive table. Staging smoke test before merge. |
| Table owner bypasses RLS → policies silently no-op for `jpr_migrator`-owned tables | `FORCE ROW LEVEL SECURITY` on every sensitive table, not just `audit_logs`. App-boot assertion verifies `current_user` lacks `BYPASSRLS`/`SUPERUSER`. |
| Sync handler idempotency check runs outside `withRLS()` → duplicate inserts after RLS enabled | Wrap entire sync handler body (lookup + insert) in one `withRLS()` transaction, not just the insert. Concurrency test in suite. |
| Action call site missed during 2.0a conversion → silent zero-row results in production | ESLint rule fails CI on direct `db.*` calls in action files (including `db.execute`/`db.query`); pre-merge action audit checklist; 7-day soak monitors. |
| `withRLS()` pool contamination | `SET LOCAL` already used at [src/db/index.ts:31-32](../../../src/db/index.ts#L31-L32); confirmed transaction-scoped. |
| Cron path bypass mis-implemented (synthetic UUID cast fails) | Seed `system@internal` user with stable UUID stored in `SYSTEM_USER_ID`; never fabricate at runtime. |
| `system@internal` super_admin abused via cookie auth | Set `passwordHash = '!disabled'`; explicit reject in login flow before bcrypt compare. |
| Migration role missing → `db:migrate` blocked by RLS | Add `MIGRATION_DATABASE_URL` env using `jpr_migrator` role with `BYPASSRLS`. Fails fast if env missing in non-dev. |
| Cash flow projections inaccurate with sparse history | "Low confidence" badge when < 3 prior cycles, < 3 prior harvests, or `diesel_price_updated_at` > 30 days old. |
| Geofence false positives near site boundary | Default `site_radius_meters`: 250m for projects, 500m for farms. Tunable per record. Both start *and* end GPS checked. |
| Off-hours TZ misalignment | Detection module asserts the `daily_logs.start_time` storage convention at module load; fails loudly if assumption breaks. |
| Concurrent invoice draft submissions double-bill same logs | `SELECT … FOR UPDATE` on candidate `daily_logs` ids inside `createInvoiceFromDraft` transaction; re-check `invoiced_at IS NULL` after lock. |
| Mobilization adjustment double-counted into operator pay | Single `adjustHours` action with `kind` discriminator; unit test asserts payroll uses raw hours only and invoice uses raw + mobilization. |
| Loan forecast wrong because schedule is derived | View-based schedule is approximate (flat monthly). Document limitation; defer reducing-balance amortization to Wave 3. |

### Testing strategy

- **RLS:** integration tests per role per sensitive table (operator, admin, finance, auditor, super_admin). Positive (allowed) and negative (denied) cases. Specifically:
  - Operator session: SELECT on `daily_logs` returns only own rows; INSERT with mismatched `operator_id` fails policy check; UPDATE another operator's log returns zero rows affected.
  - Auditor: SELECT all sensitive tables OK; UPDATE/INSERT on any returns 0 rows / error.
  - Cron path: `withRLS(SYSTEM_USER_ID, 'super_admin', …)` succeeds across all sensitive tables.
  - Unwrapped query (deliberately `db` not `tx`) returns 0 rows on every sensitive table — verifies fail-closed posture.
  - Sync handler concurrency: replay a single offline log/expense payload twice in parallel under the operator session and assert the handler returns the same `id` both times (idempotency works under RLS).
  - `passwordHash = '!disabled'` rejected by login before bcrypt compare.
  - App-boot assertion: spin up app pointed at a `BYPASSRLS` role, expect startup to throw.
  - `staff_profiles`, `vehicle_assignments`, `paddy_farms`, `farm_*`, `push_subscriptions`, `staff_leaves`, `staff_schedules`: operator role denied (or self-only where applicable); finance role permitted per matrix.
  - `users` UPDATE policy: operator can change own `locale`/`passwordHash`; cannot escalate own `role`; admin cannot edit super_admin row.
- **Moonlighting:** unit tests for haversine, work-window comparison (covering DST-free Asia/Colombo TZ), fixture `daily_logs` with known violations on both start and end GPS.
- **Cash flow:** snapshot tests on synthetic farm/cycle/invoice data; explicit test for sign convention on `cash_transactions` cumulative balance.
- **Quote pricing:** unit test for `getSimilarProjects` including the `tasks ≤ 5` exact-match branch and zero-revenue null-margin case.
- **Hour adjustments:** test that `kind='mobilization'` does NOT alter raw hours; `kind='correction'` resets finalized payroll to draft; both append `hour_adjustments` row + `audit_logs` entry.
- **Invoice draft:** end-to-end test (create draft → exclude one row → submit → verify invoice persists + logs flagged) PLUS a concurrency test: two simulated sessions submit drafts containing overlapping logs; second submission errors with "logs already invoiced".

---

## 5. Open Questions

None blocking. Accepted defaults:

- Geofence shape: center + radius (polygon deferred to Wave 3).
- Cash flow horizon: 90 days (configurable later).
- Quote tolerance band: ±20% with exact-match fallback for small task counts.
- Quote project matching: derived dominant-vehicle via daily-log unit aggregation (no new `projects.primary_vehicle` column).
- Hour adjustments: single `adjustHours` action with `kind` discriminator; mobilization editable by admin/finance, correction super_admin only. Audit + reason on every change.
- Finance role default landing: `/finance`.
- `daily_logs.start_time` / `end_time` TZ assumption: documented in detection module with runtime invariant assertion; if assumption fails, deploy halts loudly rather than detecting wrong.

To resolve before PR 2.0a opens (not blocking spec sign-off, blocking implementation):

- Confirm current `daily_logs.start_time` insertion convention (UTC vs local). Read [src/lib/actions/daily-logs.ts](../../../src/lib/actions/daily-logs.ts) and `/api/logs/sync` handler.
- Inventory every direct `db.*` call across [src/lib/actions/](../../../src/lib/actions/) and [src/app/api/](../../../src/app/api/) into the action audit checklist.
- Validate no orphaned `farm_id` values in `daily_logs` or `expenses`.
