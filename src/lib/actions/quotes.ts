"use server";

import { db } from "@/db";
import { quotes, quoteItems, invoices, invoiceItems, projects } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type QuoteItemData = {
  description: string;
  quantity: string;
  unit?: string;
  rate: string;
  amount: string;
  sortOrder?: number;
};

export type QuoteFormData = {
  quoteNumber: string;
  projectId?: string;
  clientName: string;
  clientPhone?: string;
  subtotal: string;
  total: string;
  validUntil?: string;
  notes?: string;
  items: QuoteItemData[];
};

async function nextQuoteNumber(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [{ total }] = await db.select({ total: count() }).from(quotes);
  const seq = String(Number(total) + 1).padStart(3, "0");
  return `QUO-${ym}-${seq}`;
}

export async function generateQuoteNumber() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }
  return nextQuoteNumber();
}

export async function getQuotes() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  return db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      clientName: quotes.clientName,
      total: quotes.total,
      validUntil: quotes.validUntil,
      createdAt: quotes.createdAt,
      projectName: projects.name,
    })
    .from(quotes)
    .leftJoin(projects, eq(quotes.projectId, projects.id))
    .orderBy(desc(quotes.createdAt));
}

export async function getQuote(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
  if (!quote) return null;

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id))
    .orderBy(quoteItems.sortOrder);

  return { quote, items };
}

export async function createQuote(data: QuoteFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const [quote] = await db
    .insert(quotes)
    .values({
      quoteNumber: data.quoteNumber,
      projectId: data.projectId || null,
      clientName: data.clientName,
      clientPhone: data.clientPhone || null,
      subtotal: data.subtotal,
      total: data.total,
      validUntil: data.validUntil || null,
      notes: data.notes || null,
    })
    .returning({ id: quotes.id });

  if (data.items.length > 0) {
    await db.insert(quoteItems).values(
      data.items.map((item, idx) => ({
        quoteId: quote.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || null,
        rate: item.rate,
        amount: item.amount,
        sortOrder: idx,
      }))
    );
  }

  revalidatePath("/admin/quotes");
  return quote.id;
}

export async function updateQuote(id: string, data: QuoteFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(quotes)
    .set({
      projectId: data.projectId || null,
      clientName: data.clientName,
      clientPhone: data.clientPhone || null,
      subtotal: data.subtotal,
      total: data.total,
      validUntil: data.validUntil || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, id));

  await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));

  if (data.items.length > 0) {
    await db.insert(quoteItems).values(
      data.items.map((item, idx) => ({
        quoteId: id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || null,
        rate: item.rate,
        amount: item.amount,
        sortOrder: idx,
      }))
    );
  }

  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${id}`);
}

export async function deleteQuote(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db.delete(quotes).where(eq(quotes.id, id));
  revalidatePath("/admin/quotes");
}

export async function convertQuoteToInvoice(quoteId: string): Promise<string> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const result = await getQuote(quoteId);
  if (!result) throw new Error("Quote not found");

  const { quote, items } = result;

  // Generate invoice number
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [{ total: invCount }] = await db.select({ total: count() }).from(invoices);
  const seq = String(Number(invCount) + 1).padStart(3, "0");
  const invoiceNumber = `INV-${ym}-${seq}`;

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber,
      projectId: quote.projectId,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      subtotal: quote.subtotal,
      discountAmount: "0",
      taxAmount: "0",
      total: quote.total,
      status: "draft",
      notes: quote.notes,
    })
    .returning({ id: invoices.id });

  if (items.length > 0) {
    await db.insert(invoiceItems).values(
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

  revalidatePath("/admin/invoices");
  return invoice.id;
}
