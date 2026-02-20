CREATE TABLE "feedback_board" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_board_workspace_id_slug_unique" UNIQUE("workspace_id","slug"),
	CONSTRAINT "feedback_board_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "feedback_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"post_id" text NOT NULL,
	"author_user_id" text,
	"anon_session_id" text,
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_comment_at_least_one_identity" CHECK ("feedback_comment"."author_user_id" is not null or "feedback_comment"."anon_session_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "feedback_post" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"board_id" text NOT NULL,
	"status_id" text NOT NULL,
	"author_user_id" text,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content" text NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_post_workspace_slug_unique" UNIQUE("workspace_id","slug"),
	CONSTRAINT "feedback_post_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "feedback_post_tag" (
	"workspace_id" text NOT NULL,
	"post_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_post_tag_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "feedback_status" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"color" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_status_workspace_key_unique" UNIQUE("workspace_id","key"),
	CONSTRAINT "feedback_status_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "feedback_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_tag_workspace_slug_unique" UNIQUE("workspace_id","slug"),
	CONSTRAINT "feedback_tag_workspace_id_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "feedback_vote" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text,
	"anon_session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_vote_exactly_one_identity" CHECK (("feedback_vote"."user_id" is not null and "feedback_vote"."anon_session_id" is null) or ("feedback_vote"."user_id" is null and "feedback_vote"."anon_session_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "feedback_board" ADD CONSTRAINT "feedback_board_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_workspace_post_fk" FOREIGN KEY ("workspace_id","post_id") REFERENCES "public"."feedback_post"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_post" ADD CONSTRAINT "feedback_post_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_post" ADD CONSTRAINT "feedback_post_workspace_board_fk" FOREIGN KEY ("workspace_id","board_id") REFERENCES "public"."feedback_board"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_post" ADD CONSTRAINT "feedback_post_workspace_status_fk" FOREIGN KEY ("workspace_id","status_id") REFERENCES "public"."feedback_status"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_post_tag" ADD CONSTRAINT "feedback_post_tag_workspace_post_fk" FOREIGN KEY ("workspace_id","post_id") REFERENCES "public"."feedback_post"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_post_tag" ADD CONSTRAINT "feedback_post_tag_workspace_tag_fk" FOREIGN KEY ("workspace_id","tag_id") REFERENCES "public"."feedback_tag"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_status" ADD CONSTRAINT "feedback_status_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_tag" ADD CONSTRAINT "feedback_tag_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_vote" ADD CONSTRAINT "feedback_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_vote" ADD CONSTRAINT "feedback_vote_workspace_post_fk" FOREIGN KEY ("workspace_id","post_id") REFERENCES "public"."feedback_post"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_board_workspace_id_idx" ON "feedback_board" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_board_workspace_default_unique" ON "feedback_board" USING btree ("workspace_id") WHERE "feedback_board"."is_default" = true;--> statement-breakpoint
CREATE INDEX "feedback_comment_workspace_post_created_idx" ON "feedback_comment" USING btree ("workspace_id","post_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_post_workspace_id_idx" ON "feedback_post" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "feedback_post_workspace_board_created_idx" ON "feedback_post" USING btree ("workspace_id","board_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_post_workspace_status_created_idx" ON "feedback_post" USING btree ("workspace_id","status_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_post_workspace_upvote_idx" ON "feedback_post" USING btree ("workspace_id","upvote_count");--> statement-breakpoint
CREATE INDEX "feedback_post_tag_workspace_tag_idx" ON "feedback_post_tag" USING btree ("workspace_id","tag_id");--> statement-breakpoint
CREATE INDEX "feedback_status_workspace_id_idx" ON "feedback_status" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "feedback_status_workspace_position_idx" ON "feedback_status" USING btree ("workspace_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_status_workspace_default_unique" ON "feedback_status" USING btree ("workspace_id") WHERE "feedback_status"."is_default" = true;--> statement-breakpoint
CREATE INDEX "feedback_tag_workspace_id_idx" ON "feedback_tag" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "feedback_vote_workspace_post_idx" ON "feedback_vote" USING btree ("workspace_id","post_id");--> statement-breakpoint
CREATE INDEX "feedback_vote_workspace_created_idx" ON "feedback_vote" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_vote_post_user_unique" ON "feedback_vote" USING btree ("post_id","user_id") WHERE "feedback_vote"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_vote_post_anon_session_unique" ON "feedback_vote" USING btree ("post_id","anon_session_id") WHERE "feedback_vote"."anon_session_id" is not null;