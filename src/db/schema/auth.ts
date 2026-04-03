import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { userRoleEnum, localeEnum } from "./enums";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("operator"),
  preferredLocale: localeEnum("preferred_locale").notNull().default("ta"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  staffProfile: one(staffProfiles, {
    fields: [users.id],
    references: [staffProfiles.userId],
  }),
}));

// Import here to avoid circular deps — defined in staff.ts
import { staffProfiles } from "./staff";
