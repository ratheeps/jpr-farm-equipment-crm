import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { payTypeEnum } from "./enums";
import { users } from "./auth";

export const staffProfiles = pgTable("staff_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  nicNumber: varchar("nic_number", { length: 20 }),
  payRate: numeric("pay_rate", { precision: 10, scale: 2 }),
  payType: payTypeEnum("pay_type").default("daily"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const staffProfilesRelations = relations(staffProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [staffProfiles.userId],
    references: [users.id],
  }),
  vehicleAssignments: many(vehicleAssignments),
}));

// Forward references
import { vehicleAssignments } from "./vehicles";
