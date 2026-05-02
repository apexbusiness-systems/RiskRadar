import { Router } from "express";
import { db } from "@workspace/db";
import {
  workspacesTable,
  workspaceMembersTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router = Router();

// Ensure current user is a member of a workspace
async function ensureMember(
  workspaceId: number,
  clerkUserId: string,
): Promise<boolean> {
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
  return !!member;
}

// GET /api/workspaces
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const members = await db
      .select({ workspaceId: workspaceMembersTable.workspaceId })
      .from(workspaceMembersTable)
      .where(eq(workspaceMembersTable.clerkUserId, userId));

    const workspaceIds = members.map((m) => m.workspaceId);
    if (workspaceIds.length === 0) {
      res.json([]);
      return;
    }

    const workspaces = await db
      .select()
      .from(workspacesTable)
      .where(
        workspaceIds.length === 1
          ? eq(workspacesTable.id, workspaceIds[0])
          : workspaceIds.reduce(
              (acc: ReturnType<typeof eq>, id, i) =>
                i === 0 ? eq(workspacesTable.id, id) : acc,
              eq(workspacesTable.id, workspaceIds[0]),
            ),
      );

    // Simpler: fetch all and filter
    const allWorkspaces = await db.select().from(workspacesTable);
    const result = allWorkspaces.filter((w) => workspaceIds.includes(w.id));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "listWorkspaces error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/workspaces
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { name, slug } = req.body;
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    const [workspace] = await db
      .insert(workspacesTable)
      .values({ name, slug: finalSlug })
      .returning();

    // Add creator as owner
    await db.insert(workspaceMembersTable).values({
      workspaceId: workspace.id,
      clerkUserId: userId,
      email: req.body.email || "",
      name: req.body.name || "",
      role: "owner",
    });

    res.status(201).json(workspace);
  } catch (err) {
    req.log.error({ err }, "createWorkspace error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/workspaces/:workspaceId
router.get("/:workspaceId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const workspaceId = parseInt(req.params.workspaceId);
  try {
    const isMember = await ensureMember(workspaceId, userId);
    if (!isMember) {
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

// PUT /api/workspaces/:workspaceId
router.put("/:workspaceId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const workspaceId = parseInt(req.params.workspaceId);
  try {
    const isMember = await ensureMember(workspaceId, userId);
    if (!isMember) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { name, slug } = req.body;
    const [workspace] = await db
      .update(workspacesTable)
      .set({
        name,
        slug,
        updatedAt: new Date(),
      })
      .where(eq(workspacesTable.id, workspaceId))
      .returning();

    res.json(workspace);
  } catch (err) {
    req.log.error({ err }, "updateWorkspace error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/workspaces/:workspaceId/members
router.get("/:workspaceId/members", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const workspaceId = parseInt(req.params.workspaceId);
  try {
    const isMember = await ensureMember(workspaceId, userId);
    if (!isMember) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const members = await db
      .select()
      .from(workspaceMembersTable)
      .where(eq(workspaceMembersTable.workspaceId, workspaceId));

    res.json(members);
  } catch (err) {
    req.log.error({ err }, "listMembers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/workspaces/:workspaceId/members
router.post("/:workspaceId/members", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const workspaceId = parseInt(req.params.workspaceId);
  try {
    const isMember = await ensureMember(workspaceId, userId);
    if (!isMember) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { email, role = "member" } = req.body;
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    const [member] = await db
      .insert(workspaceMembersTable)
      .values({
        workspaceId,
        clerkUserId: `invited:${email}`,
        email,
        role,
      })
      .returning();

    res.status(201).json(member);
  } catch (err) {
    req.log.error({ err }, "inviteMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/workspaces/:workspaceId/members/:memberId
router.delete("/:workspaceId/members/:memberId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const workspaceId = parseInt(req.params.workspaceId);
  const memberId = parseInt(req.params.memberId);
  try {
    const isMember = await ensureMember(workspaceId, userId);
    if (!isMember) {
      res.status(403).json({ error: "Forbidden" });
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
      details: { memberId },
    });

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "removeMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
