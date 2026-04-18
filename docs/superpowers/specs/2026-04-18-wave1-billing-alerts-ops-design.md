# Wave 1 Design — Billing & Pay, Alerts & Notifications, Ops Tooling

**Date:** 2026-04-18
**Scope:** 6 items closing requirements gaps in the existing JPR app. Shipped in 3 sequential PR batches.
**Out of scope (next phase):** farm↔machine linkage, yield correlation, farm cash-flow forecasting, UI polish pass.

---

## 1. Context and Goals

The app already implements the core fleet, daily-log, invoicing, paddy-farm, payroll-period, and offline-sync features described in `Machinery Rental & Farming App Requirements.md`. Wave 1 closes the remaining billing, alerting, and admin-ops gaps so the system can compute accurate operator pay across all vehicle types, charge mobilization + trip allowances correctly, push real-time alerts to owners, and let admins fix operator data errors.

### In-scope items

1. **Harvester dual-pay** — operator earns per-acre bonus on top of any base salary. Generalizes to all vehicle types via billing-model-based output rate.
2. **Mobilization fee + driver trip allowance** — trucks charge mobilization once per project (client-side) and drivers earn a trip allowance (payroll-side).
6. **Admin daily-logs browse + edit page** — admin can filter all logs and correct operator data-entry errors on a whitelist of fields.
7. **Per-vehicle configurable idle + fuel thresholds** — alert thresholds tunable per vehicle, with company-level defaults.
8. **Push notifications end-to-end** — hybrid real-time (critical) + daily digest (warnings), opt-in per user.
9. **WhatsApp PDF file share** — Web Share API for native file attach, signed-URL fallback for unsupported browsers.

### Explicit non-goals

- No changes to existing farm / cycle / harvest schemas.
- No rework of auth, RBAC, or i18n scaffolding.
- No visual redesign — layouts stay; new screens match existing mobile-first patterns.

---

## 2. Phase 1 — Billing & Pay

### 2.1 Schema changes (Drizzle migration)

```
vehicles:
  + operatorRatePerUnit  NUMERIC(10,2)  -- operator earns this × unit output (hours/acres/km/tasks)
  + tripAllowance        NUMERIC(10,2)  -- default per-log bonus for truck drivers (optional, null = none)

projects:
  + mobilizationFee      NUMERIC(12,2)  -- one-off charge per project, null/0 = none
  + mobilizationBilled   BOOLEAN NOT NULL DEFAULT false  -- prevents duplicate billing

daily_logs:
  + tripAllowanceOverride NUMERIC(10,2) -- optional per-log override of vehicle default

payroll_periods:
  + perUnitBonusTotal    NUMERIC(12,2) DEFAULT 0  -- sum of operatorRatePerUnit × units across logs in period
  + tripAllowanceTotal   NUMERIC(12,2) DEFAULT 0
```

All columns nullable or defaulted → zero-downtime migration. Legacy rows keep existing behavior.

### 2.2 Operator-pay calculation

Operator pay per log = `vehicle.operatorRatePerUnit × output_units` where `output_units` is selected by `vehicle.billingModel`:

| billingModel | output_units | example |
|--------------|--------------|---------|
| `hourly` | `endEngineHours − startEngineHours` | bulldozer / excavator operator paid per hour worked |
| `per_acre` | `acresWorked` | harvester operator paid per acre harvested |
| `per_km` | `kmTraveled` | truck driver paid per km driven |
| `per_task` | 1 per log (task completed) | tractor operator paid per task |

**Full payroll formula (period sum):**

```
perUnitBonusTotal  = Σ (log.vehicle.operatorRatePerUnit × log.output_units)
tripAllowanceTotal = Σ (log.tripAllowanceOverride ?? log.vehicle.tripAllowance ?? 0)
baseSalary         = staff.payType === 'monthly'
                       ? prorate(staff.payRate, period, leaveDays)
                       : 0
gross              = baseSalary + perUnitBonusTotal + tripAllowanceTotal
deductions         = Σ(leave_deductions)  -- existing logic
netPay             = gross − deductions
```

Harvester operator with monthly base + per-acre bonus is a natural special case: `baseSalary > 0` and `perUnitBonusTotal > 0`.

### 2.3 Server actions

**`src/lib/actions/vehicles.ts`** — form accepts `operatorRatePerUnit`, `tripAllowance`. Validation: non-negative numeric; unit label in UI derived from `billingModel`.

**`src/lib/actions/projects.ts`** — form accepts `mobilizationFee`. `mobilizationBilled` never set manually; only `generateFromProject` flips it.

**`src/lib/actions/invoices.ts::generateFromProject(projectId)`** (new) —
1. Role check: super_admin, admin.
2. Fetch project + its daily logs with vehicle joined + current `mobilizationBilled` state.
3. Build line items:
   - If `mobilizationFee > 0 && !mobilizationBilled` → prepend `{description: "Mobilization", quantity: 1, unit: "mobilization", rate: mobilizationFee}`.
   - Per log → `{description: "<vehicle> on <date>", quantity: <output_units>, unit: <billingModel unit label>, rate: <vehicle.ratePerUnit>}`.
4. Compute subtotal, insert `invoices` + `invoice_items` rows in a single transaction.
5. If mobilization line was added → `UPDATE projects SET mobilizationBilled = true WHERE id = ?` inside the same transaction.
6. Return new invoice id.

**`src/lib/actions/daily-logs.ts::endLog`** — already exists; extend payload + validation to accept `tripAllowanceOverride`. Store null if not provided.

**`src/lib/actions/payroll.ts::computePayrollPeriod(staffId, periodStart, periodEnd)`** — rewrite using the formula above. Writes to new `perUnitBonusTotal` + `tripAllowanceTotal` columns in addition to existing `basePay` / `performanceBonus` / `netPay`. Existing `performanceBonus` column kept for manual bonuses; payroll UI shows the full breakdown.

### 2.4 UI changes

- **`src/components/forms/vehicle-form.tsx`** — two new fields. `operatorRatePerUnit` label dynamically reads billing model ("per hour" / "per acre" / "per km" / "per task"). `tripAllowance` only visible when `vehicleType === 'transport_truck'`.
- **`src/components/forms/project-form.tsx`** — `mobilizationFee` field.
- **Operator end-log form** — optional `tripAllowanceOverride` field shown only when current vehicle is a truck. Placeholder = vehicle default.
- **Admin project detail** (`admin/projects/[id]/page.tsx`) — "Generate invoice from logs" button next to existing actions. Disabled when project has no unbilled logs.
- **Admin payroll page** (`admin/staff/payroll/page.tsx`) — extend row to show `baseSalary | perUnitBonus | tripAllowance | deductions | netPay`.

### 2.5 Data flow (invoice generation)

```
admin clicks "Generate invoice from logs" on project detail
  → generateFromProject(projectId)
    → fetch project + logs + mobilization state
    → build line items (mobilization if unbilled + one per log)
    → BEGIN TX
        INSERT invoices, INSERT invoice_items, UPDATE projects.mobilizationBilled
      COMMIT
    → redirect to invoice detail
```

### 2.6 Error handling

- Negative or non-numeric rates → Zod rejection in `validations.ts`.
- `computePayrollPeriod` encountering a log whose vehicle lacks `operatorRatePerUnit` → throws with vehicle name in message (admin must configure rate before running payroll).
- `generateFromProject` on a project with zero eligible logs → returns clear error, no insert.
- `mobilizationBilled` flag is the authoritative double-bill guard.

---

## 3. Phase 2 — Alerts & Notifications

### 3.1 Schema changes

```
-- New enums (added to src/db/schema/enums.ts)
alert_type_enum      = pgEnum('alert_type', ['idling', 'fuel_anomaly', 'maintenance_overdue'])
alert_severity_enum  = pgEnum('alert_severity', ['warning', 'critical'])

vehicles:
  + idleWarnPct        NUMERIC(5,2)  -- null = use company default
  + idleCriticalPct    NUMERIC(5,2)
  + fuelVariancePct    NUMERIC(5,2)

company_settings:
  + defaultIdleWarnPct        NUMERIC(5,2) DEFAULT 20
  + defaultIdleCriticalPct    NUMERIC(5,2) DEFAULT 50
  + defaultFuelVariancePct    NUMERIC(5,2) DEFAULT 20

push_subscriptions:
  + preferCritical          BOOLEAN NOT NULL DEFAULT true
  + preferDailyDigest       BOOLEAN NOT NULL DEFAULT true
  + lastDigestSentDate      DATE NULL  -- idempotency for daily digest

alert_events (new table):
  id                uuid primary key default gen_random_uuid()
  type              alert_type_enum not null
  severity          alert_severity_enum not null
  vehicleId         uuid not null references vehicles(id) on delete cascade
  value             numeric(10,2)  -- e.g. idleRatioPct or discrepancyPct
  detectedDate      date not null default current_date  -- stored for dedup unique index
  detectedAt        timestamp not null default now()
  pushedAt          timestamp null  -- null = pending push send
  resolvedAt        timestamp null  -- null = still open

-- Dedup: at most one open event per type + vehicle + day
unique index alert_events_dedup_idx (type, vehicleId, detectedDate)
  where resolvedAt is null
```

### 3.2 Threshold resolution

Central helper in `src/lib/alerts/thresholds.ts`:

```
resolveThreshold(vehicle, companyDefaults, field):
  return vehicle[field] ?? companyDefaults[`default${field}`] ?? HARDCODED_FALLBACK[field]
```

Callers: `getIdlingReport`, `getFuelDiscrepancyReport`, `getExpenseAlerts` in `src/lib/actions/reports.ts`. Severity classification replaced to use resolved thresholds per row.

### 3.3 Scanner + push senders

**`src/lib/actions/alerts.ts`** (new):

- `scanAndPersistAlerts()` — runs the three reports, computes severity per row, upserts into `alert_events` (dedup keyed on `type + vehicleId + date`). Closes events whose underlying condition has cleared (`resolvedAt = now`).
- `sendCriticalPushes()` — query `alert_events` WHERE `severity='critical' AND pushedAt IS NULL`. Group by vehicle. For each subscriber with `preferCritical=true`, call `sendPush`. Stamp `pushedAt` on success.
- `sendDailyDigest()` — query still-open events (`resolvedAt IS NULL`). For each subscriber with `preferDailyDigest=true`, send one push summarizing counts. Idempotent per day via a `last_digest_sent_date` field on `push_subscriptions` (add to migration).

**`src/lib/push.ts`** — extend with `sendPush(subscription, payload)` using the `web-push` npm package. VAPID keys from `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` env. Catch 404/410 → soft-delete the subscription row.

### 3.4 Cron trigger

**`src/app/api/cron/alerts/route.ts`** (new) —
- GET handler.
- Checks `Authorization: Bearer ${CRON_SECRET}` header, else 401.
- Body: `{ mode: "scan" | "digest" }` via query param.
- `mode=scan` → `scanAndPersistAlerts()` + `sendCriticalPushes()`.
- `mode=digest` → `sendDailyDigest()`.

**`vercel.json`** cron config:

```json
{
  "crons": [
    { "path": "/api/cron/alerts?mode=scan",   "schedule": "*/15 * * * *" },
    { "path": "/api/cron/alerts?mode=digest", "schedule": "0 7 * * *" }
  ]
}
```

Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically when `CRON_SECRET` is set as a Vercel env var.

### 3.5 Service worker push handler

Extend `src/workers/sw.ts`:

```js
self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-badge.png",
      data: { url: payload.url ?? "/owner" },
      tag: payload.tag,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
```

### 3.6 UI changes

- **`src/components/settings/company-settings-form.tsx`** — 3 new numeric inputs for default thresholds. Super-admin only (existing role gate).
- **Vehicle form** — 3 threshold overrides. Placeholder shows current company default. Empty → use default.
- **`src/app/[locale]/(dashboard)/<role>/notifications/page.tsx`** (new, shared across roles) — "Enable push notifications" button that triggers `Notification.requestPermission()`, calls `/api/push/subscribe` with subscription JSON. Two toggles: `preferCritical`, `preferDailyDigest`. List shows current device subscription state.
- **Owner dashboard alerts panel** — swap `getExpenseAlerts` source from live computation to reading open `alert_events` rows. Computation still available on-demand for super-admin "rescan now" button.

### 3.7 Data flow (alerting)

```
Vercel cron every 15 min → GET /api/cron/alerts?mode=scan  (auth header)
  → scanAndPersistAlerts()
    → run 3 reports with resolved thresholds
    → upsert alert_events (dedup by type+vehicle+date)
    → close events whose condition cleared
  → sendCriticalPushes()
    → query pending critical alert_events
    → for each subscriber w/ preferCritical=true: sendPush(subscription, payload)
    → stamp pushedAt

Vercel cron 07:00 daily → GET /api/cron/alerts?mode=digest
  → sendDailyDigest()
    → query open alert_events
    → for each subscriber w/ preferDailyDigest=true AND last_digest_sent_date < today: push
    → update last_digest_sent_date
```

### 3.8 Error handling + degradation

- Missing `VAPID_*` env vars → `sendPush` no-ops with a single logged warning per cron run. Alert scan + event persistence continue working. Dashboard still shows alerts.
- Missing `CRON_SECRET` → cron endpoint returns 401 for all calls; alerts can be scanned via manual "rescan" button in UI.
- `web-push` 410/404 → soft-delete the `push_subscriptions` row.
- Subscriber count of zero → skip push loop, no error.

### 3.9 Env vars added

```
VAPID_PUBLIC_KEY       # also exposed to client as NEXT_PUBLIC_VAPID_PUBLIC_KEY for subscription
VAPID_PRIVATE_KEY
CRON_SECRET
```

### 3.10 Dependencies added

- `web-push` (Node library for VAPID-signed push delivery).

---

## 4. Phase 3 — Ops Tooling

### 4.1 Item 6 — Admin daily-logs page

**Route:** `src/app/[locale]/(dashboard)/admin/logs/page.tsx`

**Server actions** (`src/lib/actions/daily-logs.ts`):

- `getLogsForAdmin(filters, page, pageSize)` — accepts `{vehicleId?, operatorId?, projectId?, farmId?, dateFrom?, dateTo?, syncStatus?}`. Returns `{rows, totalCount}` joined with vehicle, operator, project names. Role gate: super_admin, admin.
- `updateLogByAdmin(logId, patch)` — accepts patch with whitelist `{fuelUsedLiters?, kmTraveled?, acresWorked?, notes?}`. All other keys silently stripped. Before/after snapshot written to `audit_logs` with actor id. Role gate: super_admin, admin.

**Page structure:**

```
<FilterBar>
  date range picker
  vehicle select
  operator select
  project select
  sync-status pill group
  [Apply] [Reset]
</FilterBar>

<LogList>
  per row card (mobile-first, stacks on narrow viewports):
    date | vehicle | operator
    start/end hours | fuel | km | acres
    badges: sync-status, project name
    [Edit] button → inline form (whitelist fields only)
</LogList>

<Pagination />  (reuse layout/pagination.tsx)

<ExportCsvButton />  (reuses existing exportLogsData with same filters)
```

**Edit constraints:**
- Engine hours, GPS, vehicle, operator, start/end times → locked, read-only.
- Only `fuelUsedLiters`, `kmTraveled`, `acresWorked`, `notes` editable.
- Save action writes audit entry with `{logId, editedFields, before, after, editorUserId}`.

### 4.2 Item 9 — WhatsApp PDF file share

**Client flow** (in `src/components/invoices/invoice-actions.tsx` and `src/components/quotes/quote-actions.tsx`):

```
async function onShare():
  const file = await buildPdfFile(data)  // existing react-pdf flow
  const message = buildWhatsAppMessage(data)

  if (navigator.canShare?.({ files: [file] })):
    try {
      await navigator.share({ files: [file], text: message })
      return
    } catch (e) {
      if (e.name === "AbortError") return  // user cancelled
      // fall through to fallback on other errors
    }

  // Fallback: upload + wa.me link
  const url = await uploadPdfForSharing(file, data.invoiceNumber)
  const fullMessage = `${message}\n\nDownload: ${url}`
  window.open(`https://wa.me/${toPhone}?text=${encodeURIComponent(fullMessage)}`, "_blank")
```

**API route** `src/app/api/invoice-pdf/upload/route.ts` (new) —
- POST, multipart form with `file` + `invoiceId`.
- Role gate: super_admin, admin.
- Rate limit: 10 req/min per user via existing `rate-limit.ts`.
- Store via existing `src/lib/storage.ts` S3/MinIO helpers under `invoice-pdfs/{invoiceId}/{randomToken}.pdf`.
- Return signed URL with 7-day expiry.

**UI changes:**
- `InvoiceActions` — merge current two buttons into one "Share on WhatsApp" button that runs the tier flow. Keep the "Download PDF" button as a separate secondary action for cases where the admin just wants the file locally.
- `QuoteActions` — same treatment. Also applies PDF generation to quotes (the client already has `quote-pdf-client.tsx`).

### 4.3 Error handling

- Upload failure (network, S3 down) → toast "Couldn't upload. Download the PDF and attach it manually." Keep Download button visible.
- `AbortError` from Web Share API → silent no-op (user cancelled).
- Missing `clientPhone` on invoice → WhatsApp opens the contact-picker URL (existing behavior).
- Signed URL expiry is 7 days — acceptable for invoicing cadence.

### 4.4 Security

- Signed URL prevents bucket enumeration; random token in the path prevents URL-guessing.
- PDF upload requires authenticated admin session + rate limit.
- CSV export in admin logs page uses the same auth gate as the list action.

---

## 5. Cross-Cutting

### 5.1 PR sequencing

Each phase ships as one PR. Phases are independent — later phases don't depend on earlier ones' runtime.

- **PR1 (Phase 1)** — billing migration, form updates, `generateFromProject`, payroll calc rewrite, payroll UI breakdown, seed-script update.
- **PR2 (Phase 2)** — alerts migration, `resolveThreshold` helper, report refactor, `scanAndPersistAlerts`, push senders, cron endpoint, SW push handler, settings + notification toggle UI. Requires env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`.
- **PR3 (Phase 3)** — admin logs route + actions, PDF upload API, `InvoiceActions` / `QuoteActions` updates.

### 5.2 Testing strategy

Vitest already configured (`src/lib/__tests__/`). Add:

- `payroll.test.ts` — payroll calc across 4 vehicle billing models, monthly base + bonus, zero-log edge case, missing `operatorRatePerUnit` → clear error.
- `threshold-resolver.test.ts` — vehicle override → company default → hardcoded fallback precedence.
- `alert-dedup.test.ts` — `scanAndPersistAlerts` doesn't re-insert open events, does close cleared events.
- `invoice-generation.test.ts` — mobilization charged exactly once; `mobilizationBilled` flag flipped; second call does not re-bill.
- `admin-log-edit.test.ts` — `updateLogByAdmin` strips non-whitelist fields, writes audit entry.

Manual test checklist included in the PR description template for each phase.

### 5.3 Rollout and backward compatibility

- All new columns nullable or defaulted → safe to deploy before UI/backfill.
- Legacy `payroll_periods` rows preserved; new totals default to 0.
- Phase 2 without VAPID/CRON env → alerts still compute + display, push send is no-op. Graceful degradation.
- Phase 3 on a browser lacking Web Share API Level 2 → falls through to signed-URL flow transparently.

### 5.4 Error-handling recap

- Validation layer (`src/lib/validations.ts`) extended with new field schemas (Zod).
- All server actions use `requireSession` + role checks.
- `web-push` 410/404 responses soft-delete the subscription row.
- Audit logging on admin log edits.
- Rate limit on PDF upload.

### 5.5 Open items deferred to implementation-plan stage

- Cron cadence tuning — start with 15 min scan / 07:00 digest; revisit after real-world signal volume.
- Digest delivery timezone — defaults to server time; per-user TZ is a future enhancement.
- i18n translation pass for all new screens (ta / si / en) — translator review after strings are finalized.
- Signed-URL TTL — start at 7 days; tune based on clients forwarding invoices days later.

---

## 6. Summary of Deliverables

| Phase | PR | User-visible outcome |
|-------|----|----|
| 1 | PR1 | Configure operator pay per vehicle. One-click invoice from project logs. Correct payroll with base + bonus + trip allowance. |
| 2 | PR2 | Per-vehicle alert thresholds with company defaults. Critical alerts push to owners in near-real-time. Daily digest of warnings. |
| 3 | PR3 | Admin can browse all logs, fix operator errors on a safe field whitelist. Sharing invoices on WhatsApp attaches the actual PDF file on supported devices. |
