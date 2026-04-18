import {
  pgTable,
  uuid,
  timestamp,
  numeric,
  date,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { syncStatusEnum } from "./enums";
import { vehicles } from "./vehicles";
import { staffProfiles } from "./staff";
import { projects } from "./projects";

export const dailyLogs = pgTable("daily_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  operatorId: uuid("operator_id")
    .notNull()
    .references(() => staffProfiles.id),
  projectId: uuid("project_id").references(() => projects.id),
  farmId: uuid("farm_id"), // FK to paddy_farms — added in Phase 6
  date: date("date").notNull(),
  startEngineHours: numeric("start_engine_hours", {
    precision: 10,
    scale: 1,
  }).notNull(),
  endEngineHours: numeric("end_engine_hours", { precision: 10, scale: 1 }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  gpsLatStart: numeric("gps_lat_start", { precision: 10, scale: 7 }),
  gpsLngStart: numeric("gps_lng_start", { precision: 10, scale: 7 }),
  gpsLatEnd: numeric("gps_lat_end", { precision: 10, scale: 7 }),
  gpsLngEnd: numeric("gps_lng_end", { precision: 10, scale: 7 }),
  fuelUsedLiters: numeric("fuel_used_liters", { precision: 8, scale: 2 }),
  kmTraveled: numeric("km_traveled", { precision: 8, scale: 1 }),
  acresWorked: numeric("acres_worked", { precision: 8, scale: 2 }),
  tripAllowanceOverride: numeric("trip_allowance_override", { precision: 10, scale: 2 }),
  notes: text("notes"),
  syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
  clientDeviceId: text("client_device_id"), // for offline conflict resolution
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dailyLogsRelations = relations(dailyLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [dailyLogs.vehicleId],
    references: [vehicles.id],
  }),
  operator: one(staffProfiles, {
    fields: [dailyLogs.operatorId],
    references: [staffProfiles.id],
  }),
  project: one(projects, {
    fields: [dailyLogs.projectId],
    references: [projects.id],
  }),
}));
