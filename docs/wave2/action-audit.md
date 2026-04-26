# Wave 2.0 Action Audit

Source: spec §2.1 "Action audit (mandatory before PR 2.0a opens)".

Every row below must be `withRLS()` after PR 2.0a merges. PR 2.0a is not
mergeable until every "current" column reads `withRLS` and every status reads "done".

## Server actions (src/lib/actions/)

| File | Touches sensitive table? | Current | Target | Status |
|------|--------------------------|---------|--------|--------|
| admin-logs.ts | yes (daily_logs, payroll_periods, audit_logs) | db | withRLS | pending |
| alerts.ts | yes (alert_events, push_subscriptions, vehicles via JOIN to daily_logs) | db | withRLS | pending |
| auth.ts | yes (users, audit_logs) | db | withRLS | pending |
| company-settings.ts | no | db | db (non-sensitive) | n/a |
| daily-logs.ts | yes (daily_logs, staff_profiles JOIN) | db | withRLS | pending |
| expenses.ts | yes (expenses, staff_profiles JOIN) | db | withRLS | pending |
| farms.ts | yes (paddy_farms, farm_*) | db | withRLS | pending |
| finance.ts | yes (loans, loan_payments, receivables, receivable_payments, cash_transactions) | db | withRLS | pending |
| invoice-generation.ts | yes (invoices, invoice_items, daily_logs) | db | withRLS | pending |
| invoices.ts | yes (invoices, invoice_items, invoice_payments) | db | withRLS | pending |
| leaves.ts | yes (staff_leaves) | db | withRLS | pending |
| maintenance.ts | no | db | db (non-sensitive) | n/a |
| payroll.ts | yes (payroll_periods, daily_logs, staff_profiles) | db | withRLS | pending |
| projects.ts | no | db | db (non-sensitive) | n/a |
| quotes.ts | yes (quotes, quote_items) | db | withRLS | pending |
| reports.ts | yes (reads daily_logs, expenses, payroll_periods, invoices) | db | withRLS | pending |
| schedules.ts | yes (staff_schedules) | db | withRLS | pending |
| staff.ts | yes (staff_profiles) | db | withRLS | pending |
| vehicle-assignments.ts | yes (vehicle_assignments, staff_profiles JOIN) | db | withRLS | pending |
| vehicles.ts | no | db | db (non-sensitive) | n/a |

## API routes (src/app/api/)

| File | Touches sensitive? | Current | Target | Status |
|------|--------------------|---------|--------|--------|
| auth/login/route.ts | yes (users) | db | withRLS (system context for pre-auth lookup) | pending |
| auth/me/route.ts | yes (users) | db | withRLS | pending |
| auth/locale/route.ts | yes (users) | db | withRLS | pending |
| logs/sync/route.ts | yes (daily_logs, staff_profiles JOIN) | db | withRLS (entire handler body in one tx) | pending |
| expenses/sync/route.ts | yes (expenses, staff_profiles JOIN) | db | withRLS (entire handler body in one tx) | pending |
| push/subscribe/route.ts | yes (push_subscriptions) | db | withRLS | pending |
| push/unsubscribe/route.ts | yes (push_subscriptions) | db | withRLS | pending |
| health/route.ts | no — `db.execute(SELECT 1)` connectivity probe | db | db (non-sensitive; ESLint carve-out) | n/a |
| cron/alerts/route.ts | yes (alert_events, push_subscriptions, vehicles, daily_logs) | — | withSystemRLS | pending |
| upload/route.ts | no — pre-signed S3 URL only, no DB call | — | — | n/a |
| invoice-pdf/upload/route.ts | no — uploads PDF to S3 only, no DB call | — | — | n/a |

## Notes per file

- **auth/login/route.ts**: pre-authentication lookup — use `withRLS(SYSTEM_USER_ID, 'super_admin', …)` for the user-fetch-by-phone call, since the caller has no session yet. Rejection of `system@internal` happens here; see §2.1 edge cases.
- **logs/sync/route.ts**: the `staff_profiles` lookup, the idempotency `SELECT … WHERE client_device_id = …`, and the insert MUST share one `withRLS()` transaction. Wrapping only the insert breaks idempotency under operator policies.
- **expenses/sync/route.ts**: same as above.
- **invoice-generation.ts**: contains a `db.execute(sql\`… FOR UPDATE\`)` raw-SQL call. After conversion the `tx` argument from `withRLS()` must be used in place of `db`.
- **reports.ts** read paths cover several sensitive tables — all under `withRLS(session.userId, session.role, …)` so role-appropriate scoping applies.
- **cron/alerts/route.ts**: use `withSystemRLS(async (tx) => …)`. Refactor `scanAndPersistAlerts()` (src/lib/actions/alerts.ts:32) to accept a `tx` param so both the cron entry (system context) and any future admin-triggered scan share one implementation. The function currently writes to `alert_events` AND iterates `push_subscriptions` for digest updates (src/lib/actions/alerts.ts:194) — both reads/writes must use the passed `tx`.
- **upload/route.ts** and **invoice-pdf/upload/route.ts**: verified — neither calls `db.*`. Both only issue pre-signed S3 URLs / upload buffers. ESLint rule will not match them; no conversion needed. Re-verify with `grep -n "from \"@/db\"" src/app/api/upload/route.ts src/app/api/invoice-pdf/upload/route.ts` before committing — if a future revision adds a DB call, this row must move to "pending".
- **health/route.ts**: pre-existing `db.execute(sql\`SELECT 1\`)` connectivity probe. Sensitive-table-free, but ESLint rule will flag it. Carve out via per-file override (see PRE-A2 step 2). Do NOT use `eslint-disable` line comments — keep the override list explicit so future readers see the entire allowlist in one place.
