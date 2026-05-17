# Invoice Auto-Populate from Uninvoiced Work Logs

**Date:** 2026-05-17
**Status:** Approved (design)
**Scope:** Admin invoice creation flow

## Problem

When an admin creates an invoice in the form (`/admin/invoices/new`), they currently must manually type each line item even though completed daily logs already capture the billable work (engine hours, acres, km, tasks). The existing `generateFromProject` action handles the project-page shortcut but does not feed the manual form, and there is no concept of an "uninvoiced" log — re-running the shortcut would double-bill.

## Goal

After the admin selects a project in the invoice form, auto-populate the line items from that project's uninvoiced work logs (plus unbilled mobilization fee). Items remain fully editable. Saving the invoice marks the linked logs as invoiced so they don't re-appear.

## Out of Scope

- Quote auto-populate (only invoices).
- Operator UI changes.
- Retroactive backfill of `invoice_id` for logs already billed by past invoices (logs stay `NULL`; future re-runs would re-include them — acceptable since the admin reviews before saving).

## Architecture Overview

```
[Invoice Form]
   │ project select onChange
   ▼
[getUninvoicedLogsForProject(projectId)]  -- new server action, read-only
   │ returns preamble + log items + client header
   ▼
[setItems(...)] -- replace only if untouched
   │
   │ admin edits/removes rows
   ▼
[createInvoice / updateInvoice]
   │ inserts invoice + items
   │ links daily_logs.invoice_id by sourceLogId
   │ flips projects.mobilization_billed when applicable
   ▼
[deleteInvoice (cancel)]
   │ clears daily_logs.invoice_id for this invoice
   │ unflips projects.mobilization_billed if applicable
```

## Schema Changes

### `daily_logs.invoice_id`

Add nullable FK column on `daily_logs`:

```ts
// src/db/schema/daily-logs.ts
invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
```

- `ON DELETE SET NULL`: a hard-deleted invoice releases its logs. (The app uses soft cancel today, but the FK should still be safe.)
- Add composite index `(project_id, invoice_id)` to speed `WHERE project_id = X AND invoice_id IS NULL` lookups.

### Migration

- `pnpm db:generate` → creates migration file.
- All existing completed logs default to `invoice_id = NULL`. Past invoices keep their data; the link is only forward-looking. This is documented as a known limitation.

## Component: Server Action `getUninvoicedLogsForProject`

**Location:** `src/lib/actions/invoice-generation.ts`

**Signature:**

```ts
type AutoPopulateItem = LineItem & { sourceLogId?: string };

type AutoPopulateResult = {
  preamble: AutoPopulateItem[];        // mobilization, no sourceLogId
  items: AutoPopulateItem[];           // log-derived, each with sourceLogId
  clientName: string;
  clientPhone: string | null;
};

export async function getUninvoicedLogsForProject(
  projectId: string
): Promise<AutoPopulateResult>
```

**Behavior:**

1. `requireSession` + role check (`super_admin | admin`).
2. Open `withRLS` transaction (read-only).
3. Fetch project (`name`, `client_name`, `client_phone`, `mobilization_fee`, `mobilization_billed`). Throw if missing.
4. Query `daily_logs` joined with `vehicles`:
   - `project_id = $projectId`
   - `end_engine_hours IS NOT NULL`
   - `invoice_id IS NULL`
   - Order by `date ASC`.
5. Build line items via `buildInvoiceLineItems(preamble, logs)`. Helper signature is extended so each log-derived item carries `sourceLogId = log.id`.
6. Preamble: mobilization line when `mobilization_fee > 0 && !mobilization_billed`. No `sourceLogId`.
7. Return `{ preamble, items, clientName, clientPhone }`. Empty arrays are valid (form will show "no uninvoiced logs").

**Helper change:** `buildInvoiceLineItems` in `src/lib/invoice-line-items.ts` updates `InvoiceLogRow` to include `id: string` and the returned log items carry `sourceLogId: id`. Existing callers (`generateFromProject`) updated to pass `id` through.

## Component: Invoice Form

**Location:** `src/components/forms/invoice-form.tsx`

### Type extension

```ts
type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unit: Unit | "" | "mobilization";
  rate: string;
  amount: string;
  sourceLogId?: string;
};
```

### Touched-state detection

Add `const [itemsTouched, setItemsTouched] = useState(false);`

Flip `true` inside `updateItem`, `addItem`, `removeItem`. The default single-row initial state counts as untouched. Reset to `false` immediately after a successful auto-populate (those rows are server-derived, not user edits).

### Project select handler

```ts
async function onProjectChange(newId: string) {
  setH("projectId", newId);
  if (!newId) return;
  if (itemsTouched) return;

  setPopulating(true);
  try {
    const result = await getUninvoicedLogsForProject(newId);
    const newRows: LineItem[] = [...result.preamble, ...result.items].map((it) => ({
      id: crypto.randomUUID(),
      description: it.description,
      quantity: it.quantity,
      unit: it.unit as Unit,
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

### Visual hint for prefilled rows

Inside the line-items map, next to the description input:

```tsx
{item.sourceLogId && (
  <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wide">
    {t("fromLog")}
  </span>
)}
```

Place it as a small inline badge above the description input (preserves single-column mobile layout).

### Loading + empty states

- `populating` flag disables project select and shows a spinner.
- Empty result: surface inline error "No uninvoiced logs for this project" using existing `setError` channel.

### Submit payload

`items.map` includes `sourceLogId: item.sourceLogId` so the server action receives it.

### i18n keys (added)

- `invoices.fromLog` → "From log" (en), Tamil/Sinhala translations
- `invoices.noUninvoicedLogs` → "No uninvoiced logs for this project"

## Component: `createInvoice` + `updateInvoice`

**Location:** `src/lib/actions/invoices.ts`

### Type change

```ts
export type InvoiceItemData = {
  description: string;
  quantity: string;
  unit?: string;
  rate: string;
  amount: string;
  sortOrder?: number;
  sourceLogId?: string;   // NEW
};
```

### `createInvoice` additions

After inserting `invoice_items`:

1. Collect `logIds = data.items.map(i => i.sourceLogId).filter(Boolean)`.
2. If non-empty:
   ```ts
   await tx
     .update(dailyLogs)
     .set({ invoiceId: invoice.id, updatedAt: new Date() })
     .where(and(inArray(dailyLogs.id, logIds), isNull(dailyLogs.invoiceId)));
   ```
   The `IS NULL` guard prevents stealing logs that another concurrent invoice already linked.
3. Mobilization flag: if any item has `unit === "mobilization"` AND `projectId` AND the project's `mobilizationBilled` is false, flip it to true. (Lift this from `generateFromProject`.)

### `updateInvoice` additions

The current implementation deletes all items and re-inserts. Mirror that pattern for log links:

1. Before deleting items: `UPDATE daily_logs SET invoice_id = NULL WHERE invoice_id = $invoiceId` — release all logs previously attached.
2. Re-insert items as today.
3. Re-link logs from the new payload's `sourceLogId` set (same `inArray + IS NULL` pattern).
4. Mobilization: recompute. If the new payload no longer includes a mobilization item, leave `mobilization_billed` as-is (it was billed historically). If the new payload introduces mobilization and project has not been billed, flip it.

### `deleteInvoice` additions (status → cancelled)

After flipping status to `cancelled`:

1. `UPDATE daily_logs SET invoice_id = NULL WHERE invoice_id = $id` — always release on cancel.
2. If invoice had a mobilization item AND no other non-cancelled invoice for this project has a mobilization item → reset `projects.mobilization_billed = false`.

## Component: `generateFromProject` (existing button) — alignment

**Location:** `src/lib/actions/invoice-generation.ts`

To keep the project-page shortcut consistent with the new model:

1. Add `AND invoice_id IS NULL` to the log query.
2. After inserting `invoice_items`, run the same `UPDATE daily_logs SET invoice_id = $invoiceId WHERE id IN (...) AND invoice_id IS NULL`.
3. Mobilization handling already correct — keep as is.

This fixes a latent double-billing bug: today the button would re-bill the same logs on every click.

## Data Flow Example

1. Admin opens `/admin/invoices/new`. Form has one blank row. `itemsTouched = false`.
2. Selects "Paddy Project A". `onProjectChange` fires:
   - Server returns mobilization (Rs 50,000) + 4 log items (2 hourly tractor, 2 per-acre rotavator) + client name/phone.
   - Form replaces the blank row with 5 rows. First row is "Mobilization", four others show "From log" badges.
   - Client name/phone prefilled.
3. Admin edits row 3's quantity (`itemsTouched = true`), removes row 5 (also `itemsTouched = true`), keeps the rest.
4. Admin saves. Server:
   - Inserts invoice + 4 items (one removed).
   - Updates 3 daily logs (rows 2-4) → `invoice_id = <new>`. Row 5's log stays `NULL`.
   - Project's `mobilization_billed` → true.
5. Admin re-opens the form, selects same project. Auto-populate returns only the un-removed-and-now-unlinked log + 0 mobilization. Single log row shows.

## Concurrency / Race Conditions

- **Two admins, same project simultaneously:** Both call `getUninvoicedLogsForProject` and see the same N logs. First one saves and locks all N. Second one tries to save with overlap; the `AND invoice_id IS NULL` guard ensures only un-linked logs flip. The second invoice persists but doesn't double-bill the same logs. Items already in the second invoice's `invoice_items` table still exist as duplicates — accepted tradeoff (rare scenario, admin can edit).
- **Project row lock:** Not strictly needed for the manual form path (mobilization race is unlikely with admin-only access), but `generateFromProject` already uses `SELECT … FOR UPDATE` on the project row — keep that.

## Testing

Unit:
- `getUninvoicedLogsForProject` returns only `invoice_id IS NULL` logs; preserves order by date; mobilization included when unbilled.
- `createInvoice` links logs via `sourceLogId`; ignores empty array; respects `IS NULL` guard.
- `updateInvoice` releases-then-relinks correctly; removed rows leave logs unlinked.
- `deleteInvoice` releases all logs and conditionally unflips mobilization.

Integration:
- End-to-end: create project → add logs → open invoice form → select project → save → assert logs linked + second select returns empty.

## Error Handling

- Server actions throw on auth failure / not found — form catches and shows generic `common.error`.
- Empty uninvoiced set: surface inline message (not an error), keep blank row.
- DB FK violation: should not happen because we filter `IS NULL`; if it does, propagate as 500.

## Migration / Rollback

- Forward: `db:generate` + `db:migrate`.
- Rollback: drop the FK column. No data loss because `invoice_id` is additive.
- No feature flag — the auto-populate is purely additive UX; the form continues to work when the server action returns empty.
