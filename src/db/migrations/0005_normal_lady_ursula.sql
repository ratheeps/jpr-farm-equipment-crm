CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(200) DEFAULT '' NOT NULL,
	"address" text,
	"phone" varchar(50),
	"email" varchar(200),
	"tax_number" varchar(100),
	"bank_name" varchar(200),
	"bank_account_number" varchar(100),
	"bank_branch" varchar(200),
	"logo_url" varchar(500),
	"invoice_footer_note" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
