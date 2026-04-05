CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(50) NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" varchar(100) NOT NULL,
	"user_id" uuid NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" varchar(45),
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
