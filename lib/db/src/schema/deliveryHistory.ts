import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { obligationsTable } from "./obligations";

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "sent",
  "failed",
  "pending",
]);

export const deliveryHistoryTable = pgTable("delivery_history", {
  id: serial("id").primaryKey(),
  obligationId: integer("obligation_id")
    .notNull()
    .references(() => obligationsTable.id, { onDelete: "cascade" }),
  ruleId: integer("rule_id"),
  channel: text("channel").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertDeliveryHistorySchema = createInsertSchema(
  deliveryHistoryTable,
).omit({ id: true, sentAt: true });

export type InsertDeliveryHistory = z.infer<typeof insertDeliveryHistorySchema>;
export type DeliveryHistory = typeof deliveryHistoryTable.$inferSelect;
