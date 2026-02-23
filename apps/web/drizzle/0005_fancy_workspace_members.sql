CREATE TABLE "workspace_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'contributor' NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"canceled_at" timestamp,
	"last_sent_at" timestamp,
	"send_count" integer DEFAULT 0 NOT NULL,
	"email_message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invitation_role_check" CHECK ("workspace_invitation"."role" in ('admin', 'contributor')),
	CONSTRAINT "workspace_invitation_status_check" CHECK ("workspace_invitation"."status" in ('pending', 'accepted', 'canceled', 'expired')),
	CONSTRAINT "workspace_invitation_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "workspace_invitation_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "workspace_invitation_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
UPDATE "workspace_member" SET "role" = 'admin' WHERE "role" = 'owner';
--> statement-breakpoint
UPDATE "workspace_member" SET "role" = 'contributor' WHERE "role" = 'member';
--> statement-breakpoint
ALTER TABLE "workspace_member" ALTER COLUMN "role" SET DEFAULT 'contributor';
--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_role_check" CHECK ("workspace_member"."role" in ('admin', 'contributor'));
--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invitation_workspace_email_pending_unique" ON "workspace_invitation" USING btree ("workspace_id","email") WHERE "workspace_invitation"."status" = 'pending';
--> statement-breakpoint
CREATE INDEX "workspace_invitation_workspace_id_idx" ON "workspace_invitation" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "workspace_invitation_email_idx" ON "workspace_invitation" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "workspace_invitation_status_idx" ON "workspace_invitation" USING btree ("status");
