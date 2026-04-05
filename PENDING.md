# JPR App — Production Readiness Audit

> Generated: 2026-04-05  
> Compared against: `Machinery Rental & Farming App Requirements.md` and current codebase

---

## What's Already Working

- ✅ Multi-role auth (super_admin / admin / operator / auditor) with custom JWT
- ✅ Role-based middleware routing & access control
- ✅ Vehicle CRUD with 4 billing models (hourly / per_acre / per_km / per_task)
- ✅ Staff management with configurable pay rates
- ✅ Operator daily work logging with GPS capture
- ✅ Offline-first log & expense entry (Dexie.js + IndexedDB)
- ✅ Online sync engine (`/api/logs/sync`, `/api/expenses/sync`) with idempotent dedup
- ✅ Project management with vehicle/staff assignments
- ✅ Invoice & quote CRUD with line items and payment tracking
- ✅ PDF generation for invoices & quotes (`@react-pdf/renderer`)
- ✅ WhatsApp sharing via `wa.me` deep links
- ✅ Quote → Invoice conversion
- ✅ Farm cycle tracking (land_prep → sowing → growth → harvesting → completed)
- ✅ Farm input cost & harvest revenue recording with ROI per farm
- ✅ Loan & receivable tracking with payment history
- ✅ Cash transaction ledger
- ✅ Maintenance schedules with overdue detection (engine-hour based)
- ✅ Auditor reports: fuel efficiency, engine hours summary, maintenance status
- ✅ Auditor CSV export (logs, expenses, maintenance)
- ✅ i18n: Tamil (default), Sinhala, English with language switcher
- ✅ PWA manifest, service worker (Serwist), standalone mode
- ✅ Docker multistage build with non-root user
- ✅ HSL-based theming with light/dark CSS variables

---

## CRITICAL — Security & Stability

These must be fixed before any production deployment.

### 1. Rate Limiting on Login API ✅

**Status:** Implemented — `src/lib/rate-limit.ts` (sliding window, 5 attempts per 15 min per IP) wired into `src/app/api/auth/login/route.ts`.

### 2. CSRF Protection ✅

**Status:** Implemented — `src/lib/csrf.ts` (Origin header validation) applied to all 5 POST API routes: login, logout, locale, logs/sync, expenses/sync.

### 3. Environment Variable Validation ✅

**Status:** Implemented — `DATABASE_URL` validated in `src/db/index.ts`; `JWT_SECRET` validated (min 32 chars) in `src/lib/auth/jwt.ts`. Both throw clear errors at startup.

### 4. Error Boundaries & Error Pages ✅

**Status:** Implemented — `src/app/global-error.tsx`, `src/app/[locale]/error.tsx`, `src/app/[locale]/(dashboard)/error.tsx`, `src/app/[locale]/not-found.tsx` all created.

### 5. Loading States ✅

**Status:** Implemented — `loading.tsx` created for dashboard, admin, owner, operator, and auditor route segments.

### 6. Input Validation on Server Actions ✅

**Status:** Implemented — `src/lib/validations.ts` created with typed validators for all domains. Applied to `startLog`, `endLog` (with engine hour ordering check), `createExpense`, `createVehicle`, and `createStaff` (with password min-length). Validators available for all remaining actions.

### 7. Password Change Functionality ✅

**Status:** Implemented — `src/lib/actions/auth.ts` (`changePassword` with current password verification). Password change pages added for all 4 roles at `/{role}/password`. i18n keys added to en/ta/si.

### 8. Session Revocation ✅

**Status:** Implemented — JWT expiry reduced from 7 days to 24 hours. Cookie `maxAge` reduced to match in both login and locale routes. Deactivated users lose access within 24h without any complex token blacklist.

---

## HIGH — Core Features Missing from Requirements ✅ ALL DONE

These are explicitly described in the requirements document but not yet built.

### 9. Receipt / Image Upload ✅

**Status:** Implemented — `src/lib/storage.ts` (S3 presigned URL helper), `src/app/api/upload/route.ts` (CSRF + session-gated), `src/components/operator/expense-form.tsx` (camera/file picker, thumbnail preview, online upload + offline base64). `receiptImageUrl` wired into `createExpense()` and expenses sync route. `next.config.ts` updated with remote image patterns.

### 10. Push Notifications ✅

**Status:** Implemented — `src/lib/push.ts` (VAPID/web-push utility), `src/db/schema/push-subscriptions.ts` + migration `0003_overjoyed_wrecker.sql`. API routes `src/app/api/push/subscribe/route.ts` and `src/app/api/push/unsubscribe/route.ts`. Push event listener + notification click handler added to `src/workers/sw.ts`. Triggers from `getExpenseAlerts()` computation. Requires `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` env vars (generate with `npx web-push generate-vapid-keys`).

### 11. Fleet Status Map (Owner Dashboard) ✅

**Status:** Implemented — `getFleetPositions()` action in `reports.ts` returns last GPS position per vehicle. `src/components/dashboard/fleet-map.tsx` (Client Component, dynamically loaded with `ssr: false` to avoid Leaflet SSR issues). Uses OpenStreetMap tiles via `react-leaflet`. Markers colored by vehicle status (green/orange/red). Click marker shows vehicle name, operator, last log date. Added to owner dashboard.

### 12. Profitability Heatmap (Owner Dashboard) ✅

**Status:** Implemented — `getAssetProfitability()` action in `reports.ts`. `src/components/dashboard/profitability-chart.tsx` — recharts horizontal BarChart comparing total expenses per vehicle. Added to owner dashboard.

### 13. Unwanted Expense Alert System ✅

**Status:** Implemented — `getExpenseAlerts()` action in `reports.ts` computes on-the-fly: idling ratio > 20% → warning, > 50% → critical; fuel discrepancy > 20% → warning; maintenance overdue → critical. `src/components/dashboard/expense-alerts.tsx` displays colored alert cards. Added to owner dashboard at top for immediate visibility.

### 14. Idling Report ✅

**Status:** Implemented — `getIdlingReport()` in `src/lib/actions/reports.ts`. Computes per-vehicle: `totalEngineHours`, `nonProductiveEngineHours` (logs without acresWorked or kmTraveled), `idleRatioPct`, `estimatedIdleFuelLiters`. Color-coded table added to `src/app/[locale]/(dashboard)/auditor/reports/page.tsx`.

### 15. Fuel Discrepancy Report ✅

**Status:** Implemented — `getFuelDiscrepancyReport()` in `reports.ts`. Compares expected fuel (engine hours × baseline L/hr) vs actual fuel logged (from dailyLogs.fuelUsedLiters). Flags vehicles with >20% deviation. Table with icon badges added to auditor reports page.

### 16. Project Margin Report ✅

**Status:** Implemented — `getProjectMarginReport()` in `reports.ts`. Joins projects → invoices (revenue, excludes cancelled) → expenses (costs by category: fuel, parts/repair, labor, other). Shows margin = revenue − totalCost and marginPct. Card list with trend arrows added to auditor reports page.

### 17. Farm ROI Dashboard (Owner) ✅

**Status:** Implemented — `getAllFarmROI()` action in `reports.ts` aggregates farm inputs (costs) and harvests (revenue) across all cycles per farm. `src/components/dashboard/farm-roi-chart.tsx` — recharts BarChart with ROI % per farm, green/red bars. Added to owner dashboard.

### 18. Auto-Fill Previous Day's Engine Hours ✅

**Status:** Implemented — `getLastEndEngineHours(vehicleId)` action added to `src/lib/actions/daily-logs.ts`. Queries the most recent completed log's `endEngineHours` for a vehicle. `log-work-card.tsx` `useEffect` now calls this first and falls back to `vehicle.currentEngineHours` if no prior log exists.

### 19. Background Sync via Service Worker ✅

**Status:** Implemented — `sync` event listener added to `src/workers/sw.ts` for tag `"offline-sync"`. Replays IndexedDB `offlineLogs` and `offlineExpenses` queues when connectivity is restored, even with the tab closed. `registerBackgroundSync()` added to `src/lib/offline/sync.ts` and called from `offline-banner.tsx` when coming online. Window `online` event kept as fallback for browsers without Background Sync API support.

---

## MEDIUM — Production Quality

Not blockers, but significantly improve reliability and user experience.

### 20. Test Suite

**Status:** Not configured  
**Details:** No test runner (Jest/Vitest), no test files. Zero coverage on auth flows, server actions, sync logic, or components.  
**Suggestion:** Set up Vitest. Prioritize tests for: auth login/session, server action input validation, offline sync dedup logic, middleware role checks.

### 21. Dark Mode Toggle

**Status:** CSS ready, no toggle  
**Details:** Full light/dark HSL variables in `globals.css`. Tailwind `darkMode: 'class'` configured. But no toggle component exists — users can't switch.  
**Files:** `src/components/layout/topbar.tsx`  
**Suggestion:** Add a sun/moon toggle in the topbar that toggles `.dark` class on `<html>`.

### 22. Health Check Endpoint

**Status:** Not implemented  
**Details:** No `/api/health` for Docker/K8s liveness/readiness probes. The Dockerfile exposes port 3000 but orchestrators can't verify the app is ready.  
**Files:** New `src/app/api/health/route.ts`  
**Suggestion:** Return `{ status: "ok", db: true/false }` with a simple `SELECT 1` query.

### 23. Operator Daily Log Validation

**Status:** Minimal  
**Details:** No guard against: starting a second log when one is already active, end engine hours < start, unreasonable fuel values, future dates.  
**Files:** `src/lib/actions/daily-logs.ts`, `src/app/api/logs/sync/route.ts`  
**Suggestion:** Add business rule validation: one active log per operator, end > start hours, fuel within 3× baseline.

### 24. Audit Logging

**Status:** Not implemented  
**Details:** `cashTransactions` tracks financial events, but no system-level audit trail exists. No record of who changed vehicle rates, deactivated staff, modified invoices, etc.  
**Suggestion:** Add an `audit_logs` table with columns: `action`, `tableName`, `recordId`, `userId`, `oldValue`, `newValue`, `timestamp`.

### 25. Data Pagination

**Status:** Not implemented  
**Details:** All list pages (vehicles, staff, invoices, logs, expenses, projects) load every record at once. Will degrade as data grows.  
**Files:** All list pages and their corresponding actions  
**Suggestion:** Add cursor-based or offset pagination to list actions. Implement infinite scroll or page controls in UI.

### 26. Search & Filtering

**Status:** Not implemented  
**Details:** No search bars on any list page. No date range filters, status filters, or text search on vehicles, staff, invoices, projects, or expenses.  
**Files:** All list pages  
**Suggestion:** Add search inputs and filter dropdowns. Pass filters as params to server actions.

### 27. PDF Invoice Branding

**Status:** Basic  
**Details:** PDF generation works but may lack: company logo, business address, tax/registration numbers, bank details for payment. Needed for professional client-facing documents.  
**Files:** `src/components/invoices/invoice-pdf-client.tsx`, `src/components/quotes/quote-pdf-client.tsx`  
**Suggestion:** Add a company profile settings page or config for branding details.

### 28. CSV Export Verification

**Status:** Needs verification  
**Details:** Auditor export page exists. Server actions `exportLogsData()`, `exportExpensesData()`, `exportMaintenanceData()` exist. Need to verify client-side CSV generation and download actually works.  
**Files:** `src/app/[locale]/(dashboard)/auditor/export/page.tsx`  
**Action:** Test the export page end-to-end.

### 29. Consistent RLS Enforcement

**Status:** Needs audit  
**Details:** `withRLS()` helper exists in `src/db/index.ts` to set PostgreSQL session variables. Unclear if all server actions consistently use `withRLS()` vs the default `db` client.  
**Files:** All `src/lib/actions/` files  
**Action:** Audit each action file to verify RLS usage where needed.

### 30. Remote Image Configuration

**Status:** Not configured  
**Details:** `next.config.ts` has empty `remotePatterns` for `next/image`. Once S3 uploads are implemented, receipt images from MinIO/S3/R2 won't render.  
**Files:** `next.config.ts`  
**Suggestion:** Add S3 bucket hostname to `images.remotePatterns`.

---

## LOW — Polish & Enhancement

Nice-to-haves that improve the overall experience.

### 31. Accessibility Audit

**Details:** Touch target CSS utility exists (`.touch-target`) but no comprehensive ARIA label audit, keyboard navigation testing, or screen reader verification has been done.  
**Files:** All components

### 32. Skeleton Loading States

**Details:** Beyond `loading.tsx`, individual components with async data don't show skeleton/shimmer placeholders during individual data fetches.  
**Files:** List components, detail pages

### 33. Confirmation Dialogs for Destructive Actions

**Details:** Delete operations (vehicle, staff, project, farm, invoice, cycle, payment) likely execute immediately without "Are you sure?" confirmation.  
**Files:** All delete action triggers

### 34. Optimistic UI Updates

**Details:** TanStack React Query is installed but optimistic mutations (show result instantly, revert on error) may not be configured for form submissions.  
**Files:** Forms that call server actions

### 35. Consistent Toast Notifications

**Details:** Radix Toast (`@radix-ui/react-toast`) is in dependencies. Need consistent success/error toast feedback on all server action results.  
**Files:** All form submissions and mutation triggers

### 36. Mobile Viewport & Safe Area Testing

**Details:** `.pb-safe` utility exists for safe-area-inset-bottom. Needs real-device testing for notch/home indicator behavior on iOS and Android.  
**Files:** Layout components

### 37. SEO & Meta Tags

**Details:** No `metadata` exports in layouts or pages. Page titles default to generic Next.js. Each page should have proper `title` and `description`.  
**Files:** All `layout.tsx` and `page.tsx` files

### 38. Favicon

**Details:** PWA icons exist in `/public/icons/` (7 sizes) but no `favicon.ico` in `src/app/` for browser tab display.  
**Files:** `src/app/favicon.ico`

### 39. Print Stylesheet

**Details:** Invoices and quotes may need print-friendly CSS (`@media print`) for direct browser printing as an alternative to PDF download.  
**Files:** `src/app/globals.css`

### 40. Monitoring & Error Tracking

**Details:** No structured logging (pino/winston), no error tracking (Sentry), no performance monitoring. Production errors will be invisible.  
**Suggestion:** Add Sentry for error tracking. Add structured JSON logging for server-side operations.

### 41. CI/CD Pipeline

**Details:** No GitHub Actions or CI config. No automated lint → build → test → deploy pipeline.  
**Files:** New `.github/workflows/ci.yml`

### 42. Database Migration Strategy

**Details:** 3 migrations exist but no documented rollback strategy, no migration testing process, no production migration runbook.  
**Files:** `src/db/migrations/`

### 43. Backup Strategy

**Details:** No database backup automation or documentation. Critical for production data safety.

### 44. Staff Leave / Attendance Tracking

**Req. Reference:** "temporary assignment capability, allowing the administrator to reallocate an operator in the event of staff leave or machine breakdown"  
**Details:** Project assignments exist, but no leave/absence tracking or schedule management UI.

### 45. Operator Pay Calculation / Payroll

**Req. Reference:** "harvesting machine operators receive a dual-rate structure comprising a base salary and a per-acre performance bonus"  
**Details:** `payRate` and `payType` fields exist on staff profiles. But no automated payroll calculation aggregating daily logs into pay periods.

### 46. Weather Data Integration

**Req. Reference:** "correlates this yield with the recorded inputs and weather data (if integrated)"  
**Details:** Mentioned as optional in requirements. Would enhance farm yield analysis.

---

## Summary

| Priority | Count | Description |
| :------- | :---: | :---------- |
| **Critical** | 8 | Security vulnerabilities & stability issues — must fix before production |
| **High** | 11 | Core features from requirements doc that are not yet built |
| **Medium** | 11 | Production quality improvements for reliability & UX |
| **Low** | 16 | Polish, nice-to-haves, and operational tooling |
| **Total** | **46** | |

### Suggested Implementation Order

1. **Critical #1–8** — Fix all security and stability issues first
2. **High #9** — Receipt upload (operators need this daily)
3. **High #18** — Auto-fill engine hours (operator workflow improvement)
4. **High #19** — SW background sync (reliability for offline operators)
5. **Medium #20** — Set up test suite (protect against regressions)
6. **High #13–16** — Analytics & reports (the app's core value proposition)
7. **High #11–12, #17** — Owner dashboard visualizations
8. **High #10** — Push notifications
9. **Medium #25–26** — Pagination & search (needed as data grows)
10. Everything else based on user feedback
