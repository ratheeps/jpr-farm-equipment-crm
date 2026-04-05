import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  integer,
  text,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  vehicleTypeEnum,
  billingModelEnum,
  vehicleStatusEnum,
} from "./enums";
import { staffProfiles } from "./staff";

export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  registrationNumber: varchar("registration_number", { length: 50 }),
  vehicleType: vehicleTypeEnum("vehicle_type").notNull(),
  billingModel: billingModelEnum("billing_model").notNull(),
  // Rates — only the relevant one is used based on billingModel
  ratePerHour: numeric("rate_per_hour", { precision: 10, scale: 2 }),
  ratePerAcre: numeric("rate_per_acre", { precision: 10, scale: 2 }),
  ratePerKm: numeric("rate_per_km", { precision: 10, scale: 2 }),
  ratePerTask: numeric("rate_per_task", { precision: 10, scale: 2 }),
  // Operational parameters
  fuelConsumptionBaseline: numeric("fuel_consumption_baseline", {
    precision: 8,
    scale: 2,
  }), // liters/hr or liters/km
  maintenanceIntervalHours: integer("maintenance_interval_hours").default(250),
  currentEngineHours: numeric("current_engine_hours", {
    precision: 10,
    scale: 1,
  }).default("0"),
  status: vehicleStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const vehicleAssignments = pgTable("vehicle_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staffProfiles.id, { onDelete: "cascade" }),
  assignedFrom: date("assigned_from").notNull(),
  assignedTo: date("assigned_to"), // null = indefinite
  isPrimary: boolean("is_primary").notNull().default(true),
  reason: text("reason"), // e.g. "leave cover", "breakdown"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  dailyLogs: many(dailyLogs),
  maintenanceRecords: many(maintenanceRecords),
  maintenanceSchedules: many(maintenanceSchedules),
  expenses: many(expenses),
  projectAssignments: many(projectAssignments),
  vehicleAssignments: many(vehicleAssignments),
  loans: many(loans),
}));

export const vehicleAssignmentsRelations = relations(
  vehicleAssignments,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [vehicleAssignments.vehicleId],
      references: [vehicles.id],
    }),
    staff: one(staffProfiles, {
      fields: [vehicleAssignments.staffId],
      references: [staffProfiles.id],
    }),
  })
);

// Forward references — defined in other files
import { dailyLogs } from "./daily-logs";
import { maintenanceRecords, maintenanceSchedules } from "./maintenance";
import { expenses } from "./expenses";
import { projectAssignments } from "./projects";
import { loans } from "./finance";
