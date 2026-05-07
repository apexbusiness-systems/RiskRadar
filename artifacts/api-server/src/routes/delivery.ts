import { Router } from "express";
import { db } from "@workspace/db";
import { deliveryHistoryTable, obligationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { AuthzError, scopeDeliveryHistoryQuery } from "../lib/authz";
import type { Request, Response } from "express";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId: workspaceIdStr, obligationId, status, limit: limitStr } = req.query as Record<string, string>;
    if (!workspaceIdStr) return void res.status(400).json({ error: "workspaceId is required" });
    const workspaceId = parseInt(workspaceIdStr, 10);
    if (!Number.isInteger(workspaceId)) return void res.status(400).json({ error: "Invalid workspaceId" });
    const limit = Math.min(Math.max(parseInt(limitStr || "50", 10), 1), 200);
    const filters = await scopeDeliveryHistoryQuery(workspaceId, (req as AuthenticatedRequest).userId);
    if (obligationId) {
      const parsed = parseInt(obligationId, 10);
      if (!Number.isInteger(parsed)) return void res.status(400).json({ error: "Invalid obligationId" });
      filters.push(eq(deliveryHistoryTable.obligationId, parsed));
    }
    if (status) {
      if (!["sent", "failed", "pending"].includes(status)) return void res.status(400).json({ error: "Invalid status" });
      filters.push(eq(deliveryHistoryTable.status, status as "sent" | "failed" | "pending"));
    }

    const records = await db.select({ id: deliveryHistoryTable.id, obligationId: deliveryHistoryTable.obligationId, ruleId: deliveryHistoryTable.ruleId, channel: deliveryHistoryTable.channel, recipientEmail: deliveryHistoryTable.recipientEmail, status: deliveryHistoryTable.status, errorMessage: deliveryHistoryTable.errorMessage, sentAt: deliveryHistoryTable.sentAt, obligationTitle: obligationsTable.title }).from(deliveryHistoryTable).innerJoin(obligationsTable, eq(deliveryHistoryTable.obligationId, obligationsTable.id)).where(and(...filters)).orderBy(desc(deliveryHistoryTable.sentAt)).limit(limit);
    res.json(records);
  } catch (err) {
    if (err instanceof AuthzError) return void res.status(err.status).json({ error: err.message });
    req.log.error({ err }, "listDeliveryHistory error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
