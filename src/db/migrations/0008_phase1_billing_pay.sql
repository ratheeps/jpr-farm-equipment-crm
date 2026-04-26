ALTER TABLE "vehicles" ADD COLUMN "operator_rate_per_unit" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "trip_allowance" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mobilization_fee" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "mobilization_billed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "trip_allowance_override" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD COLUMN "per_unit_bonus_total" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payroll_periods" ADD COLUMN "trip_allowance_total" numeric(12, 2) DEFAULT '0';