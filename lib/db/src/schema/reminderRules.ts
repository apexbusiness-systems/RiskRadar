import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { obligationsTable } from "./obligations";

export const reminderChannelEnum = pgEnum("reminder_channel", [
  "email",
  "in_app",
]);

export const recipientTypeEnum = pgEnum("recipient_type", [
  "owner",
  "backup_owner",
  "all_members",
  "custom_email",
]);

export const reminderRulesTable = pgTable("reminder_rules", {
  id: serial("id").primaryKey(),
  obligationId: integer("obligation_id")
    .notNull()
    .references(() => obligationsTable.id, { onDelete: "cascade" }),
  daysBefore: integer("days_before").notNull(),
  channel: reminderChannelEnum("channel").notNull().default("email"),
  recipientType: recipientTypeEnum("recipient_type").notNull().default("owner"),
  customEmail: text("custom_email"),
  isActive: boolean("is_active").notNull().default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReminderRuleSchema = createInsertSchema(
  reminderRulesTable,
).omit({ id: true, lastTriggeredAt: true, createdAt: true });

export type InsertReminderRule = z.infer<typeof insertReminderRuleSchema>;
export type ReminderRule = typeof reminderRulesTable.$inferSelect;
