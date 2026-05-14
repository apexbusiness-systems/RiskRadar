CREATE TABLE "integration_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_app" text NOT NULL,
	"tenant_key" text NOT NULL,
	"event_type" text NOT NULL,
	"external_object_id" text,
	"idempotency_key" text NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"signature_timestamp" timestamp NOT NULL,
	"normalized_payload" jsonb NOT NULL,
	"decision" text NOT NULL,
	"decision_code" text,
	"decision_details" jsonb,
	"obligation_id" integer,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_id" integer NOT NULL,
	"target_kind" text NOT NULL,
	"target_url" text,
	"event_name" text,
	"payload" jsonb NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"status" text NOT NULL DEFAULT 'pending',
	"attempt_count" integer NOT NULL DEFAULT 0,
	"next_attempt_at" timestamp NOT NULL DEFAULT now(),
	"last_error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_receipts" ADD CONSTRAINT "integration_receipts_obligation_id_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."obligations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "integration_outbox" ADD CONSTRAINT "integration_outbox_receipt_id_integration_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."integration_receipts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "integration_receipts_source_tenant_idempotency_unique" ON "integration_receipts" ("source_app","tenant_key","idempotency_key");
--> statement-breakpoint
CREATE INDEX "integration_receipts_source_ext_obj_processed_idx" ON "integration_receipts" ("source_app","external_object_id","processed_at");
--> statement-breakpoint
CREATE INDEX "integration_receipts_decision_processed_idx" ON "integration_receipts" ("decision","processed_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "integration_outbox_dedup_unique" ON "integration_outbox" ("receipt_id","target_kind","payload_hash",COALESCE("target_url",''),COALESCE("event_name",''));
--> statement-breakpoint
CREATE INDEX "integration_outbox_status_next_attempt_at_idx" ON "integration_outbox" ("status","next_attempt_at");
