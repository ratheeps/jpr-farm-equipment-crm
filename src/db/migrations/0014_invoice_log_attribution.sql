ALTER TABLE "daily_logs" ADD COLUMN "invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "source_log_id" uuid;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_source_log_id_daily_logs_id_fk" FOREIGN KEY ("source_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "daily_logs_uninvoiced_idx"
  ON "daily_logs" ("project_id")
  WHERE "invoice_id" IS NULL;