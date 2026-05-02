import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router = Router();

// GET /api/audit-logs
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, obligationId, limit: limitStr } = req.query as Record<string, string>;
    const limit = parseInt(limitStr || "50");

    const filters = [];
    if (workspaceId) {
      filters.push(eq(auditLogsTable.workspaceId, parseInt(workspaceId)));
    }
    if (obligationId) {
      filters.push(eq(auditLogsTable.obligationId, parseInt(obligationId)));
    }

    const logs = filters.length
      ? await db
          .select()
          .from(auditLogsTable)
          .where(and(...filters))
          .orderBy(desc(auditLogsTable.createdAt))
          .limit(limit)
      : await db
          .select()
          .from(auditLogsTable)
          .orderBy(desc(auditLogsTable.createdAt))
          .limit(limit);

    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "listAuditLogs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
