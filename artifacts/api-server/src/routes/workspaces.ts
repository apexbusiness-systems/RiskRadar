import { Router } from "express";
import { db } from "@workspace/db";
import {
  workspacesTable,
  workspaceMembersTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router = Router();
const PENDING_MEMBER_PREFIX = "pending:";

// ── Membership helpers ───────────────────────────────────────────────────────

async function getMember(workspaceId: number, clerkUserId: string) {
  const [member] = await db
    .select()
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.clerkUserId, clerkUserId),
      ),
    )
    .limit(1);
  if (!member) return null;
  // Pending invites never count as authenticated membership.
  if (member.clerkUserId.startsWith(PENDING_MEMBER_PREFIX)) return null;
  return member;
}

async function ensureMember(
  workspaceId: number,
  clerkUserId: string,
): Promise<boolean> {
  return !!(await getMember(workspaceId, clerkUserId));
}

async function ensureOwnerOrAdmin(
  workspaceId: number,
  clerkUserId: string,
): Promise<boolean> {
  const member = await getMember(workspaceId, clerkUserId);
  return !!member && (member.role === "owner" || member.role === "admin");
}

// Helper to safely extract a string route param from Express (Express 5 types can be string | string[])
function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : v;
}

// ── GET /api/workspaces ──────────────────────────────────────────────────────

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const memberships = await db
      .select({ workspaceId: workspaceMembersTable.workspaceId })
      .from(workspaceMembersTable)
      .where(eq(workspaceMembersTable.clerkUserId, userId));

    const workspaceIds = memberships.map((m) => m.workspaceId);
    if (workspaceIds.length === 0) {
      res.json([]);
      return;
    }

    const workspaces = await db
      .select()
      .from(workspacesTable)
      .where(inArray(workspacesTable.id, workspaceIds));

    res.json(workspaces);
  } catch (err) {
    req.log.error({ err }, "listWorkspaces error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/workspaces ─────────────────────────────────────────────────────

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { name, slug, email, displayName } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 80);

    const [workspace] = await db
      .insert(workspacesTable)
      .values({ name: String(name).slice(0, 200), slug: finalSlug })
      .returning();

    await db.insert(workspaceMembersTable).values({
      workspaceId: workspace.id,
      clerkUserId: userId,
      email: email || "",
      name: displayName || "",
      role: "owner",
    });

    res.status(201).json(workspace);
  } catch (err) {
    req.log.error({ err }, "createWorkspace error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/workspaces/:workspaceId ─────────────────────────────────────────

router.get("/:workspaceId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const workspaceId = parseInt(param(req, "workspaceId"));
  try {
    const ok = await ensureMember(workspaceId, userId);
    if (!ok) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, workspaceId))
      .limit(1);

    if (!workspace) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(workspace);
  } catch (err) {
    req.log.error({ err }, "getWorkspace error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/workspaces/:workspaceId ─────────────────────────────────────────
// Only owners and admins can rename a workspace

router.put("/:workspaceId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const workspaceId = parseInt(param(req, "workspaceId"));
  try {
    const ok = await ensureOwnerOrAdmin(workspaceId, userId);
    if (!ok) {
      res.status(403).json({ error: "Only owners and admins can update workspace settings" });
      return;
    }

    const { name, slug } = req.body;
    const [workspace] = await db
      .update(workspacesTable)
      .set({
        name: name ? String(name).slice(0, 200) : undefined,
        slug: slug ? String(slug).slice(0, 80) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(workspacesTable.id, workspaceId))
      .returning();

    await db.insert(auditLogsTable).values({
      workspaceId,
      actorClerkId: userId,
      action: "workspace.updated",
      details: { name, slug },
    });

    res.json(workspace);
  } catch (err) {
    req.log.error({ err }, "updateWorkspace error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/workspaces/:workspaceId/members ──────────────────────────────────

router.get("/:workspaceId/members", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const workspaceId = parseInt(param(req, "workspaceId"));
  try {
    const ok = await ensureMember(workspaceId, userId);
    if (!ok) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const members = await db
      .select()
      .from(workspaceMembersTable)
      .where(eq(workspaceMembersTable.workspaceId, workspaceId));
    res.json(
      members.map((m) => ({
        ...m,
        inviteStatus: m.clerkUserId.startsWith(PENDING_MEMBER_PREFIX)
          ? "pending"
          : "accepted",
      })),
    );
  } catch (err) {
    req.log.error({ err }, "listMembers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/workspaces/:workspaceId/members ─────────────────────────────────
// Adds a pending member row (real Clerk invitation requires backend SDK + webhooks)

router.post("/:workspaceId/members", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const workspaceId = parseInt(param(req, "workspaceId"));
  try {
    const ok = await ensureOwnerOrAdmin(workspaceId, userId);
    if (!ok) {
      res.status(403).json({ error: "Only owners and admins can invite members" });
      return;
    }

    const { email, role = "member", name } = req.body;
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    // Validate role
    const validRoles = ["admin", "member"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `role must be one of: ${validRoles.join(", ")}` });
      return;
    }

    // Avoid duplicate email within workspace
    const [existing] = await db
      .select({ id: workspaceMembersTable.id })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.email, email),
        ),
      )
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "This email is already a member of this workspace" });
      return;
    }

    const [member] = await db
      .insert(workspaceMembersTable)
      .values({
        workspaceId,
        // Placeholder clerkUserId until the invited user signs in via Clerk
        clerkUserId: `${PENDING_MEMBER_PREFIX}${String(email).toLowerCase().trim()}`,
        email: String(email).toLowerCase().trim(),
        name: name ? String(name).slice(0, 200) : null,
        role,
      })
      .returning();

    await db.insert(auditLogsTable).values({
      workspaceId,
      actorClerkId: userId,
      action: "member.invited",
      details: { email, role },
    });

    req.log.info(
      { workspaceId, role, actorUserId: userId },
      "security.invite.created",
    );
    res.status(201).json({ ...member, status: "pending_signup" });
  } catch (err) {
    req.log.error({ err }, "inviteMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/workspaces/:workspaceId/members/:memberId ─────────────────────

router.delete(
  "/:workspaceId/members/:memberId",
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).userId;
    const workspaceId = parseInt(param(req, "workspaceId"));
    const memberId = parseInt(param(req, "memberId"));
    try {
      const ok = await ensureOwnerOrAdmin(workspaceId, userId);
      if (!ok) {
        res.status(403).json({ error: "Only owners and admins can remove members" });
        return;
      }

      // Cannot remove yourself (owner)
      const [targetMember] = await db
        .select()
        .from(workspaceMembersTable)
        .where(
          and(
            eq(workspaceMembersTable.id, memberId),
            eq(workspaceMembersTable.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!targetMember) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      if (targetMember.clerkUserId === userId) {
        res.status(400).json({ error: "You cannot remove yourself from the workspace" });
        return;
      }

      await db
        .delete(workspaceMembersTable)
        .where(
          and(
            eq(workspaceMembersTable.id, memberId),
            eq(workspaceMembersTable.workspaceId, workspaceId),
          ),
        );

      await db.insert(auditLogsTable).values({
        workspaceId,
        actorClerkId: userId,
        action: "member.removed",
        details: { memberId, email: targetMember.email },
      });

      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "removeMember error");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
