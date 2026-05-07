import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { AuthzError, scopeAuditLogQuery } from "../lib/authz";
import type { Request, Response } from "express";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId: workspaceIdStr, obligationId, limit: limitStr } = req.query as Record<string, string>;
    if (!workspaceIdStr) return void res.status(400).json({ error: "workspaceId is required" });
    const workspaceId = parseInt(workspaceIdStr, 10);
    if (!Number.isInteger(workspaceId)) return void res.status(400).json({ error: "Invalid workspaceId" });
    const limit = Math.min(Math.max(parseInt(limitStr || "50", 10), 1), 200);
    const filters = await scopeAuditLogQuery(workspaceId, (req as AuthenticatedRequest).userId);
    if (obligationId) {
      const parsed = parseInt(obligationId, 10);
      if (!Number.isInteger(parsed)) return void res.status(400).json({ error: "Invalid obligationId" });
      filters.push(eq(auditLogsTable.obligationId, parsed));
    }
    const logs = await db.select().from(auditLogsTable).where(and(...filters)).orderBy(desc(auditLogsTable.createdAt)).limit(limit);
    res.json(logs);
  } catch (err) {
    if (err instanceof AuthzError) return void res.status(err.status).json({ error: err.message });
    req.log.error({ err }, "listAuditLogs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
