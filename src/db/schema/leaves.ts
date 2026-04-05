import {
  pgTable,
  uuid,
  timestamp,
  date,
  text,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { leaveTypeEnum, leaveStatusEnum, shiftTypeEnum } from "./enums";
import { staffProfiles } from "./staff";
import { users } from "./auth";

// ─── Staff Leaves ────────────────────────────────────────────────────────────

export const staffLeaves = pgTable("staff_leaves", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staffProfiles.id, { onDelete: "cascade" }),
  leaveType: leaveTypeEnum("leave_type").notNull().default("annual"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const staffLeavesRelations = relations(staffLeaves, ({ one }) => ({
  staff: one(staffProfiles, {
    fields: [staffLeaves.staffId],
    references: [staffProfiles.id],
  }),
  approver: one(users, {
    fields: [staffLeaves.approvedBy],
    references: [users.id],
  }),
}));

// ─── Staff Schedules ─────────────────────────────────────────────────────────

export const staffSchedules = pgTable("staff_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staffProfiles.id, { onDelete: "cascade" }),
  vehicleId: uuid("vehicle_id").references(() => vehicles.id, {
    onDelete: "set null",
  }),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  date: date("date").notNull(),
  shiftType: shiftTypeEnum("shift_type").notNull().default("full_day"),
  notes: varchar("notes", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const staffSchedulesRelations = relations(staffSchedules, ({ one }) => ({
  staff: one(staffProfiles, {
    fields: [staffSchedules.staffId],
    references: [staffProfiles.id],
  }),
  vehicle: one(vehicles, {
    fields: [staffSchedules.vehicleId],
    references: [vehicles.id],
  }),
  project: one(projects, {
    fields: [staffSchedules.projectId],
    references: [projects.id],
  }),
}));

// Forward references
import { vehicles } from "./vehicles";
import { projects } from "./projects";
