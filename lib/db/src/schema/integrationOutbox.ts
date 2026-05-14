import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { integrationReceiptsTable } from "./integrationReceipts";

export const integrationOutboxTable = pgTable(
  "integration_outbox",
  {
    id: serial("id").primaryKey(),
    receiptId: integer("receipt_id")
      .notNull()
      .references(() => integrationReceiptsTable.id, { onDelete: "cascade" }),
    targetKind: text("target_kind").notNull(),
    targetUrl: text("target_url"),
    eventName: text("event_name"),
    payload: jsonb("payload").notNull(),
    payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at").defaultNow().notNull(),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    // The full functional unique index (with COALESCE) is defined only in the SQL
    // migration for production; Drizzle push creates this simpler status index.
    index("integration_outbox_status_next_attempt_at_idx").on(
      t.status,
      t.nextAttemptAt,
    ),
  ],
);

export type IntegrationOutbox = typeof integrationOutboxTable.$inferSelect;
export type InsertIntegrationOutbox =
  typeof integrationOutboxTable.$inferInsert;
