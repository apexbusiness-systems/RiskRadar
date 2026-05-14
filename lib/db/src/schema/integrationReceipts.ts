import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  varchar,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { obligationsTable } from "./obligations";

export const integrationReceiptsTable = pgTable(
  "integration_receipts",
  {
    id: serial("id").primaryKey(),
    sourceApp: text("source_app").notNull(),
    tenantKey: text("tenant_key").notNull(),
    eventType: text("event_type").notNull(),
    externalObjectId: text("external_object_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    signatureTimestamp: timestamp("signature_timestamp").notNull(),
    normalizedPayload: jsonb("normalized_payload").notNull(),
    decision: text("decision").notNull(),
    decisionCode: text("decision_code"),
    decisionDetails: jsonb("decision_details"),
    obligationId: integer("obligation_id").references(
      () => obligationsTable.id,
      { onDelete: "set null" },
    ),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex(
      "integration_receipts_source_tenant_idempotency_unique",
    ).on(t.sourceApp, t.tenantKey, t.idempotencyKey),
    index("integration_receipts_source_ext_obj_processed_idx").on(
      t.sourceApp,
      t.externalObjectId,
      t.processedAt,
    ),
    index("integration_receipts_decision_processed_idx").on(
      t.decision,
      t.processedAt,
    ),
  ],
);

export type IntegrationReceipt =
  typeof integrationReceiptsTable.$inferSelect;
export type InsertIntegrationReceipt =
  typeof integrationReceiptsTable.$inferInsert;
