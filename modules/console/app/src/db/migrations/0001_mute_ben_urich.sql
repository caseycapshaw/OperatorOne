CREATE TYPE "public"."setup_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "setup_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "setup_status" DEFAULT 'pending' NOT NULL,
	"provider_credentials" jsonb,
	"completed_at" timestamp with time zone,
	"completed_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
