import { db } from "@workspace/db";
import { obligationsTable, workspaceMembersTable, deliveryHistoryTable, auditLogsTable } from "@workspace/db";
import { and, eq, SQL } from "drizzle-orm";

export type WorkspaceRole = "owner" | "admin" | "member";

export class AuthzError extends Error {
  constructor(public readonly status: 401 | 403 | 404, message: string) {
    super(message);
  }
}

export async function assertWorkspaceMember(workspaceId: number, clerkUserId: string) {
  const [member] = await db.select().from(workspaceMembersTable).where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.clerkUserId, clerkUserId))).limit(1);
  if (!member) throw new AuthzError(403, "Forbidden");
  return member;
}

export async function assertWorkspaceRole(workspaceId: number, clerkUserId: string, allowedRoles: WorkspaceRole[]) {
  const member = await assertWorkspaceMember(workspaceId, clerkUserId);
  if (!allowedRoles.includes(member.role)) throw new AuthzError(403, "Forbidden");
  return member;
}

export async function loadObligationForUser(obligationId: number, clerkUserId: string) {
  const [obligation] = await db.select().from(obligationsTable).where(eq(obligationsTable.id, obligationId)).limit(1);
  if (!obligation) throw new AuthzError(404, "Not found");
  await assertWorkspaceMember(obligation.workspaceId, clerkUserId);
  return obligation;
}

export async function scopeDeliveryHistoryQuery(workspaceId: number, clerkUserId: string): Promise<SQL[]> {
  await assertWorkspaceMember(workspaceId, clerkUserId);
  return [eq(obligationsTable.workspaceId, workspaceId)];
}

export async function scopeAuditLogQuery(workspaceId: number, clerkUserId: string): Promise<SQL[]> {
  await assertWorkspaceMember(workspaceId, clerkUserId);
  return [eq(auditLogsTable.workspaceId, workspaceId)];
}
