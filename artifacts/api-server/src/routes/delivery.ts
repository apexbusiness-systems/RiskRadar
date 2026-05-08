import { Router } from "express";
import { db } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";
import {
  HttpError,
  obligationsTable,
  parsePositiveInt,
  scopeDeliveryHistoryQuery,
  workspaceMembersTable,
  deliveryHistoryTable,
} from "../lib/authz";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const workspaceId = parsePositiveInt(req.query.workspaceId as string | undefined, "workspaceId");
    const limit = Math.min(parsePositiveInt((req.query.limit as string | undefined) ?? "50", "limit"), 200);
    const obligationId = req.query.obligationId ? parsePositiveInt(req.query.obligationId as string, "obligationId") : undefined;
    const status = req.query.status as string | undefined;
    if (status && !["sent", "failed", "pending"].includes(status)) throw new HttpError(400, "invalid status");

    const scopeClause = await scopeDeliveryHistoryQuery(workspaceId, userId);
    const whereClause = and(
      scopeClause,
      obligationId ? eq(deliveryHistoryTable.obligationId, obligationId) : undefined,
      status ? eq(deliveryHistoryTable.status, status as "sent"|"failed"|"pending") : undefined,
    );

    const records = await db.select({
      id: deliveryHistoryTable.id,
      obligationId: deliveryHistoryTable.obligationId,
      ruleId: deliveryHistoryTable.ruleId,
      channel: deliveryHistoryTable.channel,
      recipientEmail: deliveryHistoryTable.recipientEmail,
      status: deliveryHistoryTable.status,
      errorMessage: deliveryHistoryTable.errorMessage,
      sentAt: deliveryHistoryTable.sentAt,
      obligationTitle: obligationsTable.title,
    }).from(deliveryHistoryTable)
    .innerJoin(obligationsTable, eq(deliveryHistoryTable.obligationId, obligationsTable.id))
    .innerJoin(workspaceMembersTable, eq(workspaceMembersTable.workspaceId, obligationsTable.workspaceId))
    .where(whereClause)
    .orderBy(desc(deliveryHistoryTable.sentAt))
    .limit(limit);

    res.json(records);
    return;
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "listDeliveryHistory error");
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

export default router;
