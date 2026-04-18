import {
  pgTable,
  uuid,
  timestamp,
  date,
  numeric,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { payrollStatusEnum } from "./enums";
import { staffProfiles } from "./staff";

export const payrollPeriods = pgTable("payroll_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staffProfiles.id, { onDelete: "cascade" }),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  // Aggregated work output
  totalHoursWorked: numeric("total_hours_worked", {
    precision: 10,
    scale: 2,
  }).default("0"),
  totalAcresWorked: numeric("total_acres_worked", {
    precision: 10,
    scale: 2,
  }).default("0"),
  totalKmTraveled: numeric("total_km_traveled", {
    precision: 10,
    scale: 2,
  }).default("0"),
  totalLogDays: integer("total_log_days").default(0),
  leaveDays: integer("leave_days").default(0),
  // Pay breakdown
  basePay: numeric("base_pay", { precision: 12, scale: 2 }).default("0"),
  perUnitBonusTotal: numeric("per_unit_bonus_total", { precision: 12, scale: 2 }).default("0"),
  tripAllowanceTotal: numeric("trip_allowance_total", { precision: 12, scale: 2 }).default("0"),
  performanceBonus: numeric("performance_bonus", {
    precision: 12,
    scale: 2,
  }).default("0"),
  deductions: numeric("deductions", { precision: 12, scale: 2 }).default("0"),
  netPay: numeric("net_pay", { precision: 12, scale: 2 }).default("0"),
  status: payrollStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payrollPeriodsRelations = relations(payrollPeriods, ({ one }) => ({
  staff: one(staffProfiles, {
    fields: [payrollPeriods.staffId],
    references: [staffProfiles.id],
  }),
}));
