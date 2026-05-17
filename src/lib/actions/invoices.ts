"use server";

import { withRLS, type DB } from "@/db";
import { invoices, invoiceItems, invoicePayments, projects, dailyLogs } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, desc, count, sum, and, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type InvoiceItemData = {
  description: string;
  quantity: string;
  unit?: string;
  rate: string;
  amount: string;
  sortOrder?: number;
  sourceLogId?: string;
};

export type InvoiceFormData = {
  invoiceNumber: string;
  projectId?: string;
  clientName: string;
  clientPhone?: string;
  subtotal: string;
  discountAmount?: string;
  taxAmount?: string;
  total: string;
  status: string;
  paymentDueDate?: string;
  paidDate?: string;
  notes?: string;
  items: InvoiceItemData[];
};

export type PaymentFormData = {
  amount: string;
  paymentType: "advance" | "partial" | "final";
  paymentDate: string;
  notes?: string;
};

/**
 * Generate the next invoice number using an existing transaction.
 * Exported so invoice-generation.ts can call it inside its own withRLS tx
 * without opening a second transaction (which would cause numbering collisions).
 */
export async function nextInvoiceNumberTx(tx: DB): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [{ total }] = await tx.select({ total: count() }).from(invoices);
  const seq = String(Number(total) + 1).padStart(3, "0");
  return `INV-${ym}-${seq}`;
}

/**
 * Release artifacts when an invoice transitions into `cancelled` state:
 * - Unlink any daily_logs attributed to it (invoice_id = NULL) so they
 *   resurface in getUninvoicedLogsForProject.
 * - Conditionally unflip projects.mobilization_billed only if no other
 *   non-cancelled invoice on the same project still carries a mobilization line.
 *
 * Idempotent on already-released invoices.
 */
async function releaseInvoiceArtifacts(
  tx: DB,
  id: string,
  projectId: string | null
) {
  const mobilizationRows = await tx
    .select({ id: invoiceItems.id })
    .from(invoiceItems)
    .where(and(eq(invoiceItems.invoiceId, id), eq(invoiceItems.unit, "mobilization")));
  const hadMobilization = mobilizationRows.length > 0;

  await tx
    .update(dailyLogs)
    .set({ invoiceId: null, updatedAt: new Date() })
    .where(eq(dailyLogs.invoiceId, id));

  if (hadMobilization && projectId) {
    const otherMobilization = await tx
      .select({ id: invoices.id })
      .from(invoices)
      .innerJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
      .where(
        and(
          eq(invoices.projectId, projectId),
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
        .where(eq(projects.id, projectId));
    }
  }
}

export async function createInvoice(data: InvoiceFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx) => {
    const [invoice] = await tx
      .insert(invoices)
      .values({
        invoiceNumber: data.invoiceNumber,
        projectId: data.projectId || null,
        clientName: data.clientName,
        clientPhone: data.clientPhone || null,
        subtotal: data.subtotal,
        discountAmount: data.discountAmount || "0",
        taxAmount: data.taxAmount || "0",
        total: data.total,
        status: data.status as never,
        paymentDueDate: data.paymentDueDate || null,
        paidDate: data.paidDate || null,
        notes: data.notes || null,
      })
      .returning({ id: invoices.id });

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

    revalidatePath("/admin/invoices");
    return invoice.id;
  });
}

export async function updateInvoice(id: string, data: InvoiceFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx) => {
    const [current] = await tx
      .select({ status: invoices.status, projectId: invoices.projectId })
      .from(invoices)
      .where(eq(invoices.id, id));
    if (!current) throw new Error("Invoice not found");
    if (current.status === "cancelled") {
      throw new Error("Cannot edit a cancelled invoice");
    }

    const targetIsCancelled = data.status === "cancelled";

    await tx
      .update(invoices)
      .set({
        projectId: data.projectId || null,
        clientName: data.clientName,
        clientPhone: data.clientPhone || null,
        subtotal: data.subtotal,
        discountAmount: data.discountAmount || "0",
        taxAmount: data.taxAmount || "0",
        total: data.total,
        status: data.status as never,
        paymentDueDate: data.paymentDueDate || null,
        paidDate: data.paidDate || null,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));

    await tx
      .update(dailyLogs)
      .set({ invoiceId: null, updatedAt: new Date() })
      .where(eq(dailyLogs.invoiceId, id));

    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

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

    if (targetIsCancelled) {
      // Cancellation path: skip relink + mobilization-flip; run conditional unflip
      // based on whether any OTHER non-cancelled invoice on this project still
      // has a mobilization line. Items above were already re-inserted (with
      // sourceLogId preserved for historical attribution) but logs stay released.
      await releaseInvoiceArtifacts(tx, id, current.projectId);
    } else {
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
    }

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${id}`);
  });
}

export async function updateInvoiceStatus(
  id: string,
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }
  return withRLS(session.userId, session.role, async (tx) => {
    const [current] = await tx
      .select({ status: invoices.status, projectId: invoices.projectId })
      .from(invoices)
      .where(eq(invoices.id, id));
    if (!current) throw new Error("Invoice not found");

    const transitioningToCancelled =
      current.status !== "cancelled" && status === "cancelled";

    await tx
      .update(invoices)
      .set({ status: status as never, updatedAt: new Date() })
      .where(eq(invoices.id, id));

    if (transitioningToCancelled) {
      await releaseInvoiceArtifacts(tx, id, current.projectId);
    }
    // Known limitation: transition out of cancelled does not re-link logs;
    // operator must re-bill via a new invoice. See plan §Known Limitations.

    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/invoices/${id}`);
  });
}

export async function deleteInvoice(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx) => {
    const [inv] = await tx
      .select({ status: invoices.status, projectId: invoices.projectId })
      .from(invoices)
      .where(eq(invoices.id, id));
    if (!inv) {
      revalidatePath("/admin/invoices");
      return;
    }

    if (inv.status === "cancelled") {
      revalidatePath("/admin/invoices");
      return;
    }

    await tx
      .update(invoices)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(invoices.id, id));

    await releaseInvoiceArtifacts(tx, id, inv.projectId);

    revalidatePath("/admin/invoices");
  });
}

export async function recordPayment(invoiceId: string, data: PaymentFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx) => {
    await tx.insert(invoicePayments).values({
      invoiceId,
      amount: data.amount,
      paymentType: data.paymentType,
      paymentDate: data.paymentDate,
      notes: data.notes || null,
    });

    // Auto-update invoice status based on total paid
    const [invoice] = await tx.select({ total: invoices.total }).from(invoices).where(eq(invoices.id, invoiceId));
    const [{ paid }] = await tx
      .select({ paid: sum(invoicePayments.amount) })
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId));

    const totalPaid = parseFloat(paid ?? "0");
    const invoiceTotal = parseFloat(invoice.total);

    if (totalPaid >= invoiceTotal) {
      await tx
        .update(invoices)
        .set({ status: "paid", paidDate: data.paymentDate, updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId));
    } else if (totalPaid > 0) {
      await tx
        .update(invoices)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId));
    }

    revalidatePath(`/admin/invoices/${invoiceId}`);
    revalidatePath("/admin/invoices");
  });
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx) => {
    await tx.delete(invoicePayments).where(eq(invoicePayments.id, paymentId));

    revalidatePath(`/admin/invoices/${invoiceId}`);
  });
}

export async function getInvoices() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx) => {
    return tx
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientName: invoices.clientName,
        total: invoices.total,
        status: invoices.status,
        paymentDueDate: invoices.paymentDueDate,
        paidDate: invoices.paidDate,
        createdAt: invoices.createdAt,
        projectName: projects.name,
      })
      .from(invoices)
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .orderBy(desc(invoices.createdAt));
  });
}

export async function getInvoice(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx) => {
    const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return null;

    const [items, payments] = await Promise.all([
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
      tx
        .select()
        .from(invoicePayments)
        .where(eq(invoicePayments.invoiceId, id))
        .orderBy(invoicePayments.paymentDate),
    ]);

    return { invoice, items, payments };
  });
}

export async function generateInvoiceNumber() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }
  return withRLS(session.userId, session.role, async (tx) => {
    return nextInvoiceNumberTx(tx);
  });
}
