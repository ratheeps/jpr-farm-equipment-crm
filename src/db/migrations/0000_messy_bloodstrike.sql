CREATE TYPE "public"."billing_model" AS ENUM('hourly', 'per_acre', 'per_km', 'per_task');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('fuel', 'parts', 'repair', 'labor', 'transport', 'seeds', 'fertilizer', 'pesticide', 'water', 'misc');--> statement-breakpoint
CREATE TYPE "public"."farm_cycle_stage" AS ENUM('land_prep', 'sowing', 'growth', 'harvesting', 'completed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('active', 'completed', 'defaulted');--> statement-breakpoint
CREATE TYPE "public"."loan_type" AS ENUM('bank_loan', 'personal_borrowing', 'equipment_lease');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('ta', 'si', 'en');--> statement-breakpoint
CREATE TYPE "public"."pay_type" AS ENUM('hourly', 'daily', 'monthly', 'per_acre');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planned', 'active', 'completed', 'invoiced');--> statement-breakpoint
CREATE TYPE "public"."receivable_status" AS ENUM('pending', 'partial', 'paid', 'overdue', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('local', 'synced', 'conflict');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'loan_payment', 'lease_payment', 'lending_out', 'repayment_received', 'borrowing_in', 'debt_repayment');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'admin', 'operator', 'auditor');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('active', 'inactive', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('bulldozer', 'excavator', 'harvester', 'transport_truck', 'tractor');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'operator' NOT NULL,
	"preferred_locale" "locale" DEFAULT 'ta' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"nic_number" varchar(20),
	"pay_rate" numeric(10, 2),
	"pay_type" "pay_type" DEFAULT 'daily',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"registration_number" varchar(50),
	"vehicle_type" "vehicle_type" NOT NULL,
	"billing_model" "billing_model" NOT NULL,
	"rate_per_hour" numeric(10, 2),
	"rate_per_acre" numeric(10, 2),
	"rate_per_km" numeric(10, 2),
	"rate_per_task" numeric(10, 2),
	"fuel_consumption_baseline" numeric(8, 2),
	"maintenance_interval_hours" integer DEFAULT 250,
	"current_engine_hours" numeric(10, 1) DEFAULT '0',
	"status" "vehicle_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"staff_id" uuid,
	"assigned_from" date,
	"assigned_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"client_phone" varchar(20),
	"site_location_text" text,
	"site_gps_lat" numeric(10, 7),
	"site_gps_lng" numeric(10, 7),
	"status" "project_status" DEFAULT 'planned' NOT NULL,
	"estimated_hours" numeric(10, 1),
	"estimated_cost" numeric(12, 2),
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"project_id" uuid,
	"farm_id" uuid,
	"date" date NOT NULL,
	"start_engine_hours" numeric(10, 1) NOT NULL,
	"end_engine_hours" numeric(10, 1),
	"start_time" timestamp,
	"end_time" timestamp,
	"gps_lat_start" numeric(10, 7),
	"gps_lng_start" numeric(10, 7),
	"gps_lat_end" numeric(10, 7),
	"gps_lng_end" numeric(10, 7),
	"fuel_used_liters" numeric(8, 2),
	"km_traveled" numeric(8, 1),
	"acres_worked" numeric(8, 2),
	"notes" text,
	"sync_status" "sync_status" DEFAULT 'synced' NOT NULL,
	"client_device_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid,
	"project_id" uuid,
	"farm_id" uuid,
	"daily_log_id" uuid,
	"staff_id" uuid,
	"created_by" uuid,
	"category" "expense_category" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"receipt_image_url" varchar(500),
	"date" date NOT NULL,
	"sync_status" "sync_status" DEFAULT 'synced' NOT NULL,
	"client_device_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(50),
	"rate" numeric(10, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"project_id" uuid,
	"client_name" varchar(255) NOT NULL,
	"client_phone" varchar(20),
	"subtotal" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"total" numeric(12, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"pdf_url" varchar(500),
	"payment_due_date" date,
	"paid_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(50),
	"rate" numeric(10, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_number" varchar(50) NOT NULL,
	"project_id" uuid,
	"client_name" varchar(255) NOT NULL,
	"client_phone" varchar(20),
	"subtotal" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"valid_until" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_quote_number_unique" UNIQUE("quote_number")
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"description" text,
	"cost" numeric(12, 2),
	"engine_hours_at_service" numeric(10, 1),
	"service_date" date NOT NULL,
	"next_service_due_hours" numeric(10, 1),
	"performed_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"interval_hours" integer NOT NULL,
	"last_service_hours" numeric(10, 1),
	"next_due_hours" numeric(10, 1),
	"is_overdue" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_type" "transaction_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"description" text,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"transaction_date" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"principal_portion" numeric(12, 2),
	"interest_portion" numeric(12, 2),
	"payment_date" date NOT NULL,
	"payment_method" varchar(100),
	"reference_number" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_type" "loan_type" NOT NULL,
	"lender_name" varchar(255) NOT NULL,
	"lender_phone" varchar(20),
	"principal_amount" numeric(14, 2) NOT NULL,
	"interest_rate_percent" numeric(6, 2),
	"interest_type" varchar(20) DEFAULT 'reducing',
	"term_months" integer,
	"emi_amount" numeric(12, 2),
	"start_date" date NOT NULL,
	"end_date" date,
	"vehicle_id" uuid,
	"outstanding_balance" numeric(14, 2) NOT NULL,
	"status" "loan_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivable_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receivable_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" varchar(100),
	"reference_number" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(30) NOT NULL,
	"debtor_name" varchar(255) NOT NULL,
	"debtor_phone" varchar(20),
	"project_id" uuid,
	"invoice_id" uuid,
	"principal_amount" numeric(14, 2) NOT NULL,
	"interest_rate_percent" numeric(6, 2),
	"total_due" numeric(14, 2) NOT NULL,
	"amount_received" numeric(14, 2) DEFAULT '0' NOT NULL,
	"outstanding_balance" numeric(14, 2) NOT NULL,
	"due_date" date,
	"status" "receivable_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farm_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"season_name" varchar(100) NOT NULL,
	"stage" "farm_cycle_stage" DEFAULT 'land_prep' NOT NULL,
	"start_date" date,
	"expected_end_date" date,
	"actual_end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farm_harvests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"harvest_date" date NOT NULL,
	"weight_kg" numeric(10, 2) NOT NULL,
	"grade" varchar(50),
	"price_per_kg" numeric(8, 2),
	"revenue" numeric(12, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farm_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"input_type" varchar(50) NOT NULL,
	"product_name" varchar(255),
	"quantity" numeric(10, 2),
	"unit" varchar(50),
	"unit_cost" numeric(10, 2),
	"total_cost" numeric(12, 2) NOT NULL,
	"applied_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paddy_farms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"area_acres" numeric(8, 2) NOT NULL,
	"location_text" text,
	"gps_lat" numeric(10, 7),
	"gps_lng" numeric(10, 7),
	"soil_type" varchar(100),
	"water_source" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_staff_id_staff_profiles_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_operator_id_staff_profiles_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_staff_id_staff_profiles_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_receivable_id_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "public"."receivables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_cycles" ADD CONSTRAINT "farm_cycles_farm_id_paddy_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."paddy_farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_harvests" ADD CONSTRAINT "farm_harvests_cycle_id_farm_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."farm_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_inputs" ADD CONSTRAINT "farm_inputs_cycle_id_farm_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."farm_cycles"("id") ON DELETE cascade ON UPDATE no action;