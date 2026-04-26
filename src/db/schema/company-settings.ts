import { pgTable, uuid, varchar, text, timestamp, numeric } from "drizzle-orm/pg-core";

export const companySettings = pgTable("company_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: varchar("company_name", { length: 200 }).notNull().default(""),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  taxNumber: varchar("tax_number", { length: 100 }),
  bankName: varchar("bank_name", { length: 200 }),
  bankAccountNumber: varchar("bank_account_number", { length: 100 }),
  bankBranch: varchar("bank_branch", { length: 200 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  invoiceFooterNote: text("invoice_footer_note"),
  defaultIdleWarnPct: numeric("default_idle_warn_pct", { precision: 5, scale: 2 }).default("20"),
  defaultIdleCriticalPct: numeric("default_idle_critical_pct", { precision: 5, scale: 2 }).default("50"),
  defaultFuelVariancePct: numeric("default_fuel_variance_pct", { precision: 5, scale: 2 }).default("20"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CompanySettings = typeof companySettings.$inferSelect;
