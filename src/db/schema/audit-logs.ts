import { pgTable, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: varchar("action", { length: 50 }).notNull(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: varchar("record_id", { length: 100 }).notNull(),
  userId: uuid("user_id").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 45 }),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
