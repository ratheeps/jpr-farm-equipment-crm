import {
  pgTable,
  uuid,
  timestamp,
  numeric,
  date,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { expenseCategoryEnum, syncStatusEnum } from "./enums";
import { vehicles } from "./vehicles";
import { staffProfiles } from "./staff";
import { projects } from "./projects";
import { dailyLogs } from "./daily-logs";
import { users } from "./auth";

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  projectId: uuid("project_id").references(() => projects.id),
  farmId: uuid("farm_id"), // FK to paddy_farms — added in Phase 6
  dailyLogId: uuid("daily_log_id").references(() => dailyLogs.id),
  staffId: uuid("staff_id").references(() => staffProfiles.id),
  createdBy: uuid("created_by").references(() => users.id),
  category: expenseCategoryEnum("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  receiptImageUrl: varchar("receipt_image_url", { length: 500 }),
  date: date("date").notNull(),
  syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
  clientDeviceId: text("client_device_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [expenses.vehicleId],
    references: [vehicles.id],
  }),
  project: one(projects, {
    fields: [expenses.projectId],
    references: [projects.id],
  }),
  dailyLog: one(dailyLogs, {
    fields: [expenses.dailyLogId],
    references: [dailyLogs.id],
  }),
  staff: one(staffProfiles, {
    fields: [expenses.staffId],
    references: [staffProfiles.id],
  }),
  creator: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
}));
