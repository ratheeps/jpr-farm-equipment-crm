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
import {
  loanTypeEnum,
  loanStatusEnum,
  receivableStatusEnum,
  transactionTypeEnum,
} from "./enums";
import { vehicles } from "./vehicles";
import { projects } from "./projects";
import { invoices } from "./invoices";
import { users } from "./auth";

export const loans = pgTable("loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanType: loanTypeEnum("loan_type").notNull(),
  lenderName: varchar("lender_name", { length: 255 }).notNull(),
  lenderPhone: varchar("lender_phone", { length: 20 }),
  principalAmount: numeric("principal_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  interestRatePercent: numeric("interest_rate_percent", {
    precision: 6,
    scale: 2,
  }),
  interestType: varchar("interest_type", { length: 20 }).default("reducing"), // flat | reducing
  termMonths: integer("term_months"),
  emiAmount: numeric("emi_amount", { precision: 12, scale: 2 }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id), // links equipment lease to vehicle
  outstandingBalance: numeric("outstanding_balance", {
    precision: 14,
    scale: 2,
  }).notNull(),
  status: loanStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const loanPayments = pgTable("loan_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id")
    .notNull()
    .references(() => loans.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  principalPortion: numeric("principal_portion", { precision: 12, scale: 2 }),
  interestPortion: numeric("interest_portion", { precision: 12, scale: 2 }),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: varchar("payment_method", { length: 100 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const receivables = pgTable("receivables", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 30 }).notNull(), // project_payment | personal_lending
  debtorName: varchar("debtor_name", { length: 255 }).notNull(),
  debtorPhone: varchar("debtor_phone", { length: 20 }),
  projectId: uuid("project_id").references(() => projects.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  principalAmount: numeric("principal_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  interestRatePercent: numeric("interest_rate_percent", {
    precision: 6,
    scale: 2,
  }),
  totalDue: numeric("total_due", { precision: 14, scale: 2 }).notNull(),
  amountReceived: numeric("amount_received", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  outstandingBalance: numeric("outstanding_balance", {
    precision: 14,
    scale: 2,
  }).notNull(),
  dueDate: date("due_date"),
  status: receivableStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const receivablePayments = pgTable("receivable_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  receivableId: uuid("receivable_id")
    .notNull()
    .references(() => receivables.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: varchar("payment_method", { length: 100 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cashTransactions = pgTable("cash_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description"),
  referenceType: varchar("reference_type", { length: 50 }), // loan | receivable | invoice | expense | manual
  referenceId: uuid("reference_id"),
  transactionDate: date("transaction_date").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const loansRelations = relations(loans, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [loans.vehicleId],
    references: [vehicles.id],
  }),
  payments: many(loanPayments),
}));

export const loanPaymentsRelations = relations(loanPayments, ({ one }) => ({
  loan: one(loans, {
    fields: [loanPayments.loanId],
    references: [loans.id],
  }),
}));

export const receivablesRelations = relations(receivables, ({ one, many }) => ({
  project: one(projects, {
    fields: [receivables.projectId],
    references: [projects.id],
  }),
  invoice: one(invoices, {
    fields: [receivables.invoiceId],
    references: [invoices.id],
  }),
  payments: many(receivablePayments),
}));

export const receivablePaymentsRelations = relations(
  receivablePayments,
  ({ one }) => ({
    receivable: one(receivables, {
      fields: [receivablePayments.receivableId],
      references: [receivables.id],
    }),
  })
);

export const cashTransactionsRelations = relations(
  cashTransactions,
  ({ one }) => ({
    createdByUser: one(users, {
      fields: [cashTransactions.createdBy],
      references: [users.id],
    }),
  })
);
