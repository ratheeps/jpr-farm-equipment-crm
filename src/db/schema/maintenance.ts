import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  date,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { vehicles } from "./vehicles";

export const maintenanceRecords = pgTable("maintenance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(), // oil_change, filter, overhaul, tire, other
  description: text("description"),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  engineHoursAtService: numeric("engine_hours_at_service", {
    precision: 10,
    scale: 1,
  }),
  serviceDate: date("service_date").notNull(),
  nextServiceDueHours: numeric("next_service_due_hours", {
    precision: 10,
    scale: 1,
  }),
  performedBy: varchar("performed_by", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const maintenanceSchedules = pgTable("maintenance_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  intervalHours: integer("interval_hours").notNull(),
  lastServiceHours: numeric("last_service_hours", {
    precision: 10,
    scale: 1,
  }),
  nextDueHours: numeric("next_due_hours", { precision: 10, scale: 1 }),
  isOverdue: boolean("is_overdue").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const maintenanceRecordsRelations = relations(
  maintenanceRecords,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [maintenanceRecords.vehicleId],
      references: [vehicles.id],
    }),
  })
);

export const maintenanceSchedulesRelations = relations(
  maintenanceSchedules,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [maintenanceSchedules.vehicleId],
      references: [vehicles.id],
    }),
  })
);
