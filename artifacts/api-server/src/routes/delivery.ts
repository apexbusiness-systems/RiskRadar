import { Router } from "express";
import { db } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import {
  AuthzError,
  HttpError,
  deliveryHistoryTable,
  obligationsTable,
  parsePositiveInt,
  scopeDeliveryHistoryQuery,
} from "../lib/authz";
import type { Request, Response } from "express";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId: workspaceIdStr, obligationId, status, limit: limitStr } = req.query as Record<string, string>;
    const workspaceId = parsePositiveInt(workspaceIdStr, "workspaceId");
    const limit = Math.min(Math.max(parsePositiveInt(limitStr || "50", "limit"), 1), 200);
    const filters = await scopeDeliveryHistoryQuery(workspaceId, (req as AuthenticatedRequest).userId);
    if (obligationId) filters.push(eq(deliveryHistoryTable.obligationId, parsePositiveInt(obligationId, "obligationId")));
    if (status) {
      if (!["sent", "failed", "pending"].includes(status)) throw new HttpError(400, "Invalid status");
      filters.push(eq(deliveryHistoryTable.status, status as "sent" | "failed" | "pending"));
    }

    const records = await db.select({ id: deliveryHistoryTable.id, obligationId: deliveryHistoryTable.obligationId, ruleId: deliveryHistoryTable.ruleId, channel: deliveryHistoryTable.channel, recipientEmail: deliveryHistoryTable.recipientEmail, status: deliveryHistoryTable.status, errorMessage: deliveryHistoryTable.errorMessage, sentAt: deliveryHistoryTable.sentAt, obligationTitle: obligationsTable.title }).from(deliveryHistoryTable).innerJoin(obligationsTable, eq(deliveryHistoryTable.obligationId, obligationsTable.id)).where(and(...filters)).orderBy(desc(deliveryHistoryTable.sentAt)).limit(limit);
    res.json(records);
    return;
  } catch (err) {
    if (err instanceof AuthzError || err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
    req.log.error({ err }, "listDeliveryHistory error");
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

export default router;
