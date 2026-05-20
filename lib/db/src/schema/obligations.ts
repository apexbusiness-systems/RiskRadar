import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  date,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const obligationStatusEnum = pgEnum("obligation_status", [
  "active",
  "expired",
  "completed",
  "paused",
]);

export const renewalFrequencyEnum = pgEnum("renewal_frequency", [
  "once",
  "monthly",
  "quarterly",
  "annually",
  "custom",
]);

export const obligationsTable = pgTable("obligations", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  status: obligationStatusEnum("status").notNull().default("active"),
  dueDate: date("due_date").notNull(),
  renewalFrequency: renewalFrequencyEnum("renewal_frequency"),
  customFrequencyDays: integer("custom_frequency_days"),
  ownerClerkId: text("owner_clerk_id"),
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  backupOwnerClerkId: text("backup_owner_clerk_id"),
  backupOwnerName: text("backup_owner_name"),
  backupOwnerEmail: text("backup_owner_email"),
  notes: text("notes"),
  tags: text("tags").array().notNull().default([]),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  healthScore: integer("health_score").notNull().default(0),
}, (table) => [
  index("idx_obligations_health_score").on(table.healthScore),
]);

export const insertObligationSchema = createInsertSchema(obligationsTable).omit(
  {
    id: true,
    completedAt: true,
    createdAt: true,
    updatedAt: true,
    healthScore: true,
  },
);

export type InsertObligation = z.infer<typeof insertObligationSchema>;
export type Obligation = typeof obligationsTable.$inferSelect;
