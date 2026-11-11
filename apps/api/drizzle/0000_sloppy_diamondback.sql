CREATE TYPE "public"."admin_section" AS ENUM('OVERVIEW', 'USERS', 'WALLETS', 'TRANSACTIONS', 'AUDIT', 'TEAM');--> statement-breakpoint
CREATE TYPE "public"."cable_provider" AS ENUM('DSTV', 'GOTV', 'STARTIMES');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('CREDIT', 'DEBIT', 'REFUND');--> statement-breakpoint
CREATE TYPE "public"."meter_type" AS ENUM('PREPAID', 'POSTPAID');--> statement-breakpoint
CREATE TYPE "public"."network" AS ENUM('MTN', 'AIRTEL', 'GLO', 'ETISALAT');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('AIRTIME', 'DATA', 'CABLE', 'ELECTRICITY', 'WALLET_FUNDING');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('ACTIVE', 'FROZEN');--> statement-breakpoint
CREATE TABLE "admin_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"section" "admin_section" NOT NULL,
	"granted_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"actor_name" text NOT NULL,
	"actor_email" text NOT NULL,
	"action" text NOT NULL,
	"description" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"ip_address" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cable_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" "cable_provider" NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"amount_kobo" bigint NOT NULL,
	"duration_label" text DEFAULT '1 month' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cable_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "data_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"network" "network" NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"data_label" text NOT NULL,
	"validity_label" text NOT NULL,
	"price_kobo" bigint NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "electricity_discos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"min_kobo" bigint DEFAULT 100000 NOT NULL,
	"max_kobo" bigint DEFAULT 20000000 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "electricity_discos_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"wallet_id" uuid NOT NULL,
	"transaction_id" uuid,
	"type" "ledger_entry_type" NOT NULL,
	"amount_kobo" bigint NOT NULL,
	"balance_after_kobo" bigint NOT NULL,
	"description" text NOT NULL,
	"reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"adapter" text NOT NULL,
	"status" "provider_status" DEFAULT 'ACTIVE' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"base_url" text,
	"supported_services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_providers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"description" text NOT NULL,
	"recipient" text NOT NULL,
	"amount_kobo" bigint NOT NULL,
	"fee_kobo" bigint DEFAULT 0 NOT NULL,
	"provider_id" uuid,
	"provider_ref" text,
	"provider_code" text,
	"failure_reason" text,
	"balance_after_kobo" bigint,
	"metadata" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"pin_hash" text,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"pin_attempts" integer DEFAULT 0 NOT NULL,
	"pin_locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "vendor_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider_code" text NOT NULL,
	"transaction_reference" text NOT NULL,
	"service" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"outcome" text NOT NULL,
	"http_status" integer,
	"duration_ms" integer NOT NULL,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"balance_kobo" bigint DEFAULT 0 NOT NULL,
	"status" "wallet_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "admin_grants" ADD CONSTRAINT "admin_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_grants" ADD CONSTRAINT "admin_grants_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_grants_user_section_unique" ON "admin_grants" USING btree ("user_id","section");--> statement-breakpoint
CREATE INDEX "admin_grants_user_idx" ON "admin_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cable_plans_provider_idx" ON "cable_plans" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "data_plans_network_idx" ON "data_plans" USING btree ("network");--> statement-breakpoint
CREATE INDEX "ledger_wallet_created_idx" ON "ledger_entries" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_reference_idx" ON "ledger_entries" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "service_providers_priority_idx" ON "service_providers" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_user_idempotency_unique" ON "transactions" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "transactions_user_created_idx" ON "transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_type_idx" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "vendor_logs_created_idx" ON "vendor_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wallets_user_idx" ON "wallets" USING btree ("user_id");