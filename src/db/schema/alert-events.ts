import {
  pgTable,
  uuid,
  numeric,
  date,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { alertTypeEnum, alertSeverityEnum } from "./enums";
import { vehicles } from "./vehicles";

export const alertEvents = pgTable(
  "alert_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: alertTypeEnum("type").notNull(),
    severity: alertSeverityEnum("severity").notNull(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    value: numeric("value", { precision: 10, scale: 2 }),
    detectedDate: date("detected_date").notNull().default(sql`CURRENT_DATE`),
    detectedAt: timestamp("detected_at").notNull().defaultNow(),
    pushedAt: timestamp("pushed_at"),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    uniqueIndex("alert_events_dedup_idx")
      .on(table.type, table.vehicleId, table.detectedDate)
      .where(sql`${table.resolvedAt} IS NULL`),
  ]
);
