import { Router } from "express";
import { db } from "@workspace/db";
import { deliveryHistoryTable, obligationsTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router = Router();

// GET /api/delivery-history
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, obligationId, status, limit: limitStr } = req.query as Record<string, string>;
    const limit = parseInt(limitStr || "50");

    let records = await db
      .select({
        id: deliveryHistoryTable.id,
        obligationId: deliveryHistoryTable.obligationId,
        ruleId: deliveryHistoryTable.ruleId,
        channel: deliveryHistoryTable.channel,
        recipientEmail: deliveryHistoryTable.recipientEmail,
        status: deliveryHistoryTable.status,
        errorMessage: deliveryHistoryTable.errorMessage,
        sentAt: deliveryHistoryTable.sentAt,
        obligationTitle: obligationsTable.title,
      })
      .from(deliveryHistoryTable)
      .leftJoin(
        obligationsTable,
        eq(deliveryHistoryTable.obligationId, obligationsTable.id),
      )
      .orderBy(desc(deliveryHistoryTable.sentAt))
      .limit(limit);

    // Filter by obligationId
    if (obligationId) {
      records = records.filter(
        (r) => r.obligationId === parseInt(obligationId),
      );
    }

    // Filter by status
    if (status && ["sent", "failed", "pending"].includes(status)) {
      records = records.filter((r) => r.status === status);
    }

    res.json(records);
  } catch (err) {
    req.log.error({ err }, "listDeliveryHistory error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
