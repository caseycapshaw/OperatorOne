ALTER TABLE "organizations" ADD COLUMN "domain" varchar(255);--> statement-breakpoint
ALTER TABLE "setup_config" ADD COLUMN "org_identity" jsonb;