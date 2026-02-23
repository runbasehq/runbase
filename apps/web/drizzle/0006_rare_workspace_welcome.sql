ALTER TABLE "workspace" ADD COLUMN "welcome_email_status" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "welcome_email_sent_at" timestamp;
--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "welcome_email_message_id" text;
--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_welcome_email_status_check" CHECK ("workspace"."welcome_email_status" in ('pending', 'sending', 'sent'));
