CREATE TYPE "public"."account_type" AS ENUM('INDIVIDUAL', 'AGENT', 'ORGANISATION');--> statement-breakpoint
CREATE TYPE "public"."api_key_environment" AS ENUM('LIVE', 'TEST');--> statement-breakpoint
CREATE TYPE "public"."identity_category" AS ENUM('LOOKUP', 'SLIP', 'RECORD', 'ENROLMENT');--> statement-breakpoint
CREATE TYPE "public"."identity_request_status" AS ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."identity_result_kind" AS ENUM('IDENTITY', 'DOCUMENT', 'ACKNOWLEDGEMENT');--> statement-breakpoint
ALTER TYPE "public"."admin_section" ADD VALUE 'VERIFICATIONS' BEFORE 'AUDIT';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'VERIFICATION' BEFORE 'WALLET_FUNDING';--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"environment" "api_key_environment" DEFAULT 'LIVE' NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_prefix_unique" UNIQUE("prefix"),
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "verification_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"category" "identity_category" NOT NULL,
	"price_kobo" bigint NOT NULL,
	"turnaround_label" text NOT NULL,
	"result_kind" "identity_result_kind" NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_products_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"transaction_id" uuid,
	"api_key_id" uuid,
	"reference" text NOT NULL,
	"status" "identity_request_status" DEFAULT 'PENDING' NOT NULL,
	"amount_kobo" bigint NOT NULL,
	"subject_masked" text NOT NULL,
	"summary" text NOT NULL,
	"input_digest" text NOT NULL,
	"result" jsonb,
	"failure_reason" text,
	"provider_ref" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_requests_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_type" "account_type" DEFAULT 'INDIVIDUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_product_id_verification_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."verification_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_products_category_idx" ON "verification_products" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_requests_transaction_unique" ON "verification_requests" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "verification_requests_user_created_idx" ON "verification_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "verification_requests_status_idx" ON "verification_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verification_requests_product_idx" ON "verification_requests" USING btree ("product_id");