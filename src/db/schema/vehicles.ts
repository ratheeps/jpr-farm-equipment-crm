import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  vehicleTypeEnum,
  billingModelEnum,
  vehicleStatusEnum,
} from "./enums";

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

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  dailyLogs: many(dailyLogs),
  maintenanceRecords: many(maintenanceRecords),
  maintenanceSchedules: many(maintenanceSchedules),
  expenses: many(expenses),
  projectAssignments: many(projectAssignments),
  loans: many(loans),
}));

// Forward references — defined in other files
import { dailyLogs } from "./daily-logs";
import { maintenanceRecords, maintenanceSchedules } from "./maintenance";
import { expenses } from "./expenses";
import { projectAssignments } from "./projects";
import { loans } from "./finance";
