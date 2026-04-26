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
`daily_logs`, `expenses`, `invoices`, `invoice_items`, `quotes`, `quote_items`, `loans`, `loan_payments`, `receivables`, `receivable_payments`, `cash_transactions`.

**Non-sensitive tables (app-layer role checks suffice):**
`vehicles`, `projects`, `staff_profiles`, `paddy_farms`, `farm_cycles`, `farm_inputs`, `farm_harvests`, `maintenance_*`, `alerts`, `audit_logs`, `company_settings`, `users`.

#### Schema migration

```sql
-- Enable RLS on each sensitive table
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses   ENABLE ROW LEVEL SECURITY;
-- (... repeat for each sensitive table)

-- Helper function reads PG session variables set by withRLS()
CREATE FUNCTION app_user_id()   RETURNS uuid   LANGUAGE sql STABLE
  AS $$ SELECT current_setting('app.current_user_id', true)::uuid $$;
CREATE FUNCTION app_user_role() RETURNS text   LANGUAGE sql STABLE
  AS $$ SELECT current_setting('app.current_user_role', true) $$;

-- daily_logs policies
CREATE POLICY daily_logs_operator_select ON daily_logs FOR SELECT
  USING (app_user_role() = 'operator' AND operator_id = app_user_id());
CREATE POLICY daily_logs_operator_modify ON daily_logs FOR INSERT
  WITH CHECK (app_user_role() = 'operator' AND operator_id = app_user_id());
CREATE POLICY daily_logs_operator_update ON daily_logs FOR UPDATE
  USING (app_user_role() = 'operator' AND operator_id = app_user_id())
  WITH CHECK (operator_id = app_user_id());
CREATE POLICY daily_logs_admin_all ON daily_logs FOR ALL
  USING (app_user_role() IN ('admin','super_admin','auditor','finance'));

-- expenses, invoices, quotes, loans, etc. follow the same shape
-- finance role: RW on invoices/quotes/loans/receivables/cash_transactions; RO on daily_logs/expenses
```

Postgres role used by the Drizzle client must be `NOSUPERUSER` and `NOBYPASSRLS` for policies to apply. Verify in `db/index.ts` connection setup.

#### Code changes

- Every action in `src/lib/actions/*.ts` that touches a sensitive table wraps the query in `withRLS(session, async (tx) => …)`. The helper sets `app.current_user_id` and `app.current_user_role` PG session variables for the duration of the transaction.
- `withRLS()` already exists; ensure it uses `tx`-scoped `SET LOCAL` rather than session-wide `SET` so connection-pool reuse is safe.
- Add an integration test that connects as each role and asserts policy enforcement (operator sees only own logs, finance can RW invoices, auditor read-only).

#### Edge cases

- **Background jobs / cron** (alert scanner, payroll runner): use a "system" role bypass — set `app.current_user_role = 'super_admin'` and a synthetic UUID. Document this as the only sanctioned bypass.
- **Sync endpoints** at `/api/logs/sync` and `/api/expenses/sync`: caller is the authenticated operator; wrap the insert in `withRLS()` with their session.
- **Drizzle migrations**: run as a privileged role that bypasses RLS for DDL.

### 2.2 Finance Role + Route Group

#### Schema migration

```sql
ALTER TYPE user_role ADD VALUE 'finance';
```

`userRoleEnum` in `src/db/schema/enums.ts` updated to include `'finance'`.

#### Middleware

`src/middleware.ts` adds:

```
/finance/*  → allow if role ∈ {finance, admin, super_admin}; else redirect to role home
```

Login redirect for fresh `finance` users lands on `/finance/`.

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
  + siteCenterLat        NUMERIC(10,7)
  + siteCenterLng        NUMERIC(10,7)
  + siteRadiusMeters     INTEGER         -- null = no geofence
paddy_farms:
  + siteCenterLat        NUMERIC(10,7)
  + siteCenterLng        NUMERIC(10,7)
  + siteRadiusMeters     INTEGER

company_settings:
  + workWindowStart      TEXT            -- 'HH:MM' 24h, default '06:00'
  + workWindowEnd        TEXT            -- default '18:00'

staff_profiles:
  + workWindowStart      TEXT            -- override company default, nullable
  + workWindowEnd        TEXT            -- nullable

alerts:
  -- existing kind enum gains: 'geofence_violation', 'off_hours'
```

Center-and-radius chosen over GeoJSON polygon: simpler arithmetic (haversine), no dependency on PostGIS, sufficient for Sri Lankan paddy fields and project sites. Polygon support deferred.

#### Detection logic

New module `src/lib/detection/moonlighting.ts`:

- `detectGeofenceViolations(sinceTs)` — for each daily_log with `gpsLatStart/gpsLngStart` populated and an assigned `projectId` or `farmId`, compute haversine distance from log GPS to site center. If > `siteRadiusMeters`, persist alert.
- `detectOffHoursViolations(sinceTs)` — for each daily_log, compare `startTime`/`endTime` against the operator's effective work window (staff override → company default). Logs starting before window-start or ending after window-end persist alert.
- Both functions append to existing `alerts` table; severity = `warning` (geofence > radius but < 2× radius), `critical` (≥ 2× radius or off-hours).

#### Pipeline integration

Hook into existing `scanAndPersistAlerts()` in `src/lib/actions/alerts.ts`. Daily-digest push notification already fans out alerts; no new notification path needed.

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

- **Invested to date:** sum of `farm_inputs.totalCost` where `cycleId = current` + share of relevant `daily_logs.fuelCost` and operator pay attributable to farm work.
- **Projected remaining cost:** average cost-per-stage from prior 3 completed cycles on the same farm (or company-wide fallback if < 3 cycles).
- **Projected revenue:** `areaAcres × avgYieldKgPerAcre × avgPricePerKg` from prior 3 harvests (farm-specific, then company-wide fallback).
- **Harvest ETA:** cycle start date + median cycle duration from prior cycles.

Display on existing farm detail page as a card: "Invested: X / Projected Cost: Y / Projected Revenue: Z / Net: W / Harvest ETA: date".

#### Business-wide 90-day forecast

`getBusinessCashFlow(days = 90)` — bucket by week (configurable to day/month):

- **Inflow per bucket:**
  - `receivables` with `dueDate` in bucket and `status = pending`
  - Projected harvest revenue from active farm cycles whose harvest ETA falls in bucket
  - Projected invoice issuance from in-progress projects (sum of un-invoiced log line items)
- **Outflow per bucket:**
  - `loan_payments` with `dueDate` in bucket and `status = pending`
  - Recurring expenses: rolling 3-month average of `cash_transactions` where type ∈ {fuel, maintenance, salaries, other_expense}
  - Scheduled maintenance: estimated cost per overdue/due-soon `maintenance_schedule`
- **Net per bucket:** inflow − outflow
- **Cumulative balance:** running sum, starting from current `cash_transactions` balance

Owner dashboard widget: line chart (Inflow / Outflow / Cumulative Net) + table of upcoming dated events (receivable due, loan due, harvest ETA).

Finance dashboard gets the same widget; admin dashboard does not (avoid clutter).

### 3.3 Quote Historical Pricing (Phase 2.3)

#### New action

`getSimilarProjects({ vehicleType, sizeMetric, sizeValue, tolerance = 0.2 })`:

- Filters completed `projects` whose primary vehicle matches `vehicleType`.
- `sizeMetric` ∈ {`hours`, `acres`, `km`, `tasks`} based on billing model.
- `sizeValue × (1 ± tolerance)` defines range; returns top N (default 5) ordered by recency.
- For each match, computes blended rate = total invoiced revenue / total billable units, plus margin% = (revenue − costs) / revenue.

#### UI in quote draft form

- On vehicle/billing-model selection, fire `getSimilarProjects`.
- Auto-fill `ratePerUnit` field with average of returned matches.
- Side panel "Similar projects" lists each match: name, period, units, rate, margin%, "Use this rate" button.
- Empty state (< 2 matches): fallback to `vehicles.ratePerHour` etc., panel shows "No similar history yet — using vehicle default".

No schema change; pure read query + UI.

### 3.4 Engine-Hour Admin Adjustment (Phase 2.4)

Two mechanisms because the requirements call for both invoice-side mobilization adjustments and post-hoc data corrections, and conflating them loses audit clarity.

#### Mechanism A — Mobilization adjustment column

Schema migration:

```
daily_logs:
  + mobilizationHoursAdjustment NUMERIC(6,2) NOT NULL DEFAULT 0
    -- additive hours billed to client without mutating raw start/end
```

- Added to `EDITABLE_FIELDS` in `src/lib/actions/admin-logs.ts` — admin/super_admin/finance can edit freely.
- Invoice generation ([src/lib/actions/invoice-generation.ts](../../../src/lib/actions/invoice-generation.ts)) sums `(endEngineHours − startEngineHours) + mobilizationHoursAdjustment` when computing billable hours.
- Operator pay calc continues to use raw hours only (mobilization is client-side, not operator-side).
- Audit log entry written on every change via existing audit-log middleware.

#### Mechanism B — Engine-hour correction action

For real data-entry corrections (e.g. operator typed wrong meter reading):

- New server action `adjustEngineHours({ logId, newStartHours, newEndHours, reason })`.
- Authorization: `super_admin` only (admin and finance cannot use it; this is forensic-grade).
- `reason` is mandatory text, min 10 chars.
- Writes to existing `audit_logs` with `before` (raw start/end) and `after`, plus `reason`.
- Surfaces on auditor reports page as a "Hour adjustments" section with full diff.

Both mechanisms remain available; they serve different intents.

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

"Create Invoice" button calls `createInvoiceFromDraft({ clientId, lines, notes })`:
- Persists `invoices` and `invoice_items`.
- Sets `invoicedAt = now()` and `invoiceItemId = …` on every consumed `daily_logs` row.
- Sets `projects.mobilizationBilled = true` if mobilization was included.
- Returns invoice id for redirect to detail page.

Authorization: `admin | super_admin | finance` only (operators cannot reach draft page; middleware enforces).

Existing `generateFromProject` becomes a convenience: pre-loads draft with all pending logs for the project, redirects to draft page for confirmation rather than persisting directly.

---

## 4. Sequencing and Rollout

### Wave 2.0 PR plan

- **PR 2.0a:** RLS migration + `withRLS()` wired into all sensitive-table actions + integration test suite. Largest, ships first.
- **PR 2.0b:** `finance` role enum + middleware + route group skeleton (pages reuse existing components).
- **PR 2.0c:** Remove unused deps. Trivial; can ride with 2.0b.

Wave 2.0 must bake in production for at least one full daily-digest cycle (24 h) before Wave 2.1 starts. Monitor `audit_logs` for unexpected `permission_denied` Postgres errors.

### Wave 2.1 PR plan

- **PR 2.1a:** Moonlighting detection (geofence + off-hours) — schema, detection module, pipeline hook, auditor page.
- **PR 2.1b:** Cash flow forecasting — actions + farm card + dashboard widget.
- **PR 2.1c:** Quote historical pricing — action + form integration.
- **PR 2.1d:** Engine-hour adjustment — schema, action, UI hooks.
- **PR 2.1e:** Invoice draft — schema, action, draft page, redirect of `generateFromProject`.

PRs 2.1a–2.1e are independent and can land in any order or in parallel.

### Migration safety

All schema changes are additive (new columns nullable or defaulted; new enum values; new tables/policies). No data backfill required except:
- `daily_logs.mobilizationHoursAdjustment` defaults to 0 (zero behavior change).
- `daily_logs.invoicedAt` set retroactively for all logs already linked to existing invoices: one-shot UPDATE via the migration that joins `invoice_items` back to source logs (use `audit_logs` if direct linkage absent — falls back to NULL and surfaces as historical-no-link in UI).

### Risk and mitigation

| Risk | Mitigation |
|------|------------|
| RLS misconfigured → operators see admin data, or admins blocked from own data | Integration test per role per table. Smoke test in staging before merge. |
| `withRLS()` connection-pool contamination if `SET` not transaction-scoped | Use `SET LOCAL` only; verify in code review. |
| Cash flow projections inaccurate with sparse history | Show "low confidence" badge when < 3 prior cycles or < 6 prior invoices. |
| Geofence false positives near site boundary | Default `siteRadiusMeters` set generously (250m for projects, 500m for farms). Tunable per record. |
| Mobilization adjustment double-counted | Invoice-line builder uses raw hours + adjustment; payroll uses raw hours only. Unit test both paths. |

### Testing strategy

- RLS: integration tests per role per sensitive table (operator, admin, finance, auditor, super_admin). Both positive (allowed) and negative (denied) cases.
- Moonlighting: unit tests for haversine, work-window comparison; fixture daily_logs with known violations.
- Cash flow: snapshot tests on synthetic farm/cycle/invoice data.
- Quote pricing: unit test on `getSimilarProjects` matching logic.
- Engine-hour adjustment: audit-log entry created on every adjust; unit test the diff serialization.
- Invoice draft: end-to-end test (create draft → exclude one row → submit → verify invoice persists + logs flagged).

---

## 5. Open Questions

None blocking. The following are accepted defaults:

- Geofence shape: center + radius (polygon deferred).
- Cash flow horizon: 90 days (configurable later).
- Quote tolerance band: ±20% (configurable later).
- Mobilization adjustment: free-form admin edit, no approval workflow (audit log is sufficient control).
- Finance role default landing: `/finance/`.
