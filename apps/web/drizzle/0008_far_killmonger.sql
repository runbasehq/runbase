CREATE TABLE "billing_webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'polar' NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"payload" text NOT NULL,
	"last_error" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_webhook_event_provider_event_unique" UNIQUE("provider","provider_event_id"),
	CONSTRAINT "billing_webhook_event_status_check" CHECK ("billing_webhook_event"."status" in ('received', 'processed', 'failed', 'ignored'))
);
--> statement-breakpoint
CREATE TABLE "workspace_billing_customer" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text DEFAULT 'polar' NOT NULL,
	"provider_customer_id" text NOT NULL,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_billing_customer_workspace_id_unique" UNIQUE("workspace_id"),
	CONSTRAINT "workspace_billing_customer_provider_customer_id_unique" UNIQUE("provider_customer_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"customer_id" text,
	"provider" text DEFAULT 'polar' NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"plan_key" text NOT NULL,
	"status" text NOT NULL,
	"billing_interval" text DEFAULT 'monthly' NOT NULL,
	"seat_limit" integer,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"canceled_at" timestamp,
	"provider_product_id" text,
	"provider_price_id" text,
	"raw_payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_subscription_workspace_id_unique" UNIQUE("workspace_id"),
	CONSTRAINT "workspace_subscription_provider_subscription_id_unique" UNIQUE("provider_subscription_id"),
	CONSTRAINT "workspace_subscription_billing_interval_check" CHECK ("workspace_subscription"."billing_interval" in ('monthly', 'yearly')),
	CONSTRAINT "workspace_subscription_status_check" CHECK ("workspace_subscription"."status" in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'paused', 'unpaid')),
	CONSTRAINT "workspace_subscription_plan_key_check" CHECK ("workspace_subscription"."plan_key" in ('growth', 'professional', 'enterprise'))
);
--> statement-breakpoint
ALTER TABLE "workspace_billing_customer" ADD CONSTRAINT "workspace_billing_customer_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_subscription" ADD CONSTRAINT "workspace_subscription_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "workspace_subscription" ADD CONSTRAINT "workspace_subscription_customer_id_workspace_billing_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."workspace_billing_customer"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "billing_webhook_event_status_idx" ON "billing_webhook_event" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "billing_webhook_event_received_at_idx" ON "billing_webhook_event" USING btree ("received_at");
--> statement-breakpoint
CREATE INDEX "workspace_billing_customer_provider_idx" ON "workspace_billing_customer" USING btree ("provider");
--> statement-breakpoint
CREATE INDEX "workspace_subscription_status_idx" ON "workspace_subscription" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "workspace_subscription_provider_idx" ON "workspace_subscription" USING btree ("provider");
--> statement-breakpoint
CREATE INDEX "workspace_subscription_period_end_idx" ON "workspace_subscription" USING btree ("current_period_end");
