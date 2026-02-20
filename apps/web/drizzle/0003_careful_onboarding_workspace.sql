ALTER TABLE "workspace" ADD COLUMN "feedback_access" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "primary_goal" text DEFAULT 'capture_manage_feedback' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "onboarding_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_feedback_access_check" CHECK ("workspace"."feedback_access" in ('public', 'private'));--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_primary_goal_check" CHECK ("workspace"."primary_goal" in ('capture_manage_feedback'));--> statement-breakpoint
UPDATE "workspace"
SET "onboarding_completed_at" = COALESCE("onboarding_completed_at", "created_at")
WHERE "onboarding_completed_at" IS NULL;
