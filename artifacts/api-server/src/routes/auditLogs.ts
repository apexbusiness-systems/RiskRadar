import { Router } from "express";
import { db } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import {
  AuthzError,
  HttpError,
  auditLogsTable,
  parsePositiveInt,
  scopeAuditLogQuery,
} from "../lib/authz";
import type { Request, Response } from "express";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId: workspaceIdStr, obligationId, limit: limitStr } = req.query as Record<string, string>;
    const workspaceId = parsePositiveInt(workspaceIdStr, "workspaceId");
    const limit = Math.min(Math.max(parsePositiveInt(limitStr || "50", "limit"), 1), 200);
    const filters = await scopeAuditLogQuery(workspaceId, (req as AuthenticatedRequest).userId);
    if (obligationId) filters.push(eq(auditLogsTable.obligationId, parsePositiveInt(obligationId, "obligationId")));

    const logs = await db.select().from(auditLogsTable).where(and(...filters)).orderBy(desc(auditLogsTable.createdAt)).limit(limit);
    res.json(logs);
    return;
  } catch (err) {
    if (err instanceof AuthzError || err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
    req.log.error({ err }, "listAuditLogs error");
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

export default router;
