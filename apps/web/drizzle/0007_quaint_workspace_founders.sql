ALTER TABLE "workspace" ADD COLUMN "email_sender_founder" text DEFAULT 'fran' NOT NULL;
--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_email_sender_founder_check" CHECK ("workspace"."email_sender_founder" in ('fran', 'jere'));
