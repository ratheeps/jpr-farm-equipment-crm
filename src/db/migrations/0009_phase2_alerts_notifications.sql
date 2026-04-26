CREATE TYPE "public"."alert_severity" AS ENUM('warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('idling', 'fuel_anomaly', 'maintenance_overdue');--> statement-breakpoint
CREATE TABLE "alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "alert_type" NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"value" numeric(10, 2),
	"detected_date" date DEFAULT CURRENT_DATE NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"pushed_at" timestamp,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "idle_warn_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "idle_critical_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "fuel_variance_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "prefer_critical" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "prefer_daily_digest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "last_digest_sent_date" date;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "default_idle_warn_pct" numeric(5, 2) DEFAULT '20';--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "default_idle_critical_pct" numeric(5, 2) DEFAULT '50';--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "default_fuel_variance_pct" numeric(5, 2) DEFAULT '20';--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_events_dedup_idx" ON "alert_events" USING btree ("type","vehicle_id","detected_date") WHERE "alert_events"."resolved_at" IS NULL;