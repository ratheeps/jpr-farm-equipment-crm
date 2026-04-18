import { pgTable, uuid, text, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  preferCritical: boolean("prefer_critical").notNull().default(true),
  preferDailyDigest: boolean("prefer_daily_digest").notNull().default(true),
  lastDigestSentDate: date("last_digest_sent_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
