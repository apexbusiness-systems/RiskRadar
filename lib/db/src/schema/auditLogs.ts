import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";
import { obligationsTable } from "./obligations";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspacesTable.id, {
    onDelete: "set null",
  }),
  obligationId: integer("obligation_id").references(() => obligationsTable.id, {
    onDelete: "set null",
  }),
  obligationTitle: text("obligation_title"),
  actorClerkId: text("actor_clerk_id"),
  actorName: text("actor_name"),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
