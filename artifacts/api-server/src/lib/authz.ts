import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogsTable,
  deliveryHistoryTable,
  obligationsTable,
  workspaceMembersTable,
} from "@workspace/db";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export async function assertWorkspaceMember(workspaceId: number, clerkUserId: string) {
  const [member] = await db
    .select({ id: workspaceMembersTable.id })
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.clerkUserId, clerkUserId),
      ),
    )
    .limit(1);

  if (!member) {
    throw new HttpError(403, "Forbidden");
  }
}

export async function assertWorkspaceRole(
  workspaceId: number,
  clerkUserId: string,
  allowedRoles: Array<"owner" | "admin" | "member">,
) {
  const [member] = await db
    .select({ role: workspaceMembersTable.role })
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.clerkUserId, clerkUserId),
      ),
    )
    .limit(1);

  if (!member) throw new HttpError(403, "Forbidden");
  if (!allowedRoles.includes(member.role)) throw new HttpError(403, "Forbidden");
}

export async function loadObligationForUser(obligationId: number, clerkUserId: string) {
  const [obligation] = await db
    .select()
    .from(obligationsTable)
    .innerJoin(
      workspaceMembersTable,
      and(
        eq(workspaceMembersTable.workspaceId, obligationsTable.workspaceId),
        eq(workspaceMembersTable.clerkUserId, clerkUserId),
      ),
    )
    .where(eq(obligationsTable.id, obligationId))
    .limit(1);

  return obligation?.obligations ?? null;
}

export async function scopeDeliveryHistoryQuery(workspaceId: number, clerkUserId: string) {
  await assertWorkspaceMember(workspaceId, clerkUserId);
  return and(
    eq(obligationsTable.workspaceId, workspaceId),
    eq(workspaceMembersTable.workspaceId, workspaceId),
    eq(workspaceMembersTable.clerkUserId, clerkUserId),
  );
}

export async function scopeAuditLogQuery(workspaceId: number, clerkUserId: string) {
  await assertWorkspaceMember(workspaceId, clerkUserId);
  return eq(auditLogsTable.workspaceId, workspaceId);
}

export function parsePositiveInt(value: string | undefined, field: string): number {
  if (!value) throw new HttpError(400, `${field} is required`);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new HttpError(400, `${field} must be a positive integer`);
  return parsed;
}

export { deliveryHistoryTable, obligationsTable, workspaceMembersTable, auditLogsTable };
