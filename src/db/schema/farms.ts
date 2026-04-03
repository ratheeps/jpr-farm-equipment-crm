import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  date,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { farmCycleStageEnum } from "./enums";

export const paddyFarms = pgTable("paddy_farms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  areaAcres: numeric("area_acres", { precision: 8, scale: 2 }).notNull(),
  locationText: text("location_text"),
  gpsLat: numeric("gps_lat", { precision: 10, scale: 7 }),
  gpsLng: numeric("gps_lng", { precision: 10, scale: 7 }),
  soilType: varchar("soil_type", { length: 100 }),
  waterSource: varchar("water_source", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const farmCycles = pgTable("farm_cycles", {
  id: uuid("id").primaryKey().defaultRandom(),
  farmId: uuid("farm_id")
    .notNull()
    .references(() => paddyFarms.id, { onDelete: "cascade" }),
  seasonName: varchar("season_name", { length: 100 }).notNull(), // e.g. "Yala 2026"
  stage: farmCycleStageEnum("stage").notNull().default("land_prep"),
  startDate: date("start_date"),
  expectedEndDate: date("expected_end_date"),
  actualEndDate: date("actual_end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const farmInputs = pgTable("farm_inputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  cycleId: uuid("cycle_id")
    .notNull()
    .references(() => farmCycles.id, { onDelete: "cascade" }),
  inputType: varchar("input_type", { length: 50 }).notNull(), // seeds, fertilizer, pesticide, water, labor
  productName: varchar("product_name", { length: 255 }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 50 }),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull(),
  appliedDate: date("applied_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const farmHarvests = pgTable("farm_harvests", {
  id: uuid("id").primaryKey().defaultRandom(),
  cycleId: uuid("cycle_id")
    .notNull()
    .references(() => farmCycles.id, { onDelete: "cascade" }),
  harvestDate: date("harvest_date").notNull(),
  weightKg: numeric("weight_kg", { precision: 10, scale: 2 }).notNull(),
  grade: varchar("grade", { length: 50 }),
  pricePerKg: numeric("price_per_kg", { precision: 8, scale: 2 }),
  revenue: numeric("revenue", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paddyFarmsRelations = relations(paddyFarms, ({ many }) => ({
  cycles: many(farmCycles),
}));

export const farmCyclesRelations = relations(farmCycles, ({ one, many }) => ({
  farm: one(paddyFarms, {
    fields: [farmCycles.farmId],
    references: [paddyFarms.id],
  }),
  inputs: many(farmInputs),
  harvests: many(farmHarvests),
}));

export const farmInputsRelations = relations(farmInputs, ({ one }) => ({
  cycle: one(farmCycles, {
    fields: [farmInputs.cycleId],
    references: [farmCycles.id],
  }),
}));

export const farmHarvestsRelations = relations(farmHarvests, ({ one }) => ({
  cycle: one(farmCycles, {
    fields: [farmHarvests.cycleId],
    references: [farmCycles.id],
  }),
}));
