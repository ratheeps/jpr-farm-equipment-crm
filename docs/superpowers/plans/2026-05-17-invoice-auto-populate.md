# Invoice Auto-Populate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When admin selects a project in the invoice form, auto-populate line items from the project's uninvoiced daily logs (plus unbilled mobilization). Saving links the daily logs to the new invoice.

**Architecture:** Add a nullable `invoice_id` FK to `daily_logs` to track invoice attribution. A new read-only server action returns uninvoiced log items + preamble for the form. Each form row carries an optional `sourceLogId` so create/update/delete actions can link/release the underlying logs atomically. The existing `generateFromProject` (project page button) gets aligned with the same model to fix latent double-billing.

**Spec deviation:** Spec only added `daily_logs.invoice_id`. Implementation also adds `invoice_items.source_log_id` (nullable FK to `daily_logs`). Reason: without it, editing an existing invoice silently unlinks every previously-linked log — `updateInvoice` releases all linked logs then can't re-link because the form has no way to recover sourceLogId from `invoice_items`. The new column round-trips through `getInvoice` → form `initial.items` → submit payload → `updateInvoice` relink. Kept in sync with `daily_logs.invoice_id` on every insert. Both columns remain (one is fast filter, the other is per-item provenance).

**Tech Stack:** Next.js App Router + Server Actions, Drizzle ORM, PostgreSQL, vitest, next-intl, Tailwind.

**Spec:** [docs/superpowers/specs/2026-05-17-invoice-auto-populate-design.md](../specs/2026-05-17-invoice-auto-populate-design.md)

---

## File Map

**Modify:**
- `src/db/schema/daily-logs.ts` — add `invoiceId` FK column + invoice relation
- `src/db/schema/invoices.ts` — add `invoiceItems.sourceLogId` FK column + relation
- `src/lib/invoice-line-items.ts` — extend `InvoiceLogRow` with `id`, return `sourceLogId` on log items, add `LineItem.sourceLogId`
- `src/lib/actions/invoice-generation.ts` — add `getUninvoicedLogsForProject`; update `generateFromProject` (filter + link + write source_log_id)
- `src/lib/actions/invoices.ts` — extend `InvoiceItemData.sourceLogId`; write `source_log_id` on insert; link/release logs in `createInvoice`, `updateInvoice`, `deleteInvoice`; surface `sourceLogId` in `getInvoice`; mobilization flag handling
- `src/components/forms/invoice-form.tsx` — touched-state + `onProjectChange` + badge + carry `sourceLogId` through `initial.items` and submit
- `messages/en.json`, `messages/ta.json`, `messages/si.json` — `invoices.fromLog`, `invoices.noUninvoicedLogs`, `invoices.units.mobilization`

**Migrations** (location per [drizzle.config.ts:17](../../../drizzle.config.ts#L17) is `./src/db/migrations`; existing top file is `0013_rls_function_volatility.sql`):
- `src/db/migrations/0014_invoice_log_attribution.sql` (generated; one migration covers both columns)

**Tests (modify/add):**
- `src/lib/__tests__/invoice-generation.test.ts` — new cases for `sourceLogId` on items

**Known limitations to document in PR description:**
- Logs already billed by historical invoices stay `invoice_id = NULL` (not backfilled). Future re-runs of auto-populate could re-include them; admin reviews before save (spec §Out of Scope).
- Un-cancelling a previously-cancelled invoice via `updateInvoiceStatus` does NOT re-link the released logs. Re-linking would require re-running auto-populate.

---

## Task 1: Extend `buildInvoiceLineItems` helper with `sourceLogId`

**Files:**
- Modify: `src/lib/invoice-line-items.ts`
- Test: `src/lib/__tests__/invoice-generation.test.ts`

- [ ] **Step 1: Write failing test for sourceLogId carry-through**

Append to `src/lib/__tests__/invoice-generation.test.ts`:

```ts
describe("buildInvoiceLineItems sourceLogId", () => {
  const baseLog = {
    id: "log-abc",
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

  it("attaches sourceLogId to each log-derived item", () => {
    const items = buildInvoiceLineItems([], [baseLog, { ...baseLog, id: "log-def" }]);
    expect(items[0].sourceLogId).toBe("log-abc");
    expect(items[1].sourceLogId).toBe("log-def");
  });

  it("preamble items do not carry sourceLogId", () => {
    const preamble = [{ description: "Mobilization", quantity: "1", unit: "mobilization", rate: "5000", amount: "5000" }];
    const items = buildInvoiceLineItems(preamble, [baseLog]);
    expect(items[0].sourceLogId).toBeUndefined();
    expect(items[1].sourceLogId).toBe("log-abc");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/__tests__/invoice-generation.test.ts`
Expected: FAIL — `id` not in type, or `sourceLogId` undefined for log items.

- [ ] **Step 3: Update existing test fixtures to include `id`**

In the same file, replace the `baseLog` constant in the first `describe("buildInvoiceLineItems", ...)` block with:

```ts
const baseLog = {
  id: "log-1",
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
```

Update the `"multiple logs"` test to pass distinct ids (otherwise both rows carry `sourceLogId: "log-1"` which is logically incorrect even if the count assertion still passes):

```ts
it("multiple logs produce multiple line items", () => {
  const items = buildInvoiceLineItems([], [baseLog, { ...baseLog, id: "log-2", date: "2026-04-11" }]);
  expect(items).toHaveLength(2);
});
```

- [ ] **Step 4: Implement in helper**

Replace `src/lib/invoice-line-items.ts` with:

```ts
export interface InvoiceLogRow {
  id: string;
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
  sourceLogId?: string;
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
      sourceLogId: log.id,
    };
  });
  return [...preambleItems, ...logItems];
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm test -- src/lib/__tests__/invoice-generation.test.ts`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/invoice-line-items.ts src/lib/__tests__/invoice-generation.test.ts
git commit -m "feat(invoices): carry sourceLogId on auto-built line items"
```

---

## Task 2: Add `invoice_id` FK on `daily_logs` + `source_log_id` FK on `invoice_items`

**Files:**
- Modify: `src/db/schema/daily-logs.ts`
- Modify: `src/db/schema/invoices.ts`
- Generate: `src/db/migrations/0014_invoice_log_attribution.sql` (drizzle auto-numbers next sequential; if it picks a different number, use that)

- [ ] **Step 1: Add `invoiceId` column to `daily_logs` schema**

In `src/db/schema/daily-logs.ts`:

Add import at top:

```ts
import { invoices } from "./invoices";
```

Inside `dailyLogs` table definition, before `createdAt`, add:

```ts
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
```

Add to `dailyLogsRelations`:

```ts
export const dailyLogsRelations = relations(dailyLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [dailyLogs.vehicleId],
    references: [vehicles.id],
  }),
  operator: one(staffProfiles, {
    fields: [dailyLogs.operatorId],
    references: [staffProfiles.id],
  }),
  project: one(projects, {
    fields: [dailyLogs.projectId],
    references: [projects.id],
  }),
  invoice: one(invoices, {
    fields: [dailyLogs.invoiceId],
    references: [invoices.id],
  }),
}));
```

- [ ] **Step 2: Add `sourceLogId` column to `invoice_items` schema**

In `src/db/schema/invoices.ts`:

Add import at top of file (alongside existing imports):

```ts
import { dailyLogs } from "./daily-logs";
```

Inside `invoiceItems` table definition, after the existing `sortOrder` column, add:

```ts
  sourceLogId: uuid("source_log_id").references(() => dailyLogs.id, { onDelete: "set null" }),
```

Extend `invoiceItemsRelations`:

```ts
export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  sourceLog: one(dailyLogs, {
    fields: [invoiceItems.sourceLogId],
    references: [dailyLogs.id],
  }),
}));
```

Note: `daily-logs.ts` already imports `invoices`; both imports cross-reference but Drizzle handles this since column refs use lazy callbacks (`() => ...`). If TS reports a circular-import error, move both columns' `.references()` to be defined via Drizzle's pgTable third-arg `(table) => ({...})` builder — but in practice this is fine.

- [ ] **Step 3: Generate migration**

Run: `pnpm db:generate`
Expected: A new file appears at `src/db/migrations/0014_<slug>.sql` containing two `ALTER TABLE` statements adding `invoice_id` to `daily_logs` and `source_log_id` to `invoice_items`, both with FK + ON DELETE SET NULL. Drizzle picks the slug; rename the file to `0014_invoice_log_attribution.sql` for clarity if desired (also update `meta/_journal.json` if you rename — generally easier to keep the auto-chosen name).

- [ ] **Step 4: Add partial index in the migration**

Open the generated migration file. Append at the end:

```sql
CREATE INDEX IF NOT EXISTS "daily_logs_uninvoiced_idx"
  ON "daily_logs" ("project_id")
  WHERE "invoice_id" IS NULL;
```

(Partial index — smaller and ideal for the hot lookup `WHERE project_id = $X AND invoice_id IS NULL` used by `getUninvoicedLogsForProject` and `generateFromProject`.)

- [ ] **Step 5: Apply migration**

Run: `pnpm db:migrate`
Expected: Migration applies cleanly. No errors.

Verify:

```bash
psql $DATABASE_URL -c "\d daily_logs" | grep invoice_id
psql $DATABASE_URL -c "\d invoice_items" | grep source_log_id
psql $DATABASE_URL -c "\di daily_logs_uninvoiced_idx"
```

All three should return rows.

- [ ] **Step 6: Run full test suite (smoke)**

Run: `pnpm test`
Expected: All existing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema/daily-logs.ts src/db/schema/invoices.ts src/db/migrations/
git commit -m "feat(db): add invoice_id on daily_logs + source_log_id on invoice_items for billing attribution"
```

---

## Task 3: Add `getUninvoicedLogsForProject` server action

**Files:**
- Modify: `src/lib/actions/invoice-generation.ts`

- [ ] **Step 1: Add the action**

In `src/lib/actions/invoice-generation.ts`, add to the existing imports:

```ts
import { isNull } from "drizzle-orm";
```

Append the new exported function before the closing of the file (after `generateFromProject`):

```ts
export type AutoPopulateItem = {
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
  sourceLogId?: string;   // present on log-derived items; absent on preamble (mobilization)
};

export type AutoPopulateResult = {
  preamble: AutoPopulateItem[];
  items: AutoPopulateItem[];
  clientName: string;
  clientPhone: string | null;
};

export async function getUninvoicedLogsForProject(
  projectId: string
): Promise<AutoPopulateResult> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return await withRLS(session.userId, session.role, async (tx) => {
    const projectRows = await tx
      .select({
        clientName: projects.clientName,
        clientPhone: projects.clientPhone,
        mobilizationFee: projects.mobilizationFee,
        mobilizationBilled: projects.mobilizationBilled,
      })
      .from(projects)
      .where(eq(projects.id, projectId));
    const project = projectRows[0];
    if (!project) throw new Error("Project not found");

    const logRows = await tx
      .select({
        id: dailyLogs.id,
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
          sql`${dailyLogs.endEngineHours} IS NOT NULL`,
          isNull(dailyLogs.invoiceId)
        )
      )
      .orderBy(dailyLogs.date);

    const preamble: AutoPopulateItem[] = [];
    const shouldBillMobilization =
      project.mobilizationFee &&
      Number(project.mobilizationFee) > 0 &&
      !project.mobilizationBilled;

    if (shouldBillMobilization) {
      preamble.push({
        description: "Mobilization",
        quantity: "1",
        unit: "mobilization",
        rate: project.mobilizationFee!,
        amount: project.mobilizationFee!,
      });
    }

    const built = buildInvoiceLineItems([], logRows as InvoiceLogRow[]);
    const items: AutoPopulateItem[] = built.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      rate: it.rate,
      amount: it.amount,
      sourceLogId: it.sourceLogId,
    }));

    return {
      preamble,
      items,
      clientName: project.clientName,
      clientPhone: project.clientPhone ?? null,
    };
  });
}
```

- [ ] **Step 2: Lint + typecheck**

Run: `pnpm lint`
Expected: No new errors.

Run: `pnpm exec tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Manual smoke verification**

Start dev server: `pnpm dev`. Open browser console on `/admin/invoices/new`. Run:

```js
fetch("/admin/invoices/new").then(r => r.text()).then(() => console.log("page loads"));
```

(Verifies no SSR crash from the new export. Functional verification happens after form wiring in Task 7.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/invoice-generation.ts
git commit -m "feat(invoices): add getUninvoicedLogsForProject server action"
```

---

## Task 4: Fix `generateFromProject` — filter unbilled logs + link on insert

**Files:**
- Modify: `src/lib/actions/invoice-generation.ts`

- [ ] **Step 1: Add isNull to query filter**

In `generateFromProject`, change the existing log query `.where(...)`:

```ts
.where(
  and(
    eq(dailyLogs.projectId, projectId),
    sql`${dailyLogs.endEngineHours} IS NOT NULL`,
    isNull(dailyLogs.invoiceId)
  )
)
```

(`isNull` import already added in Task 3.)

- [ ] **Step 2: Carry `sourceLogId` into `invoice_items` rows**

Replace the existing `await tx.insert(invoiceItems).values(...)` block with:

```ts
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
      sourceLogId: item.sourceLogId ?? null,   // preamble (mobilization) is null; log items carry id
    }))
  );
}
```

`items` here is the array returned by `buildInvoiceLineItems(preamble, logRows)` — log items already carry `sourceLogId` after Task 1.

- [ ] **Step 3: Link logs to invoice after item insert**

After the modified insert block above, before `revalidatePath`, add:

```ts
const logIds = (logRows as InvoiceLogRow[]).map((l) => l.id);
if (logIds.length > 0) {
  await tx
    .update(dailyLogs)
    .set({ invoiceId: invoice.id, updatedAt: new Date() })
    .where(and(inArray(dailyLogs.id, logIds), isNull(dailyLogs.invoiceId)));
}
```

Add `inArray` to the existing drizzle imports at top:

```ts
import { eq, and, sql, isNull, inArray } from "drizzle-orm";
```

- [ ] **Step 4: Lint + typecheck**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: No new errors.

- [ ] **Step 5: Manual integration test**

1. Seed DB if needed: `pnpm db:seed`.
2. Start dev: `pnpm dev`.
3. Open a project page with completed logs. Click "Generate Invoice from Logs".
4. Verify invoice created. Open psql:
   - `SELECT id, invoice_id FROM daily_logs WHERE project_id = '<id>';` — every previously-completed log should now have `invoice_id` set.
   - `SELECT description, source_log_id FROM invoice_items WHERE invoice_id = '<new-id>';` — log-derived rows should have `source_log_id` set; mobilization row (if any) should be NULL.
5. Click button again. Expected: throws "No completed logs found for this project" (because all are now linked).

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/invoice-generation.ts
git commit -m "fix(invoices): link logs on generateFromProject to prevent double-billing"
```

---

## Task 5: Link logs on `createInvoice`

**Files:**
- Modify: `src/lib/actions/invoices.ts`

- [ ] **Step 1: Extend types + imports**

Update imports at top:

```ts
import { withRLS, type DB } from "@/db";
import { invoices, invoiceItems, invoicePayments, projects, dailyLogs } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, desc, count, sum, and, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
```

Update `InvoiceItemData`:

```ts
export type InvoiceItemData = {
  description: string;
  quantity: string;
  unit?: string;
  rate: string;
  amount: string;
  sortOrder?: number;
  sourceLogId?: string;
};
```

- [ ] **Step 2: Write `source_log_id` into `invoice_items` on insert**

Replace the existing `if (data.items.length > 0) { await tx.insert(invoiceItems).values(...) }` block in `createInvoice` with:

```ts
if (data.items.length > 0) {
  await tx.insert(invoiceItems).values(
    data.items.map((item, idx) => ({
      invoiceId: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit || null,
      rate: item.rate,
      amount: item.amount,
      sortOrder: idx,
      sourceLogId: item.sourceLogId || null,
    }))
  );
}
```

- [ ] **Step 3: Link logs + flip mobilization in `createInvoice`**

After the modified insert block, before `revalidatePath`, add:

```ts
const logIds = data.items
  .map((i) => i.sourceLogId)
  .filter((v): v is string => Boolean(v));
if (logIds.length > 0) {
  await tx
    .update(dailyLogs)
    .set({ invoiceId: invoice.id, updatedAt: new Date() })
    .where(and(inArray(dailyLogs.id, logIds), isNull(dailyLogs.invoiceId)));
}

const hasMobilization = data.items.some((i) => i.unit === "mobilization");
if (hasMobilization && data.projectId) {
  await tx
    .update(projects)
    .set({ mobilizationBilled: true, updatedAt: new Date() })
    .where(and(eq(projects.id, data.projectId), eq(projects.mobilizationBilled, false)));
}
```

- [ ] **Step 4: Lint + typecheck**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/invoices.ts
git commit -m "feat(invoices): link daily logs + flip mobilization on createInvoice"
```

---

## Task 6: Release-then-relink on `updateInvoice`; release on `deleteInvoice`

**Files:**
- Modify: `src/lib/actions/invoices.ts`

- [ ] **Step 1: Update `updateInvoice` — release + re-insert with sourceLogId + relink**

In `updateInvoice`, before the existing `await tx.delete(invoiceItems)...` line, add:

```ts
await tx
  .update(dailyLogs)
  .set({ invoiceId: null, updatedAt: new Date() })
  .where(eq(dailyLogs.invoiceId, id));
```

Then replace the existing `if (data.items.length > 0) { await tx.insert(invoiceItems).values(...) }` block with:

```ts
if (data.items.length > 0) {
  await tx.insert(invoiceItems).values(
    data.items.map((item, idx) => ({
      invoiceId: id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit || null,
      rate: item.rate,
      amount: item.amount,
      sortOrder: idx,
      sourceLogId: item.sourceLogId || null,
    }))
  );
}
```

After the modified insert block, before the first `revalidatePath`, add:

```ts
const logIds = data.items
  .map((i) => i.sourceLogId)
  .filter((v): v is string => Boolean(v));
if (logIds.length > 0) {
  await tx
    .update(dailyLogs)
    .set({ invoiceId: id, updatedAt: new Date() })
    .where(and(inArray(dailyLogs.id, logIds), isNull(dailyLogs.invoiceId)));
}

const hasMobilization = data.items.some((i) => i.unit === "mobilization");
if (hasMobilization && data.projectId) {
  await tx
    .update(projects)
    .set({ mobilizationBilled: true, updatedAt: new Date() })
    .where(and(eq(projects.id, data.projectId), eq(projects.mobilizationBilled, false)));
}
```

**Why release-then-relink is safe in one tx:** The release UPDATE acquires row locks on every `daily_logs` row currently linked to this invoice. Postgres holds those locks until COMMIT, so a concurrent `createInvoice` calling `inArray(..., isNull(invoice_id))` blocks on those rows until this tx commits — preventing a window where another invoice could steal a log between release and relink.

- [ ] **Step 2: Update `deleteInvoice`**

Replace `deleteInvoice` body inside `withRLS` with:

```ts
return withRLS(session.userId, session.role, async (tx) => {
  // Read invoice + its items (to know if mobilization was billed)
  const [inv] = await tx
    .select({ id: invoices.id, projectId: invoices.projectId })
    .from(invoices)
    .where(eq(invoices.id, id));
  if (!inv) {
    revalidatePath("/admin/invoices");
    return;
  }

  const mobilizationRows = await tx
    .select({ id: invoiceItems.id })
    .from(invoiceItems)
    .where(and(eq(invoiceItems.invoiceId, id), eq(invoiceItems.unit, "mobilization")));
  const hadMobilization = mobilizationRows.length > 0;

  // Soft-cancel
  await tx
    .update(invoices)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(invoices.id, id));

  // Release linked logs. NOTE: un-cancelling this invoice later via updateInvoiceStatus
  // does NOT re-link these logs — they remain `invoice_id = NULL` until re-attached via
  // a fresh auto-populate or manual edit. Acceptable: cancellation is treated as a hard
  // billing reversal. Documented as a known limitation in the PR description.
  await tx
    .update(dailyLogs)
    .set({ invoiceId: null, updatedAt: new Date() })
    .where(eq(dailyLogs.invoiceId, id));

  // Unflip mobilization if no other non-cancelled invoice on this project bills mobilization
  if (hadMobilization && inv.projectId) {
    const otherMobilization = await tx
      .select({ id: invoices.id })
      .from(invoices)
      .innerJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
      .where(
        and(
          eq(invoices.projectId, inv.projectId),
          eq(invoiceItems.unit, "mobilization"),
          sql`${invoices.status} <> 'cancelled'`,
          sql`${invoices.id} <> ${id}`
        )
      )
      .limit(1);
    if (otherMobilization.length === 0) {
      await tx
        .update(projects)
        .set({ mobilizationBilled: false, updatedAt: new Date() })
        .where(eq(projects.id, inv.projectId));
    }
  }

  revalidatePath("/admin/invoices");
});
```

Add `sql` to existing drizzle imports if not present:

```ts
import { eq, desc, count, sum, and, inArray, isNull, sql } from "drizzle-orm";
```

- [ ] **Step 3: Surface `sourceLogId` in `getInvoice`**

`getInvoice` returns `invoice_items` via `tx.select().from(invoiceItems)` ([src/lib/actions/invoices.ts:271](../../../src/lib/actions/invoices.ts#L271)). `tx.select()` with no projection returns all columns, so the new `source_log_id` column is already in the result — Drizzle exposes it as `sourceLogId` on each row automatically after the Task 2 schema change. **No code change strictly required.** But to make this explicit and robust against future refactors, replace the existing items query inside `getInvoice` with an explicit projection:

```ts
tx
  .select({
    id: invoiceItems.id,
    invoiceId: invoiceItems.invoiceId,
    description: invoiceItems.description,
    quantity: invoiceItems.quantity,
    unit: invoiceItems.unit,
    rate: invoiceItems.rate,
    amount: invoiceItems.amount,
    sortOrder: invoiceItems.sortOrder,
    sourceLogId: invoiceItems.sourceLogId,
  })
  .from(invoiceItems)
  .where(eq(invoiceItems.invoiceId, id))
  .orderBy(invoiceItems.sortOrder),
```

Verify the consumer page that feeds `initial` to `InvoiceForm` passes `item.sourceLogId` through. Search:

```bash
grep -rn "InvoiceForm" src/app
```

For each result, ensure the `initial.items` mapping includes `sourceLogId: item.sourceLogId ?? null` (or omits the field and lets the form default to `undefined`). If a page constructs `initial.items` with a hand-typed shape, add the field.

- [ ] **Step 4: Lint + typecheck**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Manual integration test**

1. Create an invoice via form with mobilization + 2 log items.
2. `SELECT mobilization_billed FROM projects WHERE id='<pid>';` → `true`.
3. `SELECT invoice_id FROM daily_logs WHERE project_id='<pid>';` → 2 rows with invoice id set.
4. `SELECT description, source_log_id FROM invoice_items WHERE invoice_id='<iid>';` → log rows have `source_log_id` populated; mobilization row has `NULL`.
5. **Edit-without-changes (regression guard for the unlink bug):** Open the same invoice, change only `notes`, save. Re-check `SELECT invoice_id FROM daily_logs ...` — both log rows MUST still be linked to this invoice. If they go NULL, the form did not round-trip `sourceLogId` (Task 7 Step 1) or `getInvoice` did not return it.
6. **Edit-with-removal:** Open invoice, remove 1 log row, save.
7. Re-check logs: 1 row linked, 1 row `NULL`.
8. Cancel invoice (delete action).
9. Re-check logs: both `NULL`. `mobilization_billed` → `false`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/invoices.ts
git commit -m "feat(invoices): release+relink logs on update; release on cancel"
```

---

## Task 7: Wire form auto-populate

**Files:**
- Modify: `src/components/forms/invoice-form.tsx`

- [ ] **Step 1: Extend imports + types + carry `sourceLogId` through `initial`**

The `createInvoice`/`updateInvoice` import is already present ([src/components/forms/invoice-form.tsx:7](../../../src/components/forms/invoice-form.tsx#L7)). Add only the new action import alongside it:

```ts
import { getUninvoicedLogsForProject } from "@/lib/actions/invoice-generation";
```

Replace the `Unit` and `LineItem` types:

```ts
type Unit = "hours" | "acres" | "km" | "tasks" | "mobilization";

type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unit: Unit | "";
  rate: string;
  amount: string;
  sourceLogId?: string;
};
```

Extend `InvoiceFormProps.initial.items` shape to include `sourceLogId`:

```ts
items: {
  id: string;
  description: string;
  quantity: string;
  unit?: string | null;
  rate: string;
  amount: string;
  sortOrder?: number | null;
  sourceLogId?: string | null;
}[];
```

Update the initial-items mapping inside `useState<LineItem[]>(...)` to carry sourceLogId through:

```ts
const [items, setItems] = useState<LineItem[]>(
  initial?.items.length
    ? initial.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit: (item.unit as Unit) ?? "",
        rate: item.rate,
        amount: item.amount,
        sourceLogId: item.sourceLogId ?? undefined,
      }))
    : [{ id: crypto.randomUUID(), description: "", quantity: "1", unit: "", rate: "", amount: "" }]
);
```

Replace the `units` array (in the render section, currently `const units: (Unit | "")[] = ["", "hours", "acres", "km", "tasks"];`) with:

```ts
const units: (Unit | "")[] = ["", "hours", "acres", "km", "tasks", "mobilization"];
```

- [ ] **Step 2: Add touched-state + populating state**

After the `const [items, setItems] = useState<LineItem[]>(...)` block, add:

```ts
const [itemsTouched, setItemsTouched] = useState(false);
const [populating, setPopulating] = useState(false);
```

Flip `setItemsTouched(true)` inside `updateItem`, `addItem`, `removeItem` — top of each function body:

```ts
function updateItem(id: string, field: keyof LineItem, value: string) {
  setItemsTouched(true);
  setItems((prev) =>
    prev.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "rate") {
        updated.amount = calcAmount(
          field === "quantity" ? value : item.quantity,
          field === "rate" ? value : item.rate
        );
      }
      return updated;
    })
  );
}

function addItem() {
  setItemsTouched(true);
  setItems((prev) => [
    ...prev,
    { id: crypto.randomUUID(), description: "", quantity: "1", unit: "", rate: "", amount: "" },
  ]);
}

function removeItem(id: string) {
  setItemsTouched(true);
  setItems((prev) => prev.filter((item) => item.id !== id));
}
```

- [ ] **Step 3: Add `onProjectChange` handler**

Below `removeItem`, add:

```ts
async function onProjectChange(newId: string) {
  setH("projectId", newId);
  if (!newId) return;
  if (itemsTouched) return;
  if (initial?.id) return; // don't auto-populate when editing an existing invoice

  setPopulating(true);
  setError("");
  try {
    const result = await getUninvoicedLogsForProject(newId);
    // After Task 3 type tweak, both preamble and items are `AutoPopulateItem`
    // with `sourceLogId?: string`. Spread is type-safe; no narrowing trick needed.
    const newRows: LineItem[] = [...result.preamble, ...result.items].map((it) => ({
      id: crypto.randomUUID(),
      description: it.description,
      quantity: it.quantity,
      unit: (it.unit as Unit) ?? "",
      rate: it.rate,
      amount: it.amount,
      sourceLogId: it.sourceLogId,
    }));
    if (newRows.length === 0) {
      setError(t("noUninvoicedLogs"));
      return;
    }
    setItems(newRows);
    setHeader((prev) => ({
      ...prev,
      clientName: prev.clientName || result.clientName,
      clientPhone: prev.clientPhone || result.clientPhone || "",
    }));
    setItemsTouched(false);
  } catch {
    setError(tCommon("error"));
  } finally {
    setPopulating(false);
  }
}
```

- [ ] **Step 4: Wire project select to handler + loading state**

Replace the existing project `<select>` block:

```tsx
{/* Project */}
<Field label={t("project")}>
  <select
    value={header.projectId}
    onChange={(e) => onProjectChange(e.target.value)}
    disabled={populating}
    className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base disabled:opacity-60"
  >
    <option value="">{t("noProject")}</option>
    {projects.map((p) => (
      <option key={p.id} value={p.id}>
        {p.name}
      </option>
    ))}
  </select>
  {populating && (
    <p className="text-xs text-muted-foreground mt-1">{tCommon("loading")}</p>
  )}
</Field>
```

- [ ] **Step 5: Add "from log" badge to prefilled rows**

Inside the line-items map, change the description input block to:

```tsx
<div className="space-y-1">
  {item.sourceLogId && (
    <span className="inline-block text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wide font-medium">
      {t("fromLog")}
    </span>
  )}
  <input
    type="text"
    value={item.description}
    onChange={(e) => updateItem(item.id, "description", e.target.value)}
    placeholder={t("description")}
    required
    className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
  />
</div>
```

- [ ] **Step 6: Include `sourceLogId` in submit payload**

In `handleSubmit`, update the items mapping inside `payload`:

```ts
items: items.map((item) => ({
  description: item.description,
  quantity: item.quantity,
  unit: item.unit || undefined,
  rate: item.rate,
  amount: item.amount,
  sourceLogId: item.sourceLogId,
})),
```

- [ ] **Step 7: Lint + typecheck**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/forms/invoice-form.tsx
git commit -m "feat(invoices): auto-populate items from uninvoiced logs on project select"
```

---

## Task 8: Add i18n strings

**Files:**
- Modify: `messages/en.json`, `messages/ta.json`, `messages/si.json`

- [ ] **Step 1: Add keys to `messages/en.json`**

Inside the `"invoices": { ... }` block, add `"fromLog"` and `"noUninvoicedLogs"` after the existing `"noItems"` line (mind trailing comma):

```json
"fromLog": "From log",
"noUninvoicedLogs": "No uninvoiced logs for this project",
```

Also extend the existing `"units": { ... }` sub-object inside `"invoices"` to add a `"mobilization"` entry. The unit-select renders via `t(\`units.${u}\`)` ([src/components/forms/invoice-form.tsx:310](../../../src/components/forms/invoice-form.tsx#L310)); without this key, next-intl throws when the auto-populated mobilization row renders. Final shape:

```json
"units": {
  "hours": "Hours",
  "acres": "Acres",
  "km": "KM",
  "tasks": "Tasks",
  "mobilization": "Mobilization"
}
```

- [ ] **Step 2: Add Tamil translations to `messages/ta.json`**

Inside `"invoices": { ... }`:

```json
"fromLog": "பதிவில் இருந்து",
"noUninvoicedLogs": "இந்தத் திட்டத்திற்கு விலைப்பட்டியலிடப்படாத பதிவுகள் இல்லை",
```

And inside `"invoices.units"` (mirror the same object structure as the existing Tamil units block):

```json
"mobilization": "இடமாற்றம்"
```

- [ ] **Step 3: Add Sinhala translations to `messages/si.json`**

Inside `"invoices": { ... }`:

```json
"fromLog": "ලොගයෙන්",
"noUninvoicedLogs": "මෙම ව්‍යාපෘතිය සඳහා ඉන්වොයිස් නොකළ ලොග් නැත",
```

And inside `"invoices.units"`:

```json
"mobilization": "මොබිලයිසේෂන්"
```

(Translations are placeholders — confirm wording with the user before merge if exact terminology matters; the keys themselves are what matters for the form not to crash.)

- [ ] **Step 4: Verify JSON validity**

Run: `pnpm exec tsc --noEmit`
Expected: No errors (next-intl type generation would fail if keys mismatch across locales).

Run: `node -e "require('./messages/en.json'); require('./messages/ta.json'); require('./messages/si.json'); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add messages/
git commit -m "i18n(invoices): add fromLog, noUninvoicedLogs, units.mobilization"
```

---

## Task 9: End-to-end manual verification

**Files:** none modified.

- [ ] **Step 1: Reset test data**

```bash
pnpm db:push  # if schema drifted
pnpm db:seed
```

- [ ] **Step 2: Happy path — auto-populate + save**

1. Login as admin. Navigate to `/admin/invoices/new`.
2. Select a project that has completed daily logs.
3. Expect: items list replaced with mobilization line (if applicable) + one row per uninvoiced log, each showing "FROM LOG" badge. Client name/phone prefilled. Mobilization unit label renders as "Mobilization" (no missing-translation crash).
4. Edit qty on one row. Remove a different row. Save.
5. Verify in psql:
   - `SELECT invoice_id FROM daily_logs WHERE project_id = '<pid>';` — only the kept log rows link to the new invoice; the removed log stays NULL.
   - `SELECT mobilization_billed FROM projects WHERE id = '<pid>';` — `true`.
   - `SELECT description, source_log_id FROM invoice_items WHERE invoice_id = '<iid>' ORDER BY sort_order;` — kept log rows have `source_log_id` populated; mobilization row has NULL.

- [ ] **Step 3: Idempotency — re-select same project**

1. New invoice. Select the same project.
2. Expect: only the previously-removed log appears (still uninvoiced). Mobilization not shown (already billed).

- [ ] **Step 4: Touched-state preservation**

1. New invoice. Manually edit the default blank row (type description "manual entry").
2. Select a project.
3. Expect: rows NOT replaced (admin's manual entry preserved). No badge.
4. Without saving, inspect the items array via React DevTools (or save and reload): the row description is still "manual entry".

- [ ] **Step 5: Edit-existing-invoice regression guard (covers the unlink-bug fix)**

1. Open the invoice created in Step 2 for edit.
2. Change ONLY the `notes` field. Do not touch any line item. Save.
3. Verify in psql:
   - `SELECT invoice_id FROM daily_logs WHERE invoice_id = '<iid>';` — same log rows still linked (count unchanged from after Step 2). If any row's `invoice_id` became NULL, the round-trip is broken — see Task 6 Step 3 + Task 7 Step 1.
   - `SELECT count(*) FROM invoice_items WHERE invoice_id = '<iid>' AND source_log_id IS NOT NULL;` — same count as Step 2.

- [ ] **Step 6: Existing button still works**

1. Navigate to a project page with uninvoiced logs.
2. Click "Generate Invoice from Logs".
3. Verify: new invoice created. Logs now linked. Clicking again: error "No completed logs found".

- [ ] **Step 7: Cancel flow**

1. Cancel one of the created invoices.
2. Verify: its logs released to `NULL`. If the invoice had mobilization and no other active invoice on the project has mobilization, `projects.mobilization_billed` flips back to `false`.

- [ ] **Step 8: Legacy-logs known-limitation check**

1. Pick a project whose daily logs were billed by an invoice created BEFORE this feature (i.e. predates the migration). Those logs have `invoice_id = NULL` because the spec did not backfill.
2. Open `/admin/invoices/new`, select that project. Auto-populate will list those logs as "uninvoiced" even though they were already billed historically.
3. **Expected:** admin reviews and removes them before save (this matches spec §Out of Scope). Document in PR description.

- [ ] **Step 9: Final commit (if any tweaks)**

If verification surfaces minor fixes, commit them. Otherwise, no commit needed.

---

## Self-Review Notes

- **Spec coverage:**
  - Schema (`daily_logs.invoice_id`) → Task 2 Step 1
  - **Schema extension (`invoice_items.source_log_id`, beyond spec)** → Task 2 Step 2 — required to survive existing-invoice edit; rationale in front-matter "Spec deviation"
  - Partial index `(project_id) WHERE invoice_id IS NULL` → Task 2 Step 4
  - `getUninvoicedLogsForProject` → Task 3
  - `generateFromProject` alignment (filter + link + write source_log_id) → Task 4
  - `createInvoice` linking + write source_log_id → Task 5
  - `updateInvoice` release+reinsert(with source_log_id)+relink → Task 6 Step 1
  - `deleteInvoice` release + unflip mobilization → Task 6 Step 2
  - `getInvoice` surfaces sourceLogId → Task 6 Step 3
  - Form touched-state + onChange + badge + sourceLogId round-trip → Task 7
  - i18n (fromLog, noUninvoicedLogs, units.mobilization) → Task 8
  - Manual E2E (incl. edit-existing regression guard + legacy-logs limitation) → Task 9
- **Placeholders:** none.
- **Type consistency:** `LineItem.sourceLogId?: string` (helper, Task 1), `InvoiceItemData.sourceLogId?: string` (server action, Task 5 Step 1), `AutoPopulateItem.sourceLogId?: string` (read action, Task 3), form `LineItem.sourceLogId?: string` and `InvoiceFormProps.initial.items[].sourceLogId?: string | null` (Task 7 Step 1). All optional + string-typed. The `null` in `initial` covers the DB-roundtrip case; the form maps `?? undefined` so internal state stays consistently `string | undefined`.
- **Known limitations** (surface in PR description):
  - Logs already billed by pre-feature invoices stay `invoice_id = NULL`. Future auto-populate will re-include them; admin reviews before save.
  - Un-cancelling a previously-cancelled invoice via `updateInvoiceStatus` does NOT re-link the released logs. Cancellation is treated as a hard billing reversal.
  - Concurrent cancellation of two mobilization-billing invoices on the same project may both observe "no other active mobilization invoice" and both unflip the mobilization flag. Rare; acceptable per spec §Concurrency.
