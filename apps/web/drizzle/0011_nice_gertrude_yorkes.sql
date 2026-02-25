ALTER TABLE "workspace" ADD COLUMN "feedback_default_sort" text DEFAULT 'top' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "feedback_hide_leaderboard" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "feedback_hide_closed_statuses" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "feedback_hide_all_statuses" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "feedback_allow_public_tag_selection" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_feedback_default_sort_check" CHECK ("workspace"."feedback_default_sort" in ('new', 'top', 'trending'));