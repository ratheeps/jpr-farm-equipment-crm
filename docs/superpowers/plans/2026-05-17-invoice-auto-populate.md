# Invoice Auto-Populate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When admin selects a project in the invoice form, auto-populate line items from the project's uninvoiced daily logs (plus unbilled mobilization). Saving links the daily logs to the new invoice.

**Architecture:** Add a nullable `invoice_id` FK to `daily_logs` to track invoice attribution. A new read-only server action returns uninvoiced log items + preamble for the form. Each form row carries an optional `sourceLogId` so create/update/delete actions can link/release the underlying logs atomically. The existing `generateFromProject` (project page button) gets aligned with the same model to fix latent double-billing.

**Tech Stack:** Next.js App Router + Server Actions, Drizzle ORM, PostgreSQL, vitest, next-intl, Tailwind.

**Spec:** [docs/superpowers/specs/2026-05-17-invoice-auto-populate-design.md](../specs/2026-05-17-invoice-auto-populate-design.md)

---

## File Map

**Modify:**
- `src/db/schema/daily-logs.ts` — add `invoiceId` FK column + composite index
- `src/lib/invoice-line-items.ts` — extend `InvoiceLogRow` with `id`, return `sourceLogId` on log items, add `LineItem.sourceLogId`
- `src/lib/actions/invoice-generation.ts` — add `getUninvoicedLogsForProject`; update `generateFromProject` (filter + link)
- `src/lib/actions/invoices.ts` — extend `InvoiceItemData.sourceLogId`; link/release logs in `createInvoice`, `updateInvoice`, `deleteInvoice`; mobilization flag handling
- `src/components/forms/invoice-form.tsx` — touched-state + `onProjectChange` + badge
- `messages/en.json`, `messages/ta.json`, `messages/si.json` — `invoices.fromLog`, `invoices.noUninvoicedLogs`

**Migrations:**
- `drizzle/<timestamp>_add_daily_logs_invoice_id.sql` (generated)

**Tests (modify/add):**
- `src/lib/__tests__/invoice-generation.test.ts` — new cases for `sourceLogId` on items
- `src/lib/__tests__/invoice-line-items-source-log.test.ts` — new file (if separation cleaner) OR append

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

In the same file, update the `baseLog` constant in the first `describe("buildInvoiceLineItems", ...)` block to include `id: "log-1"`:

```ts
const baseLog = {
  id: "log-1",
  date: "2026-04-10",
  // ...rest unchanged
};
```

Update the `"multiple logs"` test to pass distinct ids:

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

## Task 2: Add `invoice_id` FK column to `daily_logs`

**Files:**
- Modify: `src/db/schema/daily-logs.ts`
- Generate: `drizzle/<timestamp>_<name>.sql`

- [ ] **Step 1: Add column to schema**

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

- [ ] **Step 2: Generate migration**

Run: `pnpm db:generate`
Expected: A new file appears in `drizzle/` with the ALTER TABLE statement adding `invoice_id uuid` with FK + ON DELETE SET NULL.

- [ ] **Step 3: Add composite index in the migration**

Open the generated migration file. Append at the end:

```sql
CREATE INDEX IF NOT EXISTS "daily_logs_project_invoice_idx"
  ON "daily_logs" ("project_id", "invoice_id");
```

- [ ] **Step 4: Apply migration**

Run: `pnpm db:migrate`
Expected: Migration applies cleanly. No errors.

Verify with: `psql $DATABASE_URL -c "\d daily_logs"` and confirm `invoice_id uuid` column + `daily_logs_project_invoice_idx` index exist.

- [ ] **Step 5: Run full test suite (smoke)**

Run: `pnpm test`
Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema/daily-logs.ts drizzle/
git commit -m "feat(db): add invoice_id FK on daily_logs for billing attribution"
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
export type AutoPopulateResult = {
  preamble: { description: string; quantity: string; unit: string; rate: string; amount: string }[];
  items: {
    description: string;
    quantity: string;
    unit: string;
    rate: string;
    amount: string;
    sourceLogId: string;
  }[];
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

    const preamble: AutoPopulateResult["preamble"] = [];
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
    const items = built.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      rate: it.rate,
      amount: it.amount,
      sourceLogId: it.sourceLogId!,
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

- [ ] **Step 2: Link logs to invoice after item insert**

After the `await tx.insert(invoiceItems).values(...)` block, before `revalidatePath`, add:

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

- [ ] **Step 3: Lint + typecheck**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: No new errors.

- [ ] **Step 4: Manual integration test**

1. Seed DB if needed: `pnpm db:seed`.
2. Start dev: `pnpm dev`.
3. Open a project page with completed logs. Click "Generate Invoice from Logs".
4. Verify invoice created. Open psql: `SELECT id, invoice_id FROM daily_logs WHERE project_id = '<id>';` — every previously-completed log should now have `invoice_id` set.
5. Click button again. Expected: throws "No completed logs found for this project" (because all are now linked).

- [ ] **Step 5: Commit**

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

- [ ] **Step 2: Link logs + flip mobilization in `createInvoice`**

In `createInvoice`, after the `if (data.items.length > 0) { await tx.insert(invoiceItems)... }` block, before `revalidatePath`, add:

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

- [ ] **Step 3: Lint + typecheck**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/invoices.ts
git commit -m "feat(invoices): link daily logs + flip mobilization on createInvoice"
```

---

## Task 6: Release-then-relink on `updateInvoice`; release on `deleteInvoice`

**Files:**
- Modify: `src/lib/actions/invoices.ts`

- [ ] **Step 1: Update `updateInvoice`**

In `updateInvoice`, before the existing `await tx.delete(invoiceItems)...` line, add:

```ts
await tx
  .update(dailyLogs)
  .set({ invoiceId: null, updatedAt: new Date() })
  .where(eq(dailyLogs.invoiceId, id));
```

After the `if (data.items.length > 0) { await tx.insert(invoiceItems)... }` block, before the first `revalidatePath`, add:

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

  // Release linked logs
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

- [ ] **Step 3: Lint + typecheck**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Manual integration test**

1. Create an invoice via form with mobilization + 2 log items.
2. `SELECT mobilization_billed FROM projects WHERE id='<pid>';` → `true`.
3. `SELECT invoice_id FROM daily_logs WHERE project_id='<pid>';` → 2 rows with invoice id set.
4. Open invoice, edit it, remove 1 log row, save.
5. Re-check logs: 1 row linked, 1 row `NULL`.
6. Cancel invoice (delete action).
7. Re-check logs: both `NULL`. `mobilization_billed` → `false`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/invoices.ts
git commit -m "feat(invoices): release+relink logs on update; release on cancel"
```

---

## Task 7: Wire form auto-populate

**Files:**
- Modify: `src/components/forms/invoice-form.tsx`

- [ ] **Step 1: Extend imports + types**

At the top of the file, add to the existing imports from `@/lib/actions`:

```ts
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
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
    const newRows: LineItem[] = [...result.preamble, ...result.items].map((it) => ({
      id: crypto.randomUUID(),
      description: it.description,
      quantity: it.quantity,
      unit: (it.unit as Unit) ?? "",
      rate: it.rate,
      amount: it.amount,
      sourceLogId: "sourceLogId" in it ? it.sourceLogId : undefined,
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

Inside the `"invoices": { ... }` block, add:

```json
"fromLog": "From log",
"noUninvoicedLogs": "No uninvoiced logs for this project"
```

(Place after the existing `"noItems"` line; mind trailing comma.)

- [ ] **Step 2: Add Tamil translations to `messages/ta.json`**

Inside `"invoices": { ... }`:

```json
"fromLog": "பதிவில் இருந்து",
"noUninvoicedLogs": "இந்தத் திட்டத்திற்கு விலைப்பட்டியலிடப்படாத பதிவுகள் இல்லை"
```

- [ ] **Step 3: Add Sinhala translations to `messages/si.json`**

Inside `"invoices": { ... }`:

```json
"fromLog": "ලොගයෙන්",
"noUninvoicedLogs": "මෙම ව්‍යාපෘතිය සඳහා ඉන්වොයිස් නොකළ ලොග් නැත"
```

- [ ] **Step 4: Verify JSON validity**

Run: `pnpm exec tsc --noEmit`
Expected: No errors (next-intl type generation would fail if keys mismatch across locales).

Run: `node -e "require('./messages/en.json'); require('./messages/ta.json'); require('./messages/si.json'); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add messages/
git commit -m "i18n: add fromLog and noUninvoicedLogs invoice strings"
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
3. Expect: items list replaced with mobilization line (if applicable) + one row per uninvoiced log, each showing "FROM LOG" badge. Client name/phone prefilled.
4. Edit qty on one row. Remove a different row. Save.
5. Verify in psql:
   - `SELECT invoice_id FROM daily_logs WHERE project_id = '<pid>';` — only the kept log rows link to the new invoice; the removed log stays NULL.
   - `SELECT mobilization_billed FROM projects WHERE id = '<pid>';` — `true`.

- [ ] **Step 3: Idempotency — re-select same project**

1. New invoice. Select the same project.
2. Expect: only the previously-removed log appears (still uninvoiced). Mobilization not shown (already billed).

- [ ] **Step 4: Touched-state preservation**

1. New invoice. Manually edit the default blank row (type description).
2. Select a project.
3. Expect: rows NOT replaced (admin's manual entry preserved). No badge.

- [ ] **Step 5: Existing button still works**

1. Navigate to a project page with uninvoiced logs.
2. Click "Generate Invoice from Logs".
3. Verify: new invoice created. Logs now linked. Clicking again: error "No completed logs found".

- [ ] **Step 6: Cancel flow**

1. Cancel one of the created invoices.
2. Verify: its logs released to `NULL`. If the invoice had mobilization and no other active invoice on the project has mobilization, `projects.mobilization_billed` flips back to `false`.

- [ ] **Step 7: Final commit (if any tweaks)**

If verification surfaces minor fixes, commit them. Otherwise, no commit needed.

---

## Self-Review Notes

- **Spec coverage:**
  - Schema change → Task 2
  - `getUninvoicedLogsForProject` → Task 3
  - `generateFromProject` alignment → Task 4
  - `createInvoice` linking → Task 5
  - `updateInvoice` release+relink → Task 6
  - `deleteInvoice` release + unflip → Task 6
  - Form touched-state + onChange + badge + sourceLogId payload → Task 7
  - i18n → Task 8
  - Manual E2E → Task 9
- **Placeholders:** none.
- **Type consistency:** `LineItem.sourceLogId` defined in Task 1 (helper) and Task 7 (form), `InvoiceItemData.sourceLogId` in Task 5, `AutoPopulateResult.items[].sourceLogId` in Task 3 — all string-typed.
