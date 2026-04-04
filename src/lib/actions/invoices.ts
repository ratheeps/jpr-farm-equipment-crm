"use server";

import { db } from "@/db";
import { invoices, invoiceItems, invoicePayments, projects } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, desc, count, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type InvoiceItemData = {
  description: string;
  quantity: string;
  unit?: string;
  rate: string;
  amount: string;
  sortOrder?: number;
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

async function nextInvoiceNumber(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [{ total }] = await db.select({ total: count() }).from(invoices);
  const seq = String(Number(total) + 1).padStart(3, "0");
  return `INV-${ym}-${seq}`;
}

export async function createInvoice(data: InvoiceFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const [invoice] = await db
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
    await db.insert(invoiceItems).values(
      data.items.map((item, idx) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || null,
        rate: item.rate,
        amount: item.amount,
        sortOrder: idx,
      }))
    );
  }

  revalidatePath("/admin/invoices");
  return invoice.id;
}

export async function updateInvoice(id: string, data: InvoiceFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db
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

  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

  if (data.items.length > 0) {
    await db.insert(invoiceItems).values(
      data.items.map((item, idx) => ({
        invoiceId: id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || null,
        rate: item.rate,
        amount: item.amount,
        sortOrder: idx,
      }))
    );
  }

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
}

export async function deleteInvoice(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(invoices)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(invoices.id, id));

  revalidatePath("/admin/invoices");
}

export async function recordPayment(invoiceId: string, data: PaymentFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db.insert(invoicePayments).values({
    invoiceId,
    amount: data.amount,
    paymentType: data.paymentType,
    paymentDate: data.paymentDate,
    notes: data.notes || null,
  });

  // Auto-update invoice status based on total paid
  const [invoice] = await db.select({ total: invoices.total }).from(invoices).where(eq(invoices.id, invoiceId));
  const [{ paid }] = await db
    .select({ paid: sum(invoicePayments.amount) })
    .from(invoicePayments)
    .where(eq(invoicePayments.invoiceId, invoiceId));

  const totalPaid = parseFloat(paid ?? "0");
  const invoiceTotal = parseFloat(invoice.total);

  if (totalPaid >= invoiceTotal) {
    await db
      .update(invoices)
      .set({ status: "paid", paidDate: data.paymentDate, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  } else if (totalPaid > 0) {
    await db
      .update(invoices)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  }

  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db.delete(invoicePayments).where(eq(invoicePayments.id, paymentId));

  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function getInvoices() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  return db
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
}

export async function getInvoice(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!invoice) return null;

  const [items, payments] = await Promise.all([
    db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id))
      .orderBy(invoiceItems.sortOrder),
    db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, id))
      .orderBy(invoicePayments.paymentDate),
  ]);

  return { invoice, items, payments };
}

export async function generateInvoiceNumber() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }
  return nextInvoiceNumber();
}
