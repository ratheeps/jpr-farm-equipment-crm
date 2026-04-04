import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  date,
  text,
  integer,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";
import { invoiceStatusEnum } from "./enums";
import { projects } from "./projects";

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  projectId: uuid("project_id").references(() => projects.id),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  paymentDueDate: date("payment_due_date"),
  paidDate: date("paid_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }), // hours, acres, km, tasks
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteNumber: varchar("quote_number", { length: 50 }).notNull().unique(),
  projectId: uuid("project_id").references(() => projects.id),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  validUntil: date("valid_until"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quoteItems = pgTable("quote_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const invoicePayments = pgTable("invoice_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentType: varchar("payment_type", { length: 20 }).notNull().default("partial"), // advance | partial | final
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  items: many(invoiceItems),
  payments: many(invoicePayments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  project: one(projects, {
    fields: [quotes.projectId],
    references: [projects.id],
  }),
  items: many(quoteItems),
}));
