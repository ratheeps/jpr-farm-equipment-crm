import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  date,
  boolean,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { projectStatusEnum } from "./enums";
import { vehicles } from "./vehicles";
import { staffProfiles } from "./staff";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }),
  siteLocationText: text("site_location_text"),
  siteGpsLat: numeric("site_gps_lat", { precision: 10, scale: 7 }),
  siteGpsLng: numeric("site_gps_lng", { precision: 10, scale: 7 }),
  status: projectStatusEnum("status").notNull().default("planned"),
  estimatedHours: numeric("estimated_hours", { precision: 10, scale: 1 }),
  estimatedCost: numeric("estimated_cost", { precision: 12, scale: 2 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectAssignments = pgTable("project_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id),
  staffId: uuid("staff_id").references(() => staffProfiles.id),
  assignedFrom: date("assigned_from"),
  assignedTo: date("assigned_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  assignments: many(projectAssignments),
  dailyLogs: many(dailyLogs),
  invoices: many(invoices),
  receivables: many(receivables),
}));

export const projectAssignmentsRelations = relations(
  projectAssignments,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectAssignments.projectId],
      references: [projects.id],
    }),
    vehicle: one(vehicles, {
      fields: [projectAssignments.vehicleId],
      references: [vehicles.id],
    }),
    staff: one(staffProfiles, {
      fields: [projectAssignments.staffId],
      references: [staffProfiles.id],
    }),
  })
);

import { dailyLogs } from "./daily-logs";
import { invoices } from "./invoices";
import { receivables } from "./finance";
