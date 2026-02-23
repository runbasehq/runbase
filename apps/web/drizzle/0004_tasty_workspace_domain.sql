CREATE TABLE "workspace_domain" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"domain" text NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"verification_details" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_domain_verification_status_check" CHECK ("workspace_domain"."verification_status" in ('pending', 'verified')),
	CONSTRAINT "workspace_domain_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "workspace_domain_domain_unique" UNIQUE("domain"),
	CONSTRAINT "workspace_domain_workspace_id_domain_unique" UNIQUE("workspace_id","domain")
);
--> statement-breakpoint
CREATE INDEX "workspace_domain_workspace_id_idx" ON "workspace_domain" USING btree ("workspace_id");
