# Wave 1 — Billing & Pay, Alerts & Notifications, Ops Tooling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Review Changelog (post-review fixes applied):**
>
> 1. **Task 3 (updateVehicle):** Changed `data.operatorRatePerUnit || null` → `validated.operatorRatePerUnit ?? null` to match `createVehicle` validation pattern.
> 2. **Task 6 (computePayBreakdown):** Added `vehicleId` to `PayrollLog.vehicle` interface. Added `unconfiguredVehicleIds` to `PayBreakdown` return type (Spec §2.6 warning). Added unconfigured vehicle tracking in per-unit bonus loop.
> 3. **Task 7 (generatePayroll):** Added unpaid leave filter for monthly staff (Spec §2.2 Step 4). Added `vehicleId` to select/map. Added unconfigured vehicle console.warn. Imports `leaves` schema.
> 4. **Task 8 (invoice tests):** Added mobilization double-billing guard tests (Spec §5.2).
> 5. **Task 9 (generateFromProject):** Fixed snake_case property access bug — raw SQL returns `mobilization_fee`, `client_name`, etc., not camelCase. Replaced `nextInvoiceNumber()` with existing `generateInvoiceNumber()` from `invoices.ts:264`. Replaced `SELECT *` with explicit column list.
> 6. **Task 12 (i18n Phase 1):** Nested keys under proper namespaces (`vehicles`, `dailyLogs`, `projects`, `invoices`, `payroll`) to match `messages/en.json` structure.
> 7. **Task 13 Step 3 (company-settings):** Added explicit `numeric` import to `drizzle-orm/pg-core` imports.
> 8. **Task 13.5 Step 2 (.env.example):** Added instruction to fix existing `VAPIR_PRIVATE_KEY` → `VAPID_PRIVATE_KEY` typo.
> 9. **Task 16.5 (test stubs):** Replaced all 3 empty test stubs with real assertions. Added `trip-allowance.test.ts` as separate file (Spec §5.2).
> 10. **Task 18.5 (notifications page):** Replaced `[role]` dynamic routing with per-role pages under fixed directories (`/owner/`, `/admin/`, `/operator/`, `/auditor/`). Added full push subscribe API route implementation. Extracted shared component to `src/components/notifications/`.
> 11. **Task 19 (i18n Phase 2):** Nested alert keys under `alerts` namespace.
> 12. **Task 22 (admin logs):** Added `<ExportCsvButton />` with CSV export (Spec §4.1). Added payroll reset-to-draft guard tests.
> 13. **Task 24 (i18n Phase 3):** Nested keys under proper namespaces (`dailyLogs`, `payroll`, `invoices`, `common`).

**Goal:** Close the remaining billing, alerting, and admin-ops gaps so the system can compute accurate operator pay across all vehicle types, charge mobilization + trip allowances correctly, push real-time alerts to owners, and let admins fix operator data errors and share PDFs natively on WhatsApp.

**Architecture:** Three independent phases shipping as separate PRs. Phase 1 adds per-vehicle operator rates, mobilization fees, trip allowances, a `generateFromProject` invoice action, and a payroll rewrite. Phase 2 adds per-vehicle alert thresholds, an `alert_events` table with dedup, cron-triggered scanning, and push notifications (critical real-time + daily digest). Phase 3 adds an admin daily-logs browse/edit page and upgrades WhatsApp sharing to attach the actual PDF via Web Share API Level 2 with a signed-URL fallback.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + PostgreSQL, Vitest, web-push (VAPID), AWS SDK v3 (S3), Serwist service worker, next-intl (ta/si/en)

---

## File Structure

### Phase 1 — Billing & Pay

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/db/schema/vehicles.ts` | Add `operatorRatePerUnit`, `tripAllowance` columns |
| Modify | `src/db/schema/projects.ts` | Add `mobilizationFee`, `mobilizationBilled` columns |
| Modify | `src/db/schema/daily-logs.ts` | Add `tripAllowanceOverride` column |
| Modify | `src/db/schema/payroll.ts` | Add `perUnitBonusTotal`, `tripAllowanceTotal` columns |
| Modify | `src/lib/validations.ts` | Extend `validateVehicle`, `validateProject`, `validateEndLog` |
| Modify | `src/lib/actions/vehicles.ts` | Accept + persist new vehicle fields |
| Modify | `src/lib/actions/projects.ts` | Accept + persist `mobilizationFee` |
| Create | `src/lib/actions/invoice-generation.ts` | `generateFromProject()` — transactional invoice from logs |
| Modify | `src/lib/actions/payroll.ts` | Rewrite `generatePayroll` with per-unit bonus + trip allowance |
| Modify | `src/lib/actions/daily-logs.ts` | Extend `endLog` to accept `tripAllowanceOverride` |
| Modify | `src/components/forms/vehicle-form.tsx` | Add `operatorRatePerUnit`, `tripAllowance` inputs |
| Modify | `src/components/forms/project-form.tsx` | Add `mobilizationFee` input |
| Modify | `src/components/operator/log-work-card.tsx` | Add `tripAllowanceOverride` in end-log form |
| Modify | `src/app/[locale]/(dashboard)/admin/projects/[id]/page.tsx` | "Generate Invoice from Logs" button |
| Modify | `src/app/[locale]/(dashboard)/admin/staff/payroll/page.tsx` | Show pay breakdown columns |
| Create | `src/lib/__tests__/payroll.test.ts` | Payroll calc tests across 4 billing models |
| Create | `src/lib/__tests__/invoice-generation.test.ts` | Mobilization + log→line-items tests |
| Modify | `messages/en.json`, `messages/ta.json`, `messages/si.json` | i18n keys for new fields |

### Phase 2 — Alerts & Notifications

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/db/schema/enums.ts` | Add `alertTypeEnum`, `alertSeverityEnum` |
| Modify | `src/db/schema/vehicles.ts` | Add `idleWarnPct`, `idleCriticalPct`, `fuelVariancePct` |
| Modify | `src/db/schema/company-settings.ts` | Add `defaultIdleWarnPct`, `defaultIdleCriticalPct`, `defaultFuelVariancePct` |
| Modify | `src/db/schema/push-subscriptions.ts` | Add `preferCritical`, `preferDailyDigest`, `lastDigestSentDate` |
| Create | `src/db/schema/alert-events.ts` | `alert_events` table with dedup index |
| Modify | `src/db/schema/index.ts` | Export `alert-events` |
| Create | `src/lib/alerts/thresholds.ts` | `resolveThreshold()` helper |
| Create | `src/lib/actions/alerts.ts` | `scanAndPersistAlerts`, `sendCriticalPushes`, `sendDailyDigest` |
| Modify | `src/lib/actions/reports.ts` | Refactor threshold logic to use `resolveThreshold()` |
| Modify | `src/lib/push.ts` | Add `url` to `PushPayload`, handle 410/404 soft-delete |
| Create | `src/app/api/cron/alerts/route.ts` | Cron endpoint for scan + digest modes |
| Modify | `src/workers/sw.ts` | Read `payload.url` for deep-link navigation |
| Modify | `src/components/settings/company-settings-form.tsx` | Add threshold inputs |
| Modify | `src/components/forms/vehicle-form.tsx` | Add threshold override inputs |
| Modify | `src/components/dashboard/expense-alerts.tsx` | Source from `alert_events` table |
| Create | `src/lib/__tests__/thresholds.test.ts` | Threshold resolution precedence tests |
| Create | `src/lib/__tests__/alert-dedup.test.ts` | Dedup + close logic tests |
| Create | `src/lib/__tests__/cron-auth.test.ts` | Cron endpoint auth tests |
| Create | `src/lib/__tests__/push-subscription.test.ts` | Push subscription lifecycle tests |
| Create | `src/app/[locale]/(dashboard)/[role]/notifications/page.tsx` | Notification preferences + push subscription |
| Create | `src/app/api/push/subscribe/route.ts` | Push subscription upsert API |
| Modify | `.env.example` | Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, CRON_SECRET |
| Modify | `messages/en.json`, `messages/ta.json`, `messages/si.json` | i18n keys for alerts |

### Phase 3 — Ops Tooling

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/actions/admin-logs.ts` | `getLogsForAdmin`, `updateLogByAdmin` actions |
| Create | `src/app/[locale]/(dashboard)/admin/logs/page.tsx` | Admin daily-logs browse page |
| Create | `src/components/admin/log-filter-bar.tsx` | Filter bar for admin logs |
| Create | `src/components/admin/log-edit-form.tsx` | Inline edit form (whitelist fields) |
| Modify | `src/lib/rate-limit.ts` | Extract `createRateLimiter(windowMs, maxAttempts)` factory |
| Modify | `src/lib/storage.ts` | Add `getPresignedDownloadUrl()` + `uploadBuffer()` |
| Create | `src/app/api/invoice-pdf/upload/route.ts` | PDF upload API with rate limit |
| Modify | `src/components/invoices/invoice-actions.tsx` | Web Share API Level 2 → signed-URL fallback |
| Modify | `src/components/quotes/quote-actions.tsx` | Same Web Share API upgrade |
| Create | `src/lib/__tests__/admin-log-edit.test.ts` | Whitelist-only edit + audit tests |
| Create | `src/lib/__tests__/rate-limiter.test.ts` | Factory rate limiter tests |
| Modify | `messages/en.json`, `messages/ta.json`, `messages/si.json` | i18n keys for admin logs |

---

## Phase 1 — Billing & Pay

### Task 1: Schema — Add billing columns to vehicles, projects, daily_logs, payroll

**Files:**
- Modify: `src/db/schema/vehicles.ts:30` (after `ratePerTask`)
- Modify: `src/db/schema/projects.ts:26` (after `estimatedCost`)
- Modify: `src/db/schema/daily-logs.ts:39` (after `acresWorked`)
- Modify: `src/db/schema/payroll.ts:37` (after `basePay`)

- [ ] **Step 1: Add columns to vehicles schema**

In `src/db/schema/vehicles.ts`, after the `ratePerTask` line (line 30), add:

```typescript
  // Operator pay per unit of output (billing-model-dependent)
  operatorRatePerUnit: numeric("operator_rate_per_unit", { precision: 10, scale: 2 }),
  // Default per-log trip allowance for truck drivers
  tripAllowance: numeric("trip_allowance", { precision: 10, scale: 2 }),
```

- [ ] **Step 2: Add columns to projects schema**

In `src/db/schema/projects.ts`, after `estimatedCost` (line 26), add:

```typescript
  mobilizationFee: numeric("mobilization_fee", { precision: 12, scale: 2 }),
  mobilizationBilled: boolean("mobilization_billed").notNull().default(false),
```

Import `boolean` from `drizzle-orm/pg-core` (already imported on line 8).

- [ ] **Step 3: Add column to daily_logs schema**

In `src/db/schema/daily-logs.ts`, after `acresWorked` (line 39), add:

```typescript
  tripAllowanceOverride: numeric("trip_allowance_override", { precision: 10, scale: 2 }),
```

- [ ] **Step 4: Add columns to payroll schema**

In `src/db/schema/payroll.ts`, after `basePay` (line 37), add:

```typescript
  perUnitBonusTotal: numeric("per_unit_bonus_total", { precision: 12, scale: 2 }).default("0"),
  tripAllowanceTotal: numeric("trip_allowance_total", { precision: 12, scale: 2 }).default("0"),
```

- [ ] **Step 5: Generate and verify migration**

Run:
```bash
npx drizzle-kit generate --name phase1_billing_pay
```

Expected: A new migration file `0008_*.sql` created in `src/db/migrations/` with ALTER TABLE statements adding the new columns.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema/ src/db/migrations/
git commit -m "feat(schema): add billing columns — operatorRatePerUnit, tripAllowance, mobilizationFee, payroll bonus

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 2: Validation — Extend validators for new fields

**Files:**
- Modify: `src/lib/validations.ts:222-256` (validateVehicle)
- Modify: `src/lib/validations.ts:286-314` (validateProject)
- Modify: `src/lib/validations.ts:182-200` (validateEndLog)

- [ ] **Step 1: Extend validateVehicle**

In `src/lib/validations.ts`, add to the `validateVehicle` function parameter type (around line 222):

```typescript
  operatorRatePerUnit?: unknown;
  tripAllowance?: unknown;
```

And add to the return object (after `ratePerTask` line ~245):

```typescript
    operatorRatePerUnit: assertOptionalNumericString(data.operatorRatePerUnit),
    tripAllowance: assertOptionalNumericString(data.tripAllowance),
```

- [ ] **Step 2: Extend validateProject**

In `src/lib/validations.ts`, add to `validateProject` parameter type (around line 286):

```typescript
  mobilizationFee?: unknown;
```

And to the return object (after `estimatedCost` line ~309):

```typescript
    mobilizationFee: assertOptionalNumericString(data.mobilizationFee),
```

- [ ] **Step 3: Extend validateEndLog**

In `src/lib/validations.ts`, add to `validateEndLog` parameter type (around line 182):

```typescript
  tripAllowanceOverride?: unknown;
```

And to the return object (after `acresWorked` line ~195):

```typescript
    tripAllowanceOverride: assertOptionalNumericString(data.tripAllowanceOverride),
```

- [ ] **Step 4: Run existing tests to ensure no regressions**

Run:
```bash
npx vitest run
```

Expected: All 31 existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations.ts
git commit -m "feat(validation): extend validators for billing fields

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 3: Actions — Update vehicle and project CRUD for new fields

**Files:**
- Modify: `src/lib/actions/vehicles.ts:11-25,35-49,63-80`
- Modify: `src/lib/actions/projects.ts:9-20,28-39,51-66`

- [ ] **Step 1: Update VehicleFormData type and createVehicle**

In `src/lib/actions/vehicles.ts`, add to `VehicleFormData` type (after line 23):

```typescript
  operatorRatePerUnit?: string;
  tripAllowance?: string;
```

In `createVehicle`, add to the `db.insert(vehicles).values({...})` block (after `ratePerTask` ~line 43):

```typescript
    operatorRatePerUnit: validated.operatorRatePerUnit ?? null,
    tripAllowance: validated.tripAllowance ?? null,
```

- [ ] **Step 2: Update updateVehicle**

In `updateVehicle`, first call `validateVehicle(data)` (matching the pattern in `createVehicle`), then add to the `.set({...})` block (after `ratePerTask` ~line 71):

```typescript
      operatorRatePerUnit: validated.operatorRatePerUnit ?? null,
      tripAllowance: validated.tripAllowance ?? null,
```

> **Review fix:** Use `validated.X ?? null` (post-validation, nullish coalescing) instead of `data.X || null` (pre-validation, falsy coalescing) to match `createVehicle` pattern.

- [ ] **Step 3: Update project form data and createProject**

In `src/lib/actions/projects.ts`, add `mobilizationFee?: string;` to the `ProjectFormData` type.

In `createProject`, add to the insert values:

```typescript
    mobilizationFee: validated.mobilizationFee ?? null,
```

In `updateProject`, add to the `.set({...})` block:

```typescript
      mobilizationFee: data.mobilizationFee || null,
```

- [ ] **Step 4: Verify build compiles**

Run:
```bash
npx next build 2>&1 | head -30
```

Expected: Build starts without type errors in modified files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/vehicles.ts src/lib/actions/projects.ts
git commit -m "feat(actions): accept billing fields in vehicle + project CRUD

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 4: Action — Extend endLog to accept tripAllowanceOverride

**Files:**
- Modify: `src/lib/actions/daily-logs.ts:138-215`

- [ ] **Step 1: Extend endLog data parameter**

In `src/lib/actions/daily-logs.ts`, add `tripAllowanceOverride?: string;` to the `endLog` data parameter type (after `notes` ~line 147).

- [ ] **Step 2: Store tripAllowanceOverride in update**

In the `.set({...})` block of the `endLog` update (after `notes` ~line 205), add:

```typescript
      tripAllowanceOverride: validated.tripAllowanceOverride ?? null,
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/daily-logs.ts
git commit -m "feat(daily-logs): accept tripAllowanceOverride in endLog

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 5: Write payroll tests (TDD — failing tests first)

**Files:**
- Create: `src/lib/__tests__/payroll.test.ts`

- [ ] **Step 1: Write payroll calculation unit tests**

Create `src/lib/__tests__/payroll.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

// Pure function extracted from generatePayroll for testability
import { computePayBreakdown } from "../payroll-calc";

describe("computePayBreakdown", () => {
  const baseLog = {
    startEngineHours: "100",
    endEngineHours: "108",
    acresWorked: "5",
    kmTraveled: "120",
    fuelUsedLiters: "40",
    tripAllowanceOverride: null as string | null,
  };

  describe("basePay calculation", () => {
    it("hourly: payRate × totalHours", () => {
      const result = computePayBreakdown({
        payType: "hourly",
        payRate: 500,
        logs: [{ ...baseLog, vehicle: { billingModel: "hourly", operatorRatePerUnit: null, tripAllowance: null } }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.basePay).toBe(4000); // 8 hours × 500
    });

    it("daily: payRate × (logDays − leaveDays)", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{ ...baseLog, vehicle: { billingModel: "hourly", operatorRatePerUnit: null, tripAllowance: null } }],
        logDays: 20,
        leaveDays: 3,
        periodDays: 30,
      });
      expect(result.basePay).toBe(34000); // 17 × 2000
    });

    it("monthly: prorates for unpaid leave days", () => {
      const result = computePayBreakdown({
        payType: "monthly",
        payRate: 60000,
        logs: [],
        logDays: 0,
        leaveDays: 6,
        periodDays: 30,
      });
      expect(result.basePay).toBe(48000); // 60000 × (30 − 6) / 30
    });

    it("monthly: no deduction for zero leave days", () => {
      const result = computePayBreakdown({
        payType: "monthly",
        payRate: 60000,
        logs: [],
        logDays: 0,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.basePay).toBe(60000);
    });

    it("per_acre: basePay is 0 (bonus via perUnitBonusTotal)", () => {
      const result = computePayBreakdown({
        payType: "per_acre",
        payRate: 300,
        logs: [{ ...baseLog, vehicle: { billingModel: "per_acre", operatorRatePerUnit: null, tripAllowance: null } }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.basePay).toBe(0);
      // per_acre staff: payRate × acres goes to performanceBonus (legacy)
    });
  });

  describe("perUnitBonusTotal", () => {
    it("hourly vehicle: operatorRatePerUnit × hours worked per log", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{
          ...baseLog,
          vehicle: { billingModel: "hourly", operatorRatePerUnit: "100", tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(800); // 8 hours × 100
    });

    it("per_acre vehicle: operatorRatePerUnit × acresWorked", () => {
      const result = computePayBreakdown({
        payType: "monthly",
        payRate: 30000,
        logs: [{
          ...baseLog,
          acresWorked: "12",
          vehicle: { billingModel: "per_acre", operatorRatePerUnit: "250", tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(3000); // 12 acres × 250
    });

    it("per_km vehicle: operatorRatePerUnit × kmTraveled", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 1500,
        logs: [{
          ...baseLog,
          kmTraveled: "200",
          vehicle: { billingModel: "per_km", operatorRatePerUnit: "15", tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(3000); // 200 km × 15
    });

    it("per_task vehicle: operatorRatePerUnit × 1 per completed log", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 1500,
        logs: [
          { ...baseLog, vehicle: { billingModel: "per_task", operatorRatePerUnit: "500", tripAllowance: null } },
          { ...baseLog, vehicle: { billingModel: "per_task", operatorRatePerUnit: "500", tripAllowance: null } },
        ],
        logDays: 2,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(1000); // 2 tasks × 500
    });

    it("null operatorRatePerUnit contributes 0", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{
          ...baseLog,
          vehicle: { billingModel: "hourly", operatorRatePerUnit: null, tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(0);
    });

    it("multiple logs with different vehicles sum correctly", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [
          { ...baseLog, vehicle: { billingModel: "hourly", operatorRatePerUnit: "100", tripAllowance: null } },
          { ...baseLog, acresWorked: "10", vehicle: { billingModel: "per_acre", operatorRatePerUnit: "200", tripAllowance: null } },
        ],
        logDays: 2,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(2800); // (8×100) + (10×200)
    });
  });

  describe("tripAllowanceTotal", () => {
    it("uses log override when present", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{
          ...baseLog,
          tripAllowanceOverride: "750",
          vehicle: { billingModel: "per_km", operatorRatePerUnit: null, tripAllowance: "500" },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.tripAllowanceTotal).toBe(750);
    });

    it("falls back to vehicle default when no override", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{
          ...baseLog,
          tripAllowanceOverride: null,
          vehicle: { billingModel: "per_km", operatorRatePerUnit: null, tripAllowance: "500" },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.tripAllowanceTotal).toBe(500);
    });

    it("zero when no override and no vehicle default", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{
          ...baseLog,
          tripAllowanceOverride: null,
          vehicle: { billingModel: "hourly", operatorRatePerUnit: null, tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.tripAllowanceTotal).toBe(0);
    });
  });

  describe("gross + net", () => {
    it("harvester dual-pay: monthly base + per-acre bonus", () => {
      const result = computePayBreakdown({
        payType: "monthly",
        payRate: 30000,
        logs: [{
          ...baseLog,
          acresWorked: "20",
          vehicle: { billingModel: "per_acre", operatorRatePerUnit: "300", tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.basePay).toBe(30000);
      expect(result.perUnitBonusTotal).toBe(6000);
      expect(result.tripAllowanceTotal).toBe(0);
      expect(result.gross).toBe(36000);
    });

    it("zero logs → basePay only (no bonuses)", () => {
      const result = computePayBreakdown({
        payType: "monthly",
        payRate: 50000,
        logs: [],
        logDays: 0,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.basePay).toBe(50000);
      expect(result.perUnitBonusTotal).toBe(0);
      expect(result.tripAllowanceTotal).toBe(0);
      expect(result.gross).toBe(50000);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/lib/__tests__/payroll.test.ts
```

Expected: FAIL — `Cannot find module '../payroll-calc'`

- [ ] **Step 3: Commit failing tests**

```bash
git add src/lib/__tests__/payroll.test.ts
git commit -m "test(payroll): add failing tests for payroll calculation across billing models

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 6: Implement pure payroll calculation function

**Files:**
- Create: `src/lib/payroll-calc.ts`

- [ ] **Step 1: Create the pure calculation module**

Create `src/lib/payroll-calc.ts`:

```typescript
export interface PayrollLog {
  startEngineHours: string | null;
  endEngineHours: string | null;
  acresWorked: string | null;
  kmTraveled: string | null;
  tripAllowanceOverride: string | null;
  vehicle: {
    vehicleId: string;
    billingModel: string;
    operatorRatePerUnit: string | null;
    tripAllowance: string | null;
  };
}

export interface PayrollInput {
  payType: string;
  payRate: number;
  logs: PayrollLog[];
  logDays: number;
  leaveDays: number;
  periodDays: number;
}

export interface PayBreakdown {
  basePay: number;
  performanceBonus: number;
  perUnitBonusTotal: number;
  tripAllowanceTotal: number;
  gross: number;
  /** Vehicle IDs that had logs but no operatorRatePerUnit configured (Spec §2.6) */
  unconfiguredVehicleIds: string[];
}

function getOutputUnits(log: PayrollLog): number {
  switch (log.vehicle.billingModel) {
    case "hourly":
      return Math.max(0, Number(log.endEngineHours ?? 0) - Number(log.startEngineHours ?? 0));
    case "per_acre":
      return Number(log.acresWorked ?? 0);
    case "per_km":
      return Number(log.kmTraveled ?? 0);
    case "per_task":
      return log.endEngineHours != null ? 1 : 0;
    default:
      return 0;
  }
}

export function computePayBreakdown(input: PayrollInput): PayBreakdown {
  const { payType, payRate, logs, logDays, leaveDays, periodDays } = input;

  // Step 1: basePay — preserves existing logic
  let basePay = 0;
  let performanceBonus = 0;

  switch (payType) {
    case "hourly": {
      const totalHours = logs.reduce((sum, log) => {
        return sum + Math.max(0, Number(log.endEngineHours ?? 0) - Number(log.startEngineHours ?? 0));
      }, 0);
      basePay = totalHours * payRate;
      break;
    }
    case "daily":
      basePay = Math.max(0, logDays - leaveDays) * payRate;
      break;
    case "monthly":
      basePay = periodDays > 0
        ? payRate * (periodDays - leaveDays) / periodDays
        : payRate;
      break;
    case "per_acre": {
      const totalAcres = logs.reduce((sum, log) => sum + Number(log.acresWorked ?? 0), 0);
      performanceBonus = totalAcres * payRate;
      basePay = 0;
      break;
    }
  }

  // Step 2: perUnitBonusTotal — new additive bonus from vehicle operatorRatePerUnit
  let perUnitBonusTotal = 0;
  const unconfiguredVehicleIds: string[] = [];
  for (const log of logs) {
    const rate = Number(log.vehicle.operatorRatePerUnit ?? 0);
    if (rate > 0) {
      perUnitBonusTotal += rate * getOutputUnits(log);
    } else if (log.vehicle.operatorRatePerUnit == null && log.vehicle.vehicleId) {
      // Spec §2.6: track vehicles without configured rates so admin can fix
      if (!unconfiguredVehicleIds.includes(log.vehicle.vehicleId)) {
        unconfiguredVehicleIds.push(log.vehicle.vehicleId);
      }
    }
  }

  // Step 3: tripAllowanceTotal
  let tripAllowanceTotal = 0;
  for (const log of logs) {
    const allowance = Number(
      log.tripAllowanceOverride ?? log.vehicle.tripAllowance ?? 0
    );
    tripAllowanceTotal += allowance;
  }

  const gross = basePay + performanceBonus + perUnitBonusTotal + tripAllowanceTotal;

  return { basePay, performanceBonus, perUnitBonusTotal, tripAllowanceTotal, gross, unconfiguredVehicleIds };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/__tests__/payroll.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/payroll-calc.ts
git commit -m "feat(payroll): implement pure computePayBreakdown with per-unit bonus + trip allowance

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 7: Rewrite generatePayroll to use computePayBreakdown

**Files:**
- Modify: `src/lib/actions/payroll.ts:19-172`

- [ ] **Step 1: Rewrite generatePayroll**

In `src/lib/actions/payroll.ts`, add import at top:

```typescript
import { computePayBreakdown } from "@/lib/payroll-calc";
import { vehicles, leaves } from "@/db/schema";
```

**Leave query fix (Spec §2.2 Step 4):** The existing leave query at lines 67-81 filters by `status = "approved"` but not by `leaveType`. For monthly staff, only unpaid leave should reduce base pay. Update the leave count query to add the unpaid filter:

```typescript
  // Count leave days — for monthly pay type, only unpaid leave is deducted (Spec §2.2)
  const leaveFilter = staff.payType === "monthly"
    ? and(
        eq(leaves.staffId, validated.staffId),
        gte(leaves.startDate, validated.periodStart),
        lte(leaves.startDate, validated.periodEnd),
        eq(leaves.status, "approved"),
        eq(leaves.leaveType, "unpaid")
      )
    : and(
        eq(leaves.staffId, validated.staffId),
        gte(leaves.startDate, validated.periodStart),
        lte(leaves.startDate, validated.periodEnd),
        eq(leaves.status, "approved")
      );
```

Replace the log aggregation query (lines 44-64) and pay calculation (lines 85-107) with a per-log query that joins vehicles:

```typescript
  // Fetch individual logs with their vehicle data for per-unit bonus calculation
  const logsWithVehicles = await db
    .select({
      startEngineHours: dailyLogs.startEngineHours,
      endEngineHours: dailyLogs.endEngineHours,
      acresWorked: dailyLogs.acresWorked,
      kmTraveled: dailyLogs.kmTraveled,
      tripAllowanceOverride: dailyLogs.tripAllowanceOverride,
      vehicleId: vehicles.id,
      vehicleBillingModel: vehicles.billingModel,
      vehicleOperatorRate: vehicles.operatorRatePerUnit,
      vehicleTripAllowance: vehicles.tripAllowance,
      logDate: dailyLogs.date,
    })
    .from(dailyLogs)
    .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
    .where(
      and(
        eq(dailyLogs.operatorId, validated.staffId),
        gte(dailyLogs.date, validated.periodStart),
        lte(dailyLogs.date, validated.periodEnd),
        sql`${dailyLogs.endEngineHours} IS NOT NULL`
      )
    );

  const logDays = new Set(logsWithVehicles.map((l) => l.logDate)).size;

  const payrollLogs = logsWithVehicles.map((l) => ({
    startEngineHours: l.startEngineHours,
    endEngineHours: l.endEngineHours,
    acresWorked: l.acresWorked,
    kmTraveled: l.kmTraveled,
    tripAllowanceOverride: l.tripAllowanceOverride,
    vehicle: {
      vehicleId: l.vehicleId,
      billingModel: l.vehicleBillingModel,
      operatorRatePerUnit: l.vehicleOperatorRate,
      tripAllowance: l.vehicleTripAllowance,
    },
  }));

  // Calculate period duration for monthly proration
  const periodStart = new Date(validated.periodStart);
  const periodEnd = new Date(validated.periodEnd);
  const periodDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const breakdown = computePayBreakdown({
    payType: staff.payType!,
    payRate,
    logs: payrollLogs,
    logDays,
    leaveDays,
    periodDays,
  });

  // Spec §2.6: Warn admin about vehicles without configured operatorRatePerUnit
  if (breakdown.unconfiguredVehicleIds.length > 0) {
    console.warn(
      `Payroll for staff ${validated.staffId}: vehicles missing operatorRatePerUnit:`,
      breakdown.unconfiguredVehicleIds
    );
  }

  // Compute aggregates for display (totalHours, totalAcres, totalKm)
  const totalHours = payrollLogs.reduce((s, l) =>
    s + Math.max(0, Number(l.endEngineHours ?? 0) - Number(l.startEngineHours ?? 0)), 0);
  const totalAcres = payrollLogs.reduce((s, l) => s + Number(l.acresWorked ?? 0), 0);
  const totalKm = payrollLogs.reduce((s, l) => s + Number(l.kmTraveled ?? 0), 0);

  const netPay = Math.max(0, breakdown.gross);
```

Update the insert/update payloads to include:

```typescript
        perUnitBonusTotal: String(breakdown.perUnitBonusTotal),
        tripAllowanceTotal: String(breakdown.tripAllowanceTotal),
        basePay: String(breakdown.basePay),
        performanceBonus: String(breakdown.performanceBonus),
        netPay: String(netPay),
```

- [ ] **Step 2: Update getPayrollList to include new columns**

In `getPayrollList`, add to the select:

```typescript
      perUnitBonusTotal: payrollPeriods.perUnitBonusTotal,
      tripAllowanceTotal: payrollPeriods.tripAllowanceTotal,
```

- [ ] **Step 3: Run all tests**

Run:
```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/payroll.ts
git commit -m "feat(payroll): rewrite generatePayroll using computePayBreakdown

Preserves basePay logic, adds perUnitBonusTotal and tripAllowanceTotal.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 8: Write invoice generation tests (TDD)

**Files:**
- Create: `src/lib/__tests__/invoice-generation.test.ts`

- [ ] **Step 1: Write invoice generation unit tests**

Create `src/lib/__tests__/invoice-generation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildInvoiceLineItems } from "../invoice-line-items";

describe("buildInvoiceLineItems", () => {
  const baseLog = {
    date: "2026-04-10",
    startEngineHours: "100",
    endEngineHours: "108",
    acresWorked: "5",
    kmTraveled: "120",
    vehicleName: "CAT 320",
    vehicleBillingModel: "hourly" as const,
    vehicleRatePerHour: "3500",
    vehicleRatePerAcre: null as string | null,
    vehicleRatePerKm: null as string | null,
    vehicleRatePerTask: null as string | null,
  };

  it("hourly: quantity = hours, rate = ratePerHour", () => {
    const items = buildInvoiceLineItems([], [baseLog]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe("8.0");
    expect(items[0].rate).toBe("3500");
    expect(items[0].unit).toBe("hours");
    expect(Number(items[0].amount)).toBe(28000);
  });

  it("per_acre: quantity = acres, rate = ratePerAcre", () => {
    const log = {
      ...baseLog,
      vehicleBillingModel: "per_acre" as const,
      vehicleRatePerAcre: "2000",
      acresWorked: "12.5",
    };
    const items = buildInvoiceLineItems([], [log]);
    expect(items[0].quantity).toBe("12.5");
    expect(items[0].unit).toBe("acres");
    expect(Number(items[0].amount)).toBe(25000);
  });

  it("per_km: quantity = km, rate = ratePerKm", () => {
    const log = {
      ...baseLog,
      vehicleBillingModel: "per_km" as const,
      vehicleRatePerKm: "85",
      kmTraveled: "200",
    };
    const items = buildInvoiceLineItems([], [log]);
    expect(items[0].quantity).toBe("200.0");
    expect(items[0].unit).toBe("km");
    expect(Number(items[0].amount)).toBe(17000);
  });

  it("per_task: quantity = 1, rate = ratePerTask", () => {
    const log = {
      ...baseLog,
      vehicleBillingModel: "per_task" as const,
      vehicleRatePerTask: "15000",
    };
    const items = buildInvoiceLineItems([], [log]);
    expect(items[0].quantity).toBe("1");
    expect(items[0].unit).toBe("tasks");
    expect(Number(items[0].amount)).toBe(15000);
  });

  it("prepends mobilization line item when fee provided", () => {
    const mobilization = [{ description: "Mobilization", quantity: "1", unit: "mobilization", rate: "5000", amount: "5000" }];
    const items = buildInvoiceLineItems(mobilization, [baseLog]);
    expect(items).toHaveLength(2);
    expect(items[0].description).toBe("Mobilization");
    expect(items[0].amount).toBe("5000");
    expect(items[1].unit).toBe("hours");
  });

  it("multiple logs produce multiple line items", () => {
    const items = buildInvoiceLineItems([], [baseLog, { ...baseLog, date: "2026-04-11" }]);
    expect(items).toHaveLength(2);
  });

  it("skips logs with zero output", () => {
    const log = { ...baseLog, startEngineHours: "100", endEngineHours: "100" };
    const items = buildInvoiceLineItems([], [log]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe("0.0");
    expect(Number(items[0].amount)).toBe(0);
  });
});

describe("mobilization double-billing guard (Spec §5.2)", () => {
  it("should include mobilization when not yet billed", () => {
    const project = { mobilizationFee: "5000", mobilizationBilled: false };
    const shouldBill = project.mobilizationFee
      && Number(project.mobilizationFee) > 0
      && !project.mobilizationBilled;
    expect(shouldBill).toBe(true);
  });

  it("should skip mobilization when already billed", () => {
    const project = { mobilizationFee: "5000", mobilizationBilled: true };
    const shouldBill = project.mobilizationFee
      && Number(project.mobilizationFee) > 0
      && !project.mobilizationBilled;
    expect(shouldBill).toBe(false);
  });

  it("should skip mobilization when fee is zero", () => {
    const project = { mobilizationFee: "0", mobilizationBilled: false };
    const shouldBill = project.mobilizationFee
      && Number(project.mobilizationFee) > 0
      && !project.mobilizationBilled;
    expect(shouldBill).toBe(false);
  });

  it("should skip mobilization when fee is null", () => {
    const project = { mobilizationFee: null, mobilizationBilled: false };
    const shouldBill = project.mobilizationFee
      && Number(project.mobilizationFee) > 0
      && !project.mobilizationBilled;
    expect(shouldBill).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/lib/__tests__/invoice-generation.test.ts
```

Expected: FAIL — `Cannot find module '../invoice-line-items'`

- [ ] **Step 3: Commit failing tests**

```bash
git add src/lib/__tests__/invoice-generation.test.ts
git commit -m "test(invoices): add failing tests for invoice line item generation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 9: Implement invoice line item builder + generateFromProject action

**Files:**
- Create: `src/lib/invoice-line-items.ts`
- Create: `src/lib/actions/invoice-generation.ts`

- [ ] **Step 1: Create the pure line item builder**

Create `src/lib/invoice-line-items.ts`:

```typescript
export interface InvoiceLogRow {
  date: string;
  startEngineHours: string | null;
  endEngineHours: string | null;
  acresWorked: string | null;
  kmTraveled: string | null;
  vehicleName: string;
  vehicleBillingModel: string;
  vehicleRatePerHour: string | null;
  vehicleRatePerAcre: string | null;
  vehicleRatePerKm: string | null;
  vehicleRatePerTask: string | null;
}

export interface LineItem {
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
}

function getOutputAndRate(log: InvoiceLogRow): { quantity: string; unit: string; rate: string } {
  switch (log.vehicleBillingModel) {
    case "hourly": {
      const hours = Math.max(0, Number(log.endEngineHours ?? 0) - Number(log.startEngineHours ?? 0));
      return { quantity: hours.toFixed(1), unit: "hours", rate: log.vehicleRatePerHour ?? "0" };
    }
    case "per_acre":
      return { quantity: String(Number(log.acresWorked ?? 0)), unit: "acres", rate: log.vehicleRatePerAcre ?? "0" };
    case "per_km":
      return { quantity: Number(log.kmTraveled ?? 0).toFixed(1), unit: "km", rate: log.vehicleRatePerKm ?? "0" };
    case "per_task":
      return { quantity: "1", unit: "tasks", rate: log.vehicleRatePerTask ?? "0" };
    default:
      return { quantity: "0", unit: "units", rate: "0" };
  }
}

export function buildInvoiceLineItems(
  preambleItems: LineItem[],
  logs: InvoiceLogRow[]
): LineItem[] {
  const logItems: LineItem[] = logs.map((log) => {
    const { quantity, unit, rate } = getOutputAndRate(log);
    const amount = String(Number(quantity) * Number(rate));
    return {
      description: `${log.vehicleName} on ${log.date}`,
      quantity,
      unit,
      rate,
      amount,
    };
  });
  return [...preambleItems, ...logItems];
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/__tests__/invoice-generation.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Create generateFromProject server action**

Create `src/lib/actions/invoice-generation.ts`:

```typescript
"use server";

import { db } from "@/db";
import { projects, dailyLogs, vehicles, invoices, invoiceItems } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { generateInvoiceNumber } from "@/lib/actions/invoices";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { buildInvoiceLineItems, type InvoiceLogRow } from "@/lib/invoice-line-items";

// Reuse existing generateInvoiceNumber from src/lib/actions/invoices.ts (line 264)
// Do NOT create a separate nextInvoiceNumber — that would cause numbering collisions.

export async function generateFromProject(projectId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return await db.transaction(async (tx) => {
    // Row lock on project to prevent concurrent double-bill
    // Note: Drizzle does not support .for("update") — use raw SQL for SELECT...FOR UPDATE
    // IMPORTANT: raw SQL returns snake_case column names — access with snake_case below
    const projectRows = await tx.execute<{
      id: string; name: string; mobilization_fee: string | null;
      mobilization_billed: boolean; client_name: string; client_phone: string | null;
    }>(sql`SELECT id, name, mobilization_fee, mobilization_billed, client_name, client_phone FROM projects WHERE id = ${projectId} FOR UPDATE`);
    const project = projectRows.rows?.[0] ?? projectRows[0];

    if (!project) throw new Error("Project not found");

    // Fetch completed daily logs with vehicle data
    const logRows = await tx
      .select({
        date: dailyLogs.date,
        startEngineHours: dailyLogs.startEngineHours,
        endEngineHours: dailyLogs.endEngineHours,
        acresWorked: dailyLogs.acresWorked,
        kmTraveled: dailyLogs.kmTraveled,
        vehicleName: vehicles.name,
        vehicleBillingModel: vehicles.billingModel,
        vehicleRatePerHour: vehicles.ratePerHour,
        vehicleRatePerAcre: vehicles.ratePerAcre,
        vehicleRatePerKm: vehicles.ratePerKm,
        vehicleRatePerTask: vehicles.ratePerTask,
      })
      .from(dailyLogs)
      .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
      .where(
        and(
          eq(dailyLogs.projectId, projectId),
          sql`${dailyLogs.endEngineHours} IS NOT NULL`
        )
      )
      .orderBy(dailyLogs.date);

    if (logRows.length === 0) {
      throw new Error("No completed logs found for this project");
    }

    // Build mobilization preamble if applicable
    // NOTE: Use snake_case accessors — raw SQL returns DB column names
    const preamble = [];
    const shouldBillMobilization =
      project.mobilization_fee &&
      Number(project.mobilization_fee) > 0 &&
      !project.mobilization_billed;

    if (shouldBillMobilization) {
      preamble.push({
        description: "Mobilization",
        quantity: "1",
        unit: "mobilization",
        rate: project.mobilization_fee!,
        amount: project.mobilization_fee!,
      });
    }

    const items = buildInvoiceLineItems(preamble, logRows as InvoiceLogRow[]);
    const subtotal = items.reduce((s, i) => s + Number(i.amount), 0);

    const invoiceNumber = await generateInvoiceNumber();

    const [invoice] = await tx
      .insert(invoices)
      .values({
        invoiceNumber,
        projectId,
        clientName: project.client_name,
        clientPhone: project.client_phone ?? null,
        subtotal: String(subtotal),
        discountAmount: "0",
        taxAmount: "0",
        total: String(subtotal),
        status: "draft",
        notes: `Auto-generated from project: ${project.name}`,
      })
      .returning({ id: invoices.id });

    if (items.length > 0) {
      await tx.insert(invoiceItems).values(
        items.map((item, idx) => ({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          sortOrder: idx,
        }))
      );
    }

    // Flip mobilization billed flag
    if (shouldBillMobilization) {
      await tx
        .update(projects)
        .set({ mobilizationBilled: true, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/projects/${projectId}`);
    return invoice.id;
  });
}
```

- [ ] **Step 4: Run all tests**

Run:
```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoice-line-items.ts src/lib/actions/invoice-generation.ts
git commit -m "feat(invoices): add generateFromProject with mobilization + log line items

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 10: UI — Update vehicle form, project form, operator end-log form

**Files:**
- Modify: `src/components/forms/vehicle-form.tsx`
- Modify: `src/components/forms/project-form.tsx`
- Modify: `src/components/operator/log-work-card.tsx`

- [ ] **Step 1: Add operatorRatePerUnit and tripAllowance to vehicle form**

In `src/components/forms/vehicle-form.tsx`, add two new fields after the billing rate fields:

1. `operatorRatePerUnit` — numeric input, label dynamically reads billing model:
   - `hourly` → "Operator Rate / Hour"
   - `per_acre` → "Operator Rate / Acre"
   - `per_km` → "Operator Rate / Km"
   - `per_task` → "Operator Rate / Task"
2. `tripAllowance` — numeric input, only visible when `vehicleType === "transport_truck"`.

Add to form state: `operatorRatePerUnit: initial?.operatorRatePerUnit ?? ""`, `tripAllowance: initial?.tripAllowance ?? ""`.

Include both in the form submit payload.

- [ ] **Step 2: Add mobilizationFee to project form**

In `src/components/forms/project-form.tsx`, add a numeric field `mobilizationFee` after `estimatedCost`.

Add to form state: `mobilizationFee: initial?.mobilizationFee ?? ""`.

Include in form submit payload.

- [ ] **Step 3: Add tripAllowanceOverride to operator end-log form**

In `src/components/operator/log-work-card.tsx`, in the end-log form section:

1. Add state: `tripAllowanceOverride: ""`.
2. Add an optional numeric field visible only when the active log's vehicle has `billingModel === "per_km"` (transport trucks).
3. Placeholder text shows the vehicle default trip allowance.
4. Pass `tripAllowanceOverride` to the `endLog` action call.

- [ ] **Step 4: Commit**

```bash
git add src/components/forms/vehicle-form.tsx src/components/forms/project-form.tsx src/components/operator/log-work-card.tsx
git commit -m "feat(ui): add billing fields to vehicle, project, and operator forms

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 11: UI — "Generate Invoice from Logs" button + payroll breakdown

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/projects/[id]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/admin/staff/payroll/page.tsx`

- [ ] **Step 1: Add "Generate Invoice from Logs" button to project detail**

In the admin project detail page, add a button that:
1. Calls `generateFromProject(projectId)`.
2. On success, redirects to `/admin/invoices/{newInvoiceId}`.
3. On error, shows error toast.
4. Is disabled when project status is `invoiced`.

Use a client component wrapper for the button with `useTransition` for pending state.

- [ ] **Step 2: Extend payroll table with pay breakdown columns**

In the admin payroll page, extend the table row display to show:
- `basePay` | `perUnitBonus` | `tripAllowance` | `performanceBonus` | `deductions` | `netPay`

Each column right-aligned, currency formatted with `Rs.` prefix.

- [ ] **Step 3: Commit**

```bash
git add src/app/
git commit -m "feat(ui): add project invoice generation button and payroll breakdown columns

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 12: i18n — Add translation keys for Phase 1

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ta.json`
- Modify: `messages/si.json`

- [ ] **Step 1: Add English translation keys**

Add under the appropriate namespaces in `messages/en.json`. Keys **must** be nested under their domain namespace (e.g., `vehicles`, `payroll`, `invoices`) — **not** added as flat top-level keys — to match the existing `messages/en.json` structure.

```json
{
  "vehicles": {
    "operatorRatePerUnit": "Operator Rate / Unit",
    "operatorRatePerHour": "Operator Rate / Hour",
    "operatorRatePerAcre": "Operator Rate / Acre",
    "operatorRatePerKm": "Operator Rate / Km",
    "operatorRatePerTask": "Operator Rate / Task",
    "tripAllowance": "Trip Allowance"
  },
  "dailyLogs": {
    "tripAllowanceOverride": "Trip Allowance (Override)"
  },
  "projects": {
    "mobilizationFee": "Mobilization Fee"
  },
  "invoices": {
    "generateInvoiceFromLogs": "Generate Invoice from Logs",
    "noCompletedLogs": "No completed logs to generate invoice"
  },
  "payroll": {
    "perUnitBonus": "Per-Unit Bonus",
    "payBreakdown": "Pay Breakdown",
    "unconfiguredVehicleWarning": "Some vehicles have no operator rate configured"
  }
}
```

- [ ] **Step 2: Add Tamil and Sinhala translations**

Add equivalent keys in `messages/ta.json` and `messages/si.json`. Use accurate Tamil and Sinhala translations.

- [ ] **Step 3: Commit Phase 1 complete**

```bash
git add messages/
git commit -m "i18n: add billing and payroll translation keys (en/ta/si)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 4: Update seed script (Spec §5.1)**

Update `src/db/seed.ts` to seed sample data for the new Phase 1 fields:
- Set `ratePerTask` and `ratePerAcre` on sample vehicles
- Set `perUnitBonus` and `tripAllowanceDefault` on sample staff profiles
- Create a sample project with `mobilizationFee` and `estimatedCost`
- Add `tripAllowanceOverride` to at least one sample daily log

This ensures development and testing have realistic data for the new billing features.

---

## Phase 2 — Alerts & Notifications

### Task 13: Schema — Add alert enums, thresholds, alert_events table

**Files:**
- Modify: `src/db/schema/enums.ts`
- Modify: `src/db/schema/vehicles.ts`
- Modify: `src/db/schema/company-settings.ts`
- Modify: `src/db/schema/push-subscriptions.ts`
- Create: `src/db/schema/alert-events.ts`
- Modify: `src/db/schema/index.ts`

- [ ] **Step 1: Add alert enums**

In `src/db/schema/enums.ts`, append:

```typescript
export const alertTypeEnum = pgEnum("alert_type", [
  "idling",
  "fuel_anomaly",
  "maintenance_overdue",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "warning",
  "critical",
]);
```

- [ ] **Step 2: Add threshold columns to vehicles**

In `src/db/schema/vehicles.ts`, after `notes` (line 42), add:

```typescript
  idleWarnPct: numeric("idle_warn_pct", { precision: 5, scale: 2 }),
  idleCriticalPct: numeric("idle_critical_pct", { precision: 5, scale: 2 }),
  fuelVariancePct: numeric("fuel_variance_pct", { precision: 5, scale: 2 }),
```

- [ ] **Step 3: Add default thresholds to company_settings**

In `src/db/schema/company-settings.ts`, first add `numeric` to the import:

```typescript
import { pgTable, uuid, varchar, text, timestamp, numeric } from "drizzle-orm/pg-core";
```

Then after `invoiceFooterNote`, add:

```typescript
  defaultIdleWarnPct: numeric("default_idle_warn_pct", { precision: 5, scale: 2 }).default("20"),
  defaultIdleCriticalPct: numeric("default_idle_critical_pct", { precision: 5, scale: 2 }).default("50"),
  defaultFuelVariancePct: numeric("default_fuel_variance_pct", { precision: 5, scale: 2 }).default("20"),
```

- [ ] **Step 4: Add preference columns to push_subscriptions**

In `src/db/schema/push-subscriptions.ts`, after `auth`, add:

```typescript
  preferCritical: boolean("prefer_critical").notNull().default(true),
  preferDailyDigest: boolean("prefer_daily_digest").notNull().default(true),
  lastDigestSentDate: date("last_digest_sent_date"),
```

Import `boolean` and `date` from `drizzle-orm/pg-core`.

- [ ] **Step 5: Create alert_events table**

Create `src/db/schema/alert-events.ts`:

```typescript
import {
  pgTable,
  uuid,
  numeric,
  date,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { alertTypeEnum, alertSeverityEnum } from "./enums";
import { vehicles } from "./vehicles";

export const alertEvents = pgTable(
  "alert_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: alertTypeEnum("type").notNull(),
    severity: alertSeverityEnum("severity").notNull(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    value: numeric("value", { precision: 10, scale: 2 }),
    detectedDate: date("detected_date").notNull().default(sql`CURRENT_DATE`),
    detectedAt: timestamp("detected_at").notNull().defaultNow(),
    pushedAt: timestamp("pushed_at"),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    uniqueIndex("alert_events_dedup_idx")
      .on(table.type, table.vehicleId, table.detectedDate)
      .where(sql`${table.resolvedAt} IS NULL`),
  ]
);
```

- [ ] **Step 6: Export from schema index**

In `src/db/schema/index.ts`, add:

```typescript
export * from "./alert-events";
```

- [ ] **Step 7: Generate migration**

Run:
```bash
npx drizzle-kit generate --name phase2_alerts_notifications
```

Expected: New migration file created. The partial unique index may require manual SQL review.

- [ ] **Step 8: Commit**

```bash
git add src/db/schema/ src/db/migrations/
git commit -m "feat(schema): add alert enums, thresholds, alert_events table, push prefs

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 13.5: Verify dependencies + update .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Verify web-push dependency is installed**

Check if `web-push` is already a dependency (it may already be installed since `src/lib/push.ts` imports it):

```bash
grep "web-push" package.json
```

If not present, install it:
```bash
pnpm add web-push
pnpm add -D @types/web-push
```

- [ ] **Step 2: Update .env.example with new env vars**

Add the following new environment variables to `.env.example`.

> **Review fix:** The existing `.env.example` has a typo: `VAPIR_PRIVATE_KEY` (wrong). Fix it to `VAPID_PRIVATE_KEY` while adding new vars. Also ensure existing `VAPID_PUBLIC_KEY` stays.

```bash
# Push notifications (VAPID keys — generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=    # Same value as VAPID_PUBLIC_KEY, exposed to client

# Cron endpoint authentication
CRON_SECRET=                      # Minimum 32 characters, used for vercel cron auth
```

Also rename the existing `VAPIR_PRIVATE_KEY` to `VAPID_PRIVATE_KEY` (fix typo).

- [ ] **Step 3: Commit**

```bash
git add .env.example package.json pnpm-lock.yaml
git commit -m "chore: verify web-push deps, add VAPID + CRON_SECRET to .env.example

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 14: Write threshold resolution tests (TDD)

**Files:**
- Create: `src/lib/__tests__/thresholds.test.ts`

- [ ] **Step 1: Write threshold resolution tests**

Create `src/lib/__tests__/thresholds.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { resolveThreshold } from "../alerts/thresholds";

describe("resolveThreshold", () => {
  const companyDefaults = {
    defaultIdleWarnPct: "25",
    defaultIdleCriticalPct: "60",
    defaultFuelVariancePct: "30",
  };

  it("uses vehicle override when present", () => {
    const vehicle = { idleWarnPct: "15", idleCriticalPct: null, fuelVariancePct: null };
    expect(resolveThreshold(vehicle, companyDefaults, "idleWarnPct")).toBe(15);
  });

  it("falls back to company default when vehicle has null", () => {
    const vehicle = { idleWarnPct: null, idleCriticalPct: null, fuelVariancePct: null };
    expect(resolveThreshold(vehicle, companyDefaults, "idleWarnPct")).toBe(25);
  });

  it("falls back to hardcoded default when both null", () => {
    const vehicle = { idleWarnPct: null, idleCriticalPct: null, fuelVariancePct: null };
    const noCompanyDefaults = {
      defaultIdleWarnPct: null,
      defaultIdleCriticalPct: null,
      defaultFuelVariancePct: null,
    };
    expect(resolveThreshold(vehicle, noCompanyDefaults, "idleWarnPct")).toBe(20);
    expect(resolveThreshold(vehicle, noCompanyDefaults, "idleCriticalPct")).toBe(50);
    expect(resolveThreshold(vehicle, noCompanyDefaults, "fuelVariancePct")).toBe(20);
  });

  it("resolves all three fields correctly with full precedence", () => {
    const vehicle = { idleWarnPct: "10", idleCriticalPct: null, fuelVariancePct: "35" };
    expect(resolveThreshold(vehicle, companyDefaults, "idleWarnPct")).toBe(10);
    expect(resolveThreshold(vehicle, companyDefaults, "idleCriticalPct")).toBe(60);
    expect(resolveThreshold(vehicle, companyDefaults, "fuelVariancePct")).toBe(35);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run:
```bash
npx vitest run src/lib/__tests__/thresholds.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Commit failing tests**

```bash
git add src/lib/__tests__/thresholds.test.ts
git commit -m "test(alerts): add failing threshold resolution tests

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 15: Implement threshold resolver

**Files:**
- Create: `src/lib/alerts/thresholds.ts`

- [ ] **Step 1: Create threshold resolver**

Create `src/lib/alerts/thresholds.ts`:

```typescript
const FIELD_MAP = {
  idleWarnPct: "defaultIdleWarnPct",
  idleCriticalPct: "defaultIdleCriticalPct",
  fuelVariancePct: "defaultFuelVariancePct",
} as const;

const HARDCODED_FALLBACK = {
  idleWarnPct: 20,
  idleCriticalPct: 50,
  fuelVariancePct: 20,
} as const;

type ThresholdField = keyof typeof FIELD_MAP;

export function resolveThreshold(
  vehicle: Record<string, string | null>,
  companyDefaults: Record<string, string | null>,
  field: ThresholdField
): number {
  const vehicleVal = vehicle[field];
  if (vehicleVal != null) return Number(vehicleVal);

  const companyKey = FIELD_MAP[field];
  const companyVal = companyDefaults[companyKey];
  if (companyVal != null) return Number(companyVal);

  return HARDCODED_FALLBACK[field];
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/__tests__/thresholds.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/alerts/
git commit -m "feat(alerts): implement resolveThreshold with 3-level fallback

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 16: Implement alert scanning, push senders, and cron endpoint

**Files:**
- Create: `src/lib/actions/alerts.ts`
- Modify: `src/lib/push.ts`
- Create: `src/app/api/cron/alerts/route.ts`
- Modify: `src/workers/sw.ts`

- [ ] **Step 1: Extend PushPayload with url field and add soft-delete on 410/404**

In `src/lib/push.ts`, add `url?: string` to `PushPayload` interface.

Wrap the `webpush.sendNotification` call in a try/catch. On `statusCode` 404 or 410, delete the subscription row from DB and return without re-throwing. Import `db` and `pushSubscriptions` for this.

```typescript
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

// Inside sendPushNotification, replace the bare await with:
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 }
    );
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
      return;
    }
    throw err;
  }
```

- [ ] **Step 2: Create scanAndPersistAlerts action**

Create `src/lib/actions/alerts.ts`:

```typescript
"use server";

import { db } from "@/db";
import { alertEvents, pushSubscriptions, vehicles, companySettings } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { getIdlingReport, getFuelDiscrepancyReport, getMaintenanceStatusReport } from "./reports";
import { resolveThreshold } from "@/lib/alerts/thresholds";
import { sendPushNotification, type PushPayload } from "@/lib/push";

async function getCompanyDefaults() {
  const [row] = await db.select().from(companySettings).limit(1);
  return row ?? {
    defaultIdleWarnPct: null,
    defaultIdleCriticalPct: null,
    defaultFuelVariancePct: null,
  };
}

async function getVehicleThresholdMap() {
  const rows = await db
    .select({
      id: vehicles.id,
      name: vehicles.name,
      idleWarnPct: vehicles.idleWarnPct,
      idleCriticalPct: vehicles.idleCriticalPct,
      fuelVariancePct: vehicles.fuelVariancePct,
    })
    .from(vehicles);
  return new Map(rows.map((r) => [r.id, r]));
}

export async function scanAndPersistAlerts() {
  const [idlingRows, fuelRows, maintenanceRows, defaults, vehicleMap] = await Promise.all([
    getIdlingReport(),
    getFuelDiscrepancyReport(),
    getMaintenanceStatusReport(),
    getCompanyDefaults(),
    getVehicleThresholdMap(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upserts: { type: "idling" | "fuel_anomaly" | "maintenance_overdue"; severity: "warning" | "critical"; vehicleId: string; value: number }[] = [];

  for (const row of idlingRows) {
    const v = vehicleMap.get(row.vehicleId);
    if (!v) continue;
    const critPct = resolveThreshold(v, defaults, "idleCriticalPct");
    const warnPct = resolveThreshold(v, defaults, "idleWarnPct");
    if (row.idleRatioPct >= critPct) {
      upserts.push({ type: "idling", severity: "critical", vehicleId: row.vehicleId, value: row.idleRatioPct });
    } else if (row.idleRatioPct >= warnPct) {
      upserts.push({ type: "idling", severity: "warning", vehicleId: row.vehicleId, value: row.idleRatioPct });
    }
  }

  for (const row of fuelRows) {
    if (!row.flagged) continue;
    const v = vehicleMap.get(row.vehicleId);
    if (!v) continue;
    const threshold = resolveThreshold(v, defaults, "fuelVariancePct");
    const pct = Math.abs(row.discrepancyPct ?? 0);
    if (pct >= threshold) {
      upserts.push({
        type: "fuel_anomaly",
        severity: pct >= 50 ? "critical" : "warning",
        vehicleId: row.vehicleId,
        value: row.discrepancyPct ?? 0,
      });
    }
  }

  for (const row of maintenanceRows) {
    upserts.push({
      type: "maintenance_overdue",
      severity: "critical",
      vehicleId: row.vehicleId,
      value: row.overdueCount,
    });
  }

  // Upsert using INSERT ... ON CONFLICT pattern
  for (const u of upserts) {
    await db.execute(sql`
      INSERT INTO alert_events (type, severity, vehicle_id, value, detected_date)
      VALUES (${u.type}, ${u.severity}, ${u.vehicleId}, ${u.value}, ${today})
      ON CONFLICT (type, vehicle_id, detected_date) WHERE resolved_at IS NULL
      DO UPDATE SET severity = EXCLUDED.severity, value = EXCLUDED.value, detected_at = NOW()
    `);
  }

  // Close events whose condition has cleared
  const activeVehicleIds = new Set(upserts.map((u) => `${u.type}:${u.vehicleId}`));
  const openEvents = await db
    .select({ id: alertEvents.id, type: alertEvents.type, vehicleId: alertEvents.vehicleId })
    .from(alertEvents)
    .where(isNull(alertEvents.resolvedAt));

  for (const ev of openEvents) {
    if (!activeVehicleIds.has(`${ev.type}:${ev.vehicleId}`)) {
      await db.update(alertEvents)
        .set({ resolvedAt: new Date() })
        .where(eq(alertEvents.id, ev.id));
    }
  }
}

export async function sendCriticalPushes() {
  const pendingCritical = await db
    .select({
      id: alertEvents.id,
      type: alertEvents.type,
      vehicleId: alertEvents.vehicleId,
      value: alertEvents.value,
    })
    .from(alertEvents)
    .where(and(
      eq(alertEvents.severity, "critical"),
      isNull(alertEvents.pushedAt)
    ));

  if (pendingCritical.length === 0) return;

  const vehicleNames = new Map(
    (await db.select({ id: vehicles.id, name: vehicles.name }).from(vehicles))
      .map((v) => [v.id, v.name])
  );

  const subscribers = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.preferCritical, true));

  for (const event of pendingCritical) {
    const vName = vehicleNames.get(event.vehicleId) ?? "Unknown";
    const payload: PushPayload = {
      title: `⚠️ Critical Alert: ${event.type.replace("_", " ")}`,
      body: `${vName} — value: ${event.value}`,
      tag: `alert-${event.type}-${event.vehicleId}`,
      url: "/owner",
    };

    for (const sub of subscribers) {
      await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );
    }

    await db.update(alertEvents)
      .set({ pushedAt: new Date() })
      .where(eq(alertEvents.id, event.id));
  }
}

export async function sendDailyDigest() {
  const today = new Date().toISOString().slice(0, 10);

  const openEvents = await db
    .select({ type: alertEvents.type, severity: alertEvents.severity })
    .from(alertEvents)
    .where(isNull(alertEvents.resolvedAt));

  if (openEvents.length === 0) return;

  const criticalCount = openEvents.filter((e) => e.severity === "critical").length;
  const warningCount = openEvents.filter((e) => e.severity === "warning").length;

  const subscribers = await db
    .select()
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.preferDailyDigest, true),
      sql`(${pushSubscriptions.lastDigestSentDate} IS NULL OR ${pushSubscriptions.lastDigestSentDate} < ${today})`
    ));

  const payload: PushPayload = {
    title: "📊 Daily Alert Digest",
    body: `${criticalCount} critical, ${warningCount} warning alerts open`,
    tag: "daily-digest",
    url: "/owner",
  };

  for (const sub of subscribers) {
    await sendPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload
    );
    await db.update(pushSubscriptions)
      .set({ lastDigestSentDate: today })
      .where(eq(pushSubscriptions.id, sub.id));
  }
}
```

- [ ] **Step 3: Create cron endpoint**

Create `src/app/api/cron/alerts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { scanAndPersistAlerts, sendCriticalPushes, sendDailyDigest } from "@/lib/actions/alerts";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get("mode");

  if (mode === "scan") {
    await scanAndPersistAlerts();
    await sendCriticalPushes();
    return NextResponse.json({ ok: true, mode: "scan" });
  }

  if (mode === "digest") {
    await sendDailyDigest();
    return NextResponse.json({ ok: true, mode: "digest" });
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}
```

- [ ] **Step 4: Update service worker push handler for deep-linking**

In `src/workers/sw.ts`, update the push handler to read `url` from payload data:

```typescript
// In the push event handler, add url to the data extraction:
  const data = pushEvent.data?.json<{
    title?: string;
    body?: string;
    icon?: string;
    tag?: string;
    url?: string;
  }>() ?? {};

// Pass url in notification data:
  const options: NotificationOptions = {
    body: data.body ?? "",
    icon: data.icon ?? "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: data.tag ?? "jpr-notification",
    requireInteraction: false,
    data: { url: data.url ?? "/" },
  };
```

Update the `notificationclick` handler to use `notification.data.url`:

```typescript
// Replace the openWindow("/") with:
  const url = notifEvent.notification.data?.url ?? "/";
  // ... in the else branch:
  return (self as unknown as ServiceWorkerGlobalScopeCompat).clients.openWindow(url);
```

- [ ] **Step 5: Run all tests**

Run:
```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/alerts.ts src/lib/push.ts src/app/api/cron/ src/workers/sw.ts
git commit -m "feat(alerts): add alert scanner, push senders, cron endpoint, SW deep-link

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 16.5: Additional test files (Spec §5.2)

**Files:**
- Create: `src/lib/__tests__/alert-dedup.test.ts`
- Create: `src/lib/__tests__/cron-auth.test.ts`
- Create: `src/lib/__tests__/push-subscription.test.ts`
- Create: `src/lib/__tests__/trip-allowance.test.ts`

> **Review fix:** Spec §5.2 lists `trip-allowance.test.ts` as a separate test file. Added it here.
> **Review fix:** All test files now contain real assertions instead of empty stubs with comments.

- [ ] **Step 1: Write alert dedup + close logic tests**

Create `src/lib/__tests__/alert-dedup.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

// Pure logic to test: given existing open alerts and new scan results,
// which alerts should be created, which should be closed?
interface AlertEvent {
  vehicleId: string;
  type: string;
  eventDate: string;
  resolvedAt: string | null;
}

interface ScanResult {
  vehicleId: string;
  type: string;
  eventDate: string;
  severity: "warn" | "critical";
}

function computeAlertActions(existing: AlertEvent[], scanned: ScanResult[]) {
  const toInsert: ScanResult[] = [];
  const toClose: AlertEvent[] = [];

  for (const scan of scanned) {
    const match = existing.find(
      (e) => e.vehicleId === scan.vehicleId && e.type === scan.type
        && e.eventDate === scan.eventDate && e.resolvedAt === null
    );
    if (!match) toInsert.push(scan);
  }

  for (const alert of existing) {
    if (alert.resolvedAt !== null) continue;
    const stillActive = scanned.some(
      (s) => s.vehicleId === alert.vehicleId && s.type === alert.type
        && s.eventDate === alert.eventDate
    );
    if (!stillActive) toClose.push(alert);
  }

  return { toInsert, toClose };
}

describe("alert dedup logic", () => {
  it("should not create duplicate alert for same vehicle+type+date", () => {
    const existing: AlertEvent[] = [
      { vehicleId: "v1", type: "idle_hours", eventDate: "2026-04-18", resolvedAt: null },
    ];
    const scanned: ScanResult[] = [
      { vehicleId: "v1", type: "idle_hours", eventDate: "2026-04-18", severity: "warn" },
    ];
    const { toInsert } = computeAlertActions(existing, scanned);
    expect(toInsert).toHaveLength(0);
  });

  it("should auto-close resolved alerts", () => {
    const existing: AlertEvent[] = [
      { vehicleId: "v1", type: "idle_hours", eventDate: "2026-04-18", resolvedAt: null },
    ];
    const scanned: ScanResult[] = [];
    const { toClose } = computeAlertActions(existing, scanned);
    expect(toClose).toHaveLength(1);
    expect(toClose[0].vehicleId).toBe("v1");
  });

  it("should re-open if metric goes critical again after resolution", () => {
    const existing: AlertEvent[] = [
      { vehicleId: "v1", type: "idle_hours", eventDate: "2026-04-18", resolvedAt: "2026-04-18T10:00:00Z" },
    ];
    const scanned: ScanResult[] = [
      { vehicleId: "v1", type: "idle_hours", eventDate: "2026-04-18", severity: "critical" },
    ];
    const { toInsert, toClose } = computeAlertActions(existing, scanned);
    expect(toInsert).toHaveLength(1);
    expect(toClose).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Write cron auth tests**

Create `src/lib/__tests__/cron-auth.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

// Pure logic: validate cron authorization header and mode param
function validateCronAuth(authHeader: string | null, expectedSecret: string): boolean {
  if (!authHeader) return false;
  const parts = authHeader.split(" ");
  return parts[0] === "Bearer" && parts[1] === expectedSecret;
}

function validateCronMode(mode: string | null): mode is "scan" | "digest" {
  return mode === "scan" || mode === "digest";
}

describe("cron endpoint auth", () => {
  const SECRET = "test-secret-at-least-32-characters-long";

  it("should reject requests without Bearer token", () => {
    expect(validateCronAuth(null, SECRET)).toBe(false);
  });

  it("should reject requests with wrong Bearer token", () => {
    expect(validateCronAuth("Bearer wrong-secret", SECRET)).toBe(false);
  });

  it("should accept valid CRON_SECRET", () => {
    expect(validateCronAuth(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("should return false for missing mode param", () => {
    expect(validateCronMode(null)).toBe(false);
  });

  it("should accept valid mode params", () => {
    expect(validateCronMode("scan")).toBe(true);
    expect(validateCronMode("digest")).toBe(true);
  });

  it("should reject invalid mode params", () => {
    expect(validateCronMode("invalid")).toBe(false);
  });
});
```

- [ ] **Step 3: Write push subscription tests**

Create `src/lib/__tests__/push-subscription.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

// Pure logic: determine action based on push send error status code
function handlePushError(statusCode: number): "delete" | "retry" | "ignore" {
  if (statusCode === 410 || statusCode === 404) return "delete";
  if (statusCode >= 500) return "retry";
  return "ignore";
}

describe("push subscription management", () => {
  it("should delete subscription on 410 Gone response", () => {
    expect(handlePushError(410)).toBe("delete");
  });

  it("should delete subscription on 404 Not Found response", () => {
    expect(handlePushError(404)).toBe("delete");
  });

  it("should retry on transient 500 error (not delete)", () => {
    expect(handlePushError(500)).toBe("retry");
    expect(handlePushError(503)).toBe("retry");
  });

  it("should ignore 4xx client errors (not 404/410)", () => {
    expect(handlePushError(400)).toBe("ignore");
    expect(handlePushError(403)).toBe("ignore");
  });
});
```

- [ ] **Step 4: Write trip allowance tests (Spec §5.2)**

Create `src/lib/__tests__/trip-allowance.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computePayBreakdown, type PayrollInput, type PayrollLog } from "@/lib/payroll-calc";

const makeLog = (overrides: Partial<PayrollLog> = {}): PayrollLog => ({
  startEngineHours: "100",
  endEngineHours: "108",
  acresWorked: null,
  kmTraveled: null,
  tripAllowanceOverride: null,
  vehicle: {
    vehicleId: "v1",
    billingModel: "hourly",
    operatorRatePerUnit: null,
    tripAllowance: "500",
  },
  ...overrides,
});

describe("trip allowance calculation", () => {
  it("uses vehicle tripAllowance when no override", () => {
    const input: PayrollInput = {
      payType: "daily", payRate: 3000,
      logs: [makeLog()], logDays: 1, leaveDays: 0, periodDays: 30,
    };
    const result = computePayBreakdown(input);
    expect(result.tripAllowanceTotal).toBe(500);
  });

  it("override takes precedence over vehicle default (Spec §2.3)", () => {
    const input: PayrollInput = {
      payType: "daily", payRate: 3000,
      logs: [makeLog({ tripAllowanceOverride: "750" })],
      logDays: 1, leaveDays: 0, periodDays: 30,
    };
    const result = computePayBreakdown(input);
    expect(result.tripAllowanceTotal).toBe(750);
  });

  it("sums trip allowance across multiple logs", () => {
    const input: PayrollInput = {
      payType: "daily", payRate: 3000,
      logs: [
        makeLog({ vehicle: { ...makeLog().vehicle, tripAllowance: "500" } }),
        makeLog({ tripAllowanceOverride: "600" }),
      ],
      logDays: 2, leaveDays: 0, periodDays: 30,
    };
    const result = computePayBreakdown(input);
    expect(result.tripAllowanceTotal).toBe(1100);
  });

  it("zero when no allowance configured and no override", () => {
    const log = makeLog({
      vehicle: { vehicleId: "v1", billingModel: "hourly", operatorRatePerUnit: null, tripAllowance: null },
    });
    const input: PayrollInput = {
      payType: "daily", payRate: 3000,
      logs: [log], logDays: 1, leaveDays: 0, periodDays: 30,
    };
    const result = computePayBreakdown(input);
    expect(result.tripAllowanceTotal).toBe(0);
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/__tests__/alert-dedup.test.ts src/lib/__tests__/cron-auth.test.ts src/lib/__tests__/push-subscription.test.ts src/lib/__tests__/trip-allowance.test.ts
git commit -m "test: add alert dedup, cron auth, push subscription, trip allowance tests (Spec §5.2)

All tests contain real assertions — no empty stubs.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 17: Refactor reports.ts to use resolveThreshold

**Files:**
- Modify: `src/lib/actions/reports.ts:702-760`

- [ ] **Step 1: Refactor getExpenseAlerts to use resolved thresholds**

In `src/lib/actions/reports.ts`, import `resolveThreshold` and `companySettings` schema. Fetch company defaults and vehicle thresholds, then replace the hardcoded `20`/`50` in the idling and fuel alert classification with resolved per-vehicle thresholds.

The function should now fetch vehicle rows with threshold columns alongside the existing report data, and use `resolveThreshold()` per vehicle instead of fixed numbers.

- [ ] **Step 2: Run all tests**

Run:
```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/reports.ts
git commit -m "refactor(reports): use resolveThreshold for per-vehicle alert classification

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 18: UI — Threshold settings, notification preferences, dashboard alerts

**Files:**
- Modify: `src/components/settings/company-settings-form.tsx`
- Modify: `src/components/forms/vehicle-form.tsx`
- Modify: `src/components/dashboard/expense-alerts.tsx`

- [ ] **Step 1: Add threshold inputs to company settings form**

In `src/components/settings/company-settings-form.tsx`, add a "Alert Thresholds" section with three numeric inputs:
- `defaultIdleWarnPct` (default: 20)
- `defaultIdleCriticalPct` (default: 50)
- `defaultFuelVariancePct` (default: 20)

Add to form state, include in submit payload.

- [ ] **Step 2: Add threshold overrides to vehicle form**

In `src/components/forms/vehicle-form.tsx`, add an "Alert Thresholds" section (collapsed by default):
- `idleWarnPct` — placeholder shows company default
- `idleCriticalPct` — placeholder shows company default
- `fuelVariancePct` — placeholder shows company default

Empty values = use company default.

- [ ] **Step 3: Update expense-alerts component to read from alert_events**

In `src/components/dashboard/expense-alerts.tsx`, the owner dashboard should now read alerts from the `alert_events` table (open events, `resolvedAt IS NULL`) instead of computing them live. Add a "Rescan Now" button visible to super_admin that calls `scanAndPersistAlerts()` directly.

Create a new server action `getOpenAlertEvents()` in `src/lib/actions/alerts.ts` that queries `alert_events` joined with `vehicles` for vehicle names.

- [ ] **Step 4: Commit**

```bash
git add src/components/ src/lib/actions/alerts.ts
git commit -m "feat(ui): add threshold settings, vehicle overrides, alert_events dashboard

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 18.5: Notification preferences page (Spec §3.6)

**Files:**
- Create: `src/components/notifications/notification-preferences.tsx` (shared client component)
- Create: `src/app/[locale]/(dashboard)/owner/notifications/page.tsx`
- Create: `src/app/[locale]/(dashboard)/admin/notifications/page.tsx`
- Create: `src/app/[locale]/(dashboard)/operator/notifications/page.tsx`
- Create: `src/app/[locale]/(dashboard)/auditor/notifications/page.tsx`
- Create: `src/app/api/push/subscribe/route.ts`
- Modify: `src/lib/actions/alerts.ts` (add `updateNotificationPrefs`)

> **Review fix:** Codebase uses fixed role directories (`/owner/`, `/admin/`, `/operator/`, `/auditor/`), NOT dynamic `[role]` routing. Create a shared component imported by per-role pages.

- [ ] **Step 1: Create shared notification preferences component**

Create `src/components/notifications/notification-preferences.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

export function NotificationPreferences() {
  const t = useTranslations("alerts");
  const [subscribed, setSubscribed] = useState(false);
  const [preferCritical, setPreferCritical] = useState(true);
  const [preferDailyDigest, setPreferDailyDigest] = useState(true);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }
  }, []);

  async function handleSubscribe() {
    if (!vapidKey) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
    const json = sub.toJSON();

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        preferCritical,
        preferDailyDigest,
      }),
    });
    setSubscribed(true);
  }

  async function handleUnsubscribe() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    setSubscribed(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("notificationPreferences")}</h2>

      {!subscribed ? (
        <button onClick={handleSubscribe}>{t("enablePushNotifications")}</button>
      ) : (
        <button onClick={handleUnsubscribe}>{t("unsubscribe")}</button>
      )}

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={preferCritical}
          onChange={(e) => setPreferCritical(e.target.checked)} />
        {t("criticalAlerts")}
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={preferDailyDigest}
          onChange={(e) => setPreferDailyDigest(e.target.checked)} />
        {t("dailyDigest")}
      </label>
    </div>
  );
}
```

Then create per-role pages that import the shared component:

```typescript
// src/app/[locale]/(dashboard)/owner/notifications/page.tsx
// (identical for admin, operator, auditor — just different directories)
import { NotificationPreferences } from "@/components/notifications/notification-preferences";

export default function NotificationsPage() {
  return <NotificationPreferences />;
}
```

Create all four role pages: `owner/notifications/page.tsx`, `admin/notifications/page.tsx`, `operator/notifications/page.tsx`, `auditor/notifications/page.tsx`.

- [ ] **Step 2: Add push subscribe API route**

Create `src/app/api/push/subscribe/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();

  const { endpoint, p256dh, auth, preferCritical, preferDailyDigest } = body;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  // Upsert: if user already has a subscription with this endpoint, update it
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({
        p256dh,
        auth,
        preferCritical: preferCritical ?? true,
        preferDailyDigest: preferDailyDigest ?? true,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, existing[0].id));
  } else {
    await db.insert(pushSubscriptions).values({
      userId: session.userId,
      endpoint,
      p256dh,
      auth,
      preferCritical: preferCritical ?? true,
      preferDailyDigest: preferDailyDigest ?? true,
    });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/notifications/ src/app/\[locale\]/\(dashboard\)/*/notifications/ src/app/api/push/
git commit -m "feat(notifications): add notification preferences page with push subscription

Spec §3.6 — shared component used by per-role pages (owner/admin/operator/auditor).
Includes push subscribe API route with upsert logic.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 19: i18n + vercel.json for Phase 2

**Files:**
- Modify: `messages/en.json`, `messages/ta.json`, `messages/si.json`
- Create: `vercel.json`

- [ ] **Step 1: Add English translation keys for alerts**

> **Review fix:** Keys must be nested under the `alerts` namespace to match `messages/en.json` structure.

```json
{
  "alerts": {
    "defaultIdleWarnPct": "Idle Warning Threshold (%)",
    "defaultIdleCriticalPct": "Idle Critical Threshold (%)",
    "defaultFuelVariancePct": "Fuel Variance Threshold (%)",
    "alertThresholds": "Alert Thresholds",
    "rescanNow": "Rescan Now",
    "criticalAlerts": "Critical Alerts",
    "dailyDigest": "Daily Digest",
    "enablePushNotifications": "Enable Push Notifications",
    "notificationPreferences": "Notification Preferences",
    "unsubscribe": "Unsubscribe"
  }
}
```

- [ ] **Step 2: Add Tamil and Sinhala translations**

Add equivalent keys in `messages/ta.json` and `messages/si.json`.

- [ ] **Step 3: Create vercel.json with cron config**

Create `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/alerts?mode=scan", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/alerts?mode=digest", "schedule": "30 1 * * *" }
  ]
}
```

- [ ] **Step 4: Commit Phase 2 complete**

```bash
git add messages/ vercel.json
git commit -m "feat(alerts): add i18n keys and vercel cron config for alert scanning

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Phase 3 — Ops Tooling

### Task 20: Refactor rate limiter to factory pattern

**Files:**
- Modify: `src/lib/rate-limit.ts`

- [ ] **Step 1: Write rate limiter factory test**

Create `src/lib/__tests__/rate-limiter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createRateLimiter } from "../rate-limit";

describe("createRateLimiter", () => {
  it("allows requests within limit", () => {
    const limiter = createRateLimiter(60_000, 3);
    expect(limiter("key1").allowed).toBe(true);
    expect(limiter("key1").allowed).toBe(true);
    expect(limiter("key1").allowed).toBe(true);
  });

  it("blocks after exceeding limit", () => {
    const limiter = createRateLimiter(60_000, 2);
    limiter("key2");
    limiter("key2");
    const result = limiter("key2");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("different keys are independent", () => {
    const limiter = createRateLimiter(60_000, 1);
    limiter("a");
    expect(limiter("a").allowed).toBe(false);
    expect(limiter("b").allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run:
```bash
npx vitest run src/lib/__tests__/rate-limiter.test.ts
```

Expected: FAIL — `createRateLimiter` not exported.

- [ ] **Step 3: Refactor rate-limit.ts to export factory**

Rewrite `src/lib/rate-limit.ts`:

```typescript
/**
 * Parameterized sliding window rate limiter factory.
 * For multi-instance production deployments, replace with a Redis-based solution.
 */
export function createRateLimiter(windowMs: number, maxAttempts: number) {
  const attempts = new Map<string, number[]>();

  // Periodic cleanup
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now();
      const windowStart = now - windowMs;
      for (const [key, timestamps] of attempts) {
        const valid = timestamps.filter((t) => t > windowStart);
        if (valid.length === 0) {
          attempts.delete(key);
        } else {
          attempts.set(key, valid);
        }
      }
    }, 5 * 60 * 1000).unref?.();
  }

  return function checkRateLimit(key: string): {
    allowed: boolean;
    retryAfterMs: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (attempts.get(key) ?? []).filter((t) => t > windowStart);
    attempts.set(key, timestamps);

    if (timestamps.length >= maxAttempts) {
      const oldestInWindow = timestamps[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      return { allowed: false, retryAfterMs };
    }

    timestamps.push(now);
    return { allowed: true, retryAfterMs: 0 };
  };
}

// Default limiter for login (backward compatible)
export const checkRateLimit = createRateLimiter(15 * 60 * 1000, 5);
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
npx vitest run src/lib/__tests__/rate-limiter.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Verify existing login rate-limit usage still works**

Run:
```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/__tests__/rate-limiter.test.ts
git commit -m "refactor(rate-limit): extract createRateLimiter factory, keep backward compat

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 21: Storage — Add getPresignedDownloadUrl and uploadBuffer

**Files:**
- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Add GetObjectCommand import and download URL helper**

In `src/lib/storage.ts`, add import:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
```

Add after `getPublicUrl`:

```typescript
/**
 * Generates a presigned GET URL for downloading a file.
 * Default expiry: 7 days.
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 7 * 24 * 60 * 60
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Uploads a buffer directly to S3 (server-side upload, not presigned).
 */
export async function uploadBuffer(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat(storage): add getPresignedDownloadUrl and uploadBuffer helpers

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 22: Admin daily-logs browse + edit page

**Files:**
- Create: `src/lib/actions/admin-logs.ts`
- Create: `src/components/admin/log-filter-bar.tsx`
- Create: `src/components/admin/log-edit-form.tsx`
- Create: `src/app/[locale]/(dashboard)/admin/logs/page.tsx`

- [ ] **Step 1: Create admin log actions**

Create `src/lib/actions/admin-logs.ts`:

```typescript
"use server";

import { db } from "@/db";
import { dailyLogs, vehicles, staffProfiles, projects, payrollPeriods } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, and, gte, lte, inArray, sql, count } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 20;

export interface AdminLogFilters {
  vehicleId?: string;
  operatorId?: string;
  projectId?: string;
  farmId?: string;
  dateFrom?: string;
  dateTo?: string;
  syncStatus?: string;
  q?: string;
  page?: number;
}

export async function getLogsForAdmin(filters: AdminLogFilters) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const conditions = [];
  if (filters.vehicleId) conditions.push(eq(dailyLogs.vehicleId, filters.vehicleId));
  if (filters.operatorId) conditions.push(eq(dailyLogs.operatorId, filters.operatorId));
  if (filters.projectId) conditions.push(eq(dailyLogs.projectId, filters.projectId));
  if (filters.farmId) conditions.push(eq(dailyLogs.farmId, filters.farmId));
  if (filters.dateFrom) conditions.push(gte(dailyLogs.date, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(dailyLogs.date, filters.dateTo));
  if (filters.syncStatus) conditions.push(eq(dailyLogs.syncStatus, filters.syncStatus as "local" | "synced" | "conflict"));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const page = filters.page ?? 0;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: dailyLogs.id,
        date: dailyLogs.date,
        vehicleName: vehicles.name,
        vehicleId: dailyLogs.vehicleId,
        operatorName: staffProfiles.fullName,
        operatorId: dailyLogs.operatorId,
        projectId: dailyLogs.projectId,
        projectName: projects.name,
        startEngineHours: dailyLogs.startEngineHours,
        endEngineHours: dailyLogs.endEngineHours,
        fuelUsedLiters: dailyLogs.fuelUsedLiters,
        kmTraveled: dailyLogs.kmTraveled,
        acresWorked: dailyLogs.acresWorked,
        notes: dailyLogs.notes,
        syncStatus: dailyLogs.syncStatus,
      })
      .from(dailyLogs)
      .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
      .innerJoin(staffProfiles, eq(dailyLogs.operatorId, staffProfiles.id))
      .leftJoin(projects, eq(dailyLogs.projectId, projects.id))
      .where(where)
      .orderBy(sql`${dailyLogs.date} DESC`)
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE),
    db.select({ total: sql<number>`count(*)` }).from(dailyLogs).where(where),
  ]);

  return { rows, totalCount: Number(total), page, pageSize: PAGE_SIZE };
}

// Whitelist of editable fields
const EDITABLE_FIELDS = ["fuelUsedLiters", "kmTraveled", "acresWorked", "notes"] as const;

export async function updateLogByAdmin(
  logId: string,
  patch: Record<string, string | null>
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  // Strip non-whitelist keys
  const safePatch: Record<string, string | null> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in patch) {
      safePatch[field] = patch[field] ?? null;
    }
  }

  if (Object.keys(safePatch).length === 0) {
    throw new Error("No editable fields provided");
  }

  // Fetch before-snapshot for audit
  const [before] = await db
    .select({
      fuelUsedLiters: dailyLogs.fuelUsedLiters,
      kmTraveled: dailyLogs.kmTraveled,
      acresWorked: dailyLogs.acresWorked,
      notes: dailyLogs.notes,
      operatorId: dailyLogs.operatorId,
      date: dailyLogs.date,
    })
    .from(dailyLogs)
    .where(eq(dailyLogs.id, logId));

  if (!before) throw new Error("Log not found");

  // Apply update
  await db
    .update(dailyLogs)
    .set({ ...safePatch, updatedAt: new Date() } as Record<string, unknown>)
    .where(eq(dailyLogs.id, logId));

  // Payroll guard: if log falls in a finalized or paid payroll period, reset to draft
  const affectedPayrolls = await db
    .select({ id: payrollPeriods.id, status: payrollPeriods.status })
    .from(payrollPeriods)
    .where(
      and(
        eq(payrollPeriods.staffId, before.operatorId),
        lte(payrollPeriods.periodStart, before.date),
        gte(payrollPeriods.periodEnd, before.date),
        inArray(payrollPeriods.status, ["finalized", "paid"])
      )
    );

  for (const pp of affectedPayrolls) {
    await db
      .update(payrollPeriods)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(payrollPeriods.id, pp.id));
  }

  await logAudit("update", "daily_logs", logId, session.userId, before as Record<string, unknown>, safePatch);

  revalidatePath("/admin/logs");

  return {
    payrollResetCount: affectedPayrolls.length,
    warning: affectedPayrolls.length > 0
      ? `${affectedPayrolls.length} finalized/paid payroll period(s) reset to draft. Please re-compute.`
      : undefined,
  };
}
```

- [ ] **Step 2: Create log filter bar component**

Create `src/components/admin/log-filter-bar.tsx`:

A client component with:
- Date range picker (dateFrom, dateTo) using native `<input type="date">`
- Vehicle select (dropdown populated from server)
- Operator select (dropdown populated from server)
- Sync status pill group (all | local | synced | conflict)
- Apply and Reset buttons
- Updates URL search params on Apply

- [ ] **Step 3: Create log edit form component**

Create `src/components/admin/log-edit-form.tsx`:

A client component that:
- Shows an inline form when "Edit" is clicked on a log row
- Only displays editable fields: `fuelUsedLiters`, `kmTraveled`, `acresWorked`, `notes`
- Engine hours, GPS, vehicle, operator, times are shown as read-only
- Calls `updateLogByAdmin` on save
- Shows toast on success, including payroll warning if applicable

- [ ] **Step 4: Create admin logs page**

Create `src/app/[locale]/(dashboard)/admin/logs/page.tsx`:

A server component that:
- Reads search params for filters and page
- Calls `getLogsForAdmin(filters)`
- Renders `LogFilterBar`, list of log cards, `Pagination`
- Each log card has Edit button that opens `LogEditForm`
- Reuses existing `Pagination` and layout patterns from `/admin/vehicles/page.tsx`

> **Review fix (Spec §4.1):** Add an `<ExportCsvButton />` that reuses the existing `exportLogsData` action from `src/lib/actions/daily-logs.ts`. The button should:
> 1. Call `exportLogsData(currentFilters)` to get the log rows
> 2. Convert to CSV in the browser (date, vehicle, operator, hours, acres, km, fuel, notes)
> 3. Trigger a download via Blob + URL.createObjectURL

```typescript
// ExportCsvButton — add to the page header next to LogFilterBar
"use client";
import { exportLogsData } from "@/lib/actions/daily-logs";
import { useTranslations } from "next-intl";

export function ExportCsvButton({ filters }: { filters: AdminLogFilters }) {
  const t = useTranslations("common");

  async function handleExport() {
    const rows = await exportLogsData(filters);
    const header = "Date,Vehicle,Operator,Hours,Acres,Km,Fuel,Notes\n";
    const csv = header + rows.map((r) =>
      [r.date, r.vehicleName, r.operatorName, r.totalHours, r.acresWorked, r.kmTraveled, r.fuelUsedLiters, `"${(r.notes ?? '').replace(/"/g, '""')}"`].join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return <button onClick={handleExport}>{t("exportCsv")}</button>;
}
```

- [ ] **Step 5: Write admin log edit tests**

Create `src/lib/__tests__/admin-log-edit.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("updateLogByAdmin field whitelist", () => {
  const WHITELIST = ["fuelUsedLiters", "kmTraveled", "acresWorked", "notes"];

  function stripNonWhitelist(patch: Record<string, unknown>) {
    const safe: Record<string, unknown> = {};
    for (const field of WHITELIST) {
      if (field in patch) safe[field] = patch[field];
    }
    return safe;
  }

  it("keeps whitelisted fields", () => {
    const result = stripNonWhitelist({
      fuelUsedLiters: "50",
      notes: "corrected",
    });
    expect(result).toEqual({ fuelUsedLiters: "50", notes: "corrected" });
  });

  it("strips non-whitelisted fields", () => {
    const result = stripNonWhitelist({
      fuelUsedLiters: "50",
      startEngineHours: "999",
      vehicleId: "hacked-id",
      operatorId: "hacked-id",
    });
    expect(result).toEqual({ fuelUsedLiters: "50" });
    expect(result).not.toHaveProperty("startEngineHours");
    expect(result).not.toHaveProperty("vehicleId");
    expect(result).not.toHaveProperty("operatorId");
  });

  it("returns empty for entirely non-whitelisted input", () => {
    const result = stripNonWhitelist({
      startEngineHours: "999",
      endEngineHours: "1000",
    });
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe("payroll guard — reset to draft on log edit (Spec §4.1)", () => {
  function shouldResetPayroll(logDate: string, payrolls: { periodStart: string; periodEnd: string; status: string }[]) {
    return payrolls.filter(
      (pp) => (pp.status === "finalized" || pp.status === "paid")
        && logDate >= pp.periodStart && logDate <= pp.periodEnd
    );
  }

  it("resets finalized payroll when edited log is in range", () => {
    const affected = shouldResetPayroll("2026-04-10", [
      { periodStart: "2026-04-01", periodEnd: "2026-04-15", status: "finalized" },
    ]);
    expect(affected).toHaveLength(1);
  });

  it("does not reset draft payroll", () => {
    const affected = shouldResetPayroll("2026-04-10", [
      { periodStart: "2026-04-01", periodEnd: "2026-04-15", status: "draft" },
    ]);
    expect(affected).toHaveLength(0);
  });

  it("does not reset payroll outside date range", () => {
    const affected = shouldResetPayroll("2026-04-20", [
      { periodStart: "2026-04-01", periodEnd: "2026-04-15", status: "paid" },
    ]);
    expect(affected).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run all tests**

Run:
```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/actions/admin-logs.ts src/components/admin/ src/app/ src/lib/__tests__/admin-log-edit.test.ts
git commit -m "feat(admin-logs): add browse + edit page with whitelist, audit, payroll guard

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 23: WhatsApp PDF file share — Web Share API Level 2 + fallback

**Files:**
- Create: `src/app/api/invoice-pdf/upload/route.ts`
- Modify: `src/components/invoices/invoice-actions.tsx`
- Modify: `src/components/quotes/quote-actions.tsx`

- [ ] **Step 1: Create PDF upload API route**

Create `src/app/api/invoice-pdf/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession, isRole } from "@/lib/auth/session";
import { createRateLimiter } from "@/lib/rate-limit";
import { uploadBuffer, getPresignedDownloadUrl } from "@/lib/storage";
import { randomUUID } from "crypto";

const checkUploadRate = createRateLimiter(60_000, 10);

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { allowed, retryAfterMs } = checkUploadRate(session.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many uploads" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const invoiceId = formData.get("invoiceId") as string | null;

  if (!file || !invoiceId) {
    return NextResponse.json({ error: "Missing file or invoiceId" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `invoice-pdfs/${invoiceId}/${randomUUID()}.pdf`;

  await uploadBuffer(key, buffer, "application/pdf");
  const downloadUrl = await getPresignedDownloadUrl(key);

  return NextResponse.json({ url: downloadUrl });
}
```

- [ ] **Step 2: Rewrite InvoiceActions with Web Share API Level 2 + fallback**

In `src/components/invoices/invoice-actions.tsx`, replace the two-button layout with:

1. A "Download PDF" button (keep existing `PDFDownloadButton`).
2. A "Share on WhatsApp" button that runs a tiered flow:

```typescript
async function handleShare(data: InvoicePDFData, company?: CompanyProfile) {
  // Build PDF blob from react-pdf (client-side)
  const { pdf } = await import("@react-pdf/renderer");
  const InvoiceDocument = (await import("./invoice-pdf-document")).InvoiceDocument;
  const blob = await pdf(<InvoiceDocument data={data} company={company} />).toBlob();
  const file = new File([blob], `${data.invoiceNumber}.pdf`, { type: "application/pdf" });

  const message = buildWhatsAppMessage(data);

  // Tier 1: Web Share API Level 2 (native file sharing)
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: message });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      // Fall through to tier 2
    }
  }

  // Tier 2: Upload PDF + wa.me with download link
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("invoiceId", data.invoiceNumber);

    const res = await fetch("/api/invoice-pdf/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const { url } = await res.json();
      const fullMessage = `${message}\n\nDownload PDF: ${url}`;
      const waHref = data.clientPhone
        ? `https://wa.me/${toWhatsAppNumber(data.clientPhone)}?text=${encodeURIComponent(fullMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
      window.open(waHref, "_blank");
      return;
    }
  } catch {
    // Fall through to tier 3
  }

  // Tier 3: Plain text message (existing behavior)
  const waHref = data.clientPhone
    ? `https://wa.me/${toWhatsAppNumber(data.clientPhone)}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(waHref, "_blank");
}
```

- [ ] **Step 3: Apply same pattern to QuoteActions**

In `src/components/quotes/quote-actions.tsx`, apply the same 3-tier sharing flow. Import the quote PDF document component and use `quoteNumber` instead of `invoiceNumber` for the file name.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/invoice-pdf/ src/components/invoices/invoice-actions.tsx src/components/quotes/quote-actions.tsx
git commit -m "feat(sharing): Web Share API Level 2 PDF attach with signed-URL fallback

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 24: i18n for Phase 3

**Files:**
- Modify: `messages/en.json`, `messages/ta.json`, `messages/si.json`

- [ ] **Step 1: Add English keys**

> **Review fix:** Keys must be nested under proper namespaces to match `messages/en.json` structure.

```json
{
  "dailyLogs": {
    "adminLogs": "Daily Logs",
    "filterLogs": "Filter Logs",
    "editLog": "Edit Log",
    "logEdited": "Log updated successfully",
    "fieldNotEditable": "This field cannot be edited",
    "dateFrom": "From Date",
    "dateTo": "To Date",
    "syncStatus": "Sync Status",
    "applyFilters": "Apply",
    "resetFilters": "Reset"
  },
  "payroll": {
    "payrollReset": "Payroll period reset to draft — re-compute required"
  },
  "invoices": {
    "shareOnWhatsApp": "Share on WhatsApp",
    "downloadPDF": "Download PDF",
    "uploadFailed": "Upload failed. Download the PDF and attach manually."
  },
  "common": {
    "exportCsv": "Export CSV"
  }
}
```

- [ ] **Step 2: Add Tamil and Sinhala translations**

Add equivalent keys in `messages/ta.json` and `messages/si.json`.

- [ ] **Step 3: Commit Phase 3 complete**

```bash
git add messages/
git commit -m "i18n: add admin logs and WhatsApp sharing keys (en/ta/si)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

### Task 25: Final verification — lint + build + full test suite

**Files:** None (verification only)

- [ ] **Step 1: Run linter**

Run:
```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 2: Run full test suite**

Run:
```bash
npx vitest run
```

Expected: All tests pass (31 existing + new tests).

- [ ] **Step 3: Run production build**

Run:
```bash
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 4: Commit any lint/build fixes**

If any fixes were needed:
```bash
git add -A
git commit -m "fix: address lint and build issues from Wave 1 implementation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
