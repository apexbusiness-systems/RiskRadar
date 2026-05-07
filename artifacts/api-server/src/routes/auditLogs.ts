import { Router } from "express";
import { db } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";
import { auditLogsTable, HttpError, parsePositiveInt, scopeAuditLogQuery } from "../lib/authz";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const workspaceId = parsePositiveInt(req.query.workspaceId as string | undefined, "workspaceId");
    const obligationId = req.query.obligationId ? parsePositiveInt(req.query.obligationId as string, "obligationId") : undefined;
    const limit = Math.min(parsePositiveInt((req.query.limit as string | undefined) ?? "50", "limit"), 200);

    const scopeClause = await scopeAuditLogQuery(workspaceId, userId);
    const logs = await db.select().from(auditLogsTable)
      .where(and(scopeClause, obligationId ? eq(auditLogsTable.obligationId, obligationId) : undefined))
      .orderBy(desc(auditLogsTable.createdAt)).limit(limit);
    res.json(logs);
    return;
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "listAuditLogs error");
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

export default router;
