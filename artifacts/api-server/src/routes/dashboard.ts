import { Router } from "express";
import { db } from "@workspace/db";
import {
  obligationsTable,
  deliveryHistoryTable,
  workspaceMembersTable,
} from "@workspace/db";
import { eq, and, gte, lte, lt, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router = Router();

// GET /api/dashboard/metrics
router.get("/metrics", requireAuth, async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let baseQuery = db.select().from(obligationsTable);
    const workspaceId = req.query.workspaceId
      ? parseInt(req.query.workspaceId as string)
      : null;

    const obligations = workspaceId
      ? await db
          .select()
          .from(obligationsTable)
          .where(eq(obligationsTable.workspaceId, workspaceId))
      : await db.select().from(obligationsTable);

    const totalActive = obligations.filter((o) => o.status === "active").length;
    const overdue = obligations.filter(
      (o) => o.status === "active" && o.dueDate < today,
    ).length;
    const dueSoon = obligations.filter(
      (o) =>
        o.status === "active" && o.dueDate >= today && o.dueDate <= in30Days,
    ).length;
    const completed = obligations.filter((o) => o.status === "completed").length;
    const expired = obligations.filter((o) => o.status === "expired").length;
    const paused = obligations.filter((o) => o.status === "paused").length;

    // Reminder count last 30 days
    const deliveries = workspaceId
      ? await db
          .select()
          .from(deliveryHistoryTable)
          .where(
            and(
              gte(deliveryHistoryTable.sentAt, thirtyDaysAgo),
              eq(deliveryHistoryTable.status, "sent"),
            ),
          )
      : await db
          .select()
          .from(deliveryHistoryTable)
          .where(gte(deliveryHistoryTable.sentAt, thirtyDaysAgo));

    const remindersSentLast30Days = deliveries.length;

    // By category
    const categoryMap: Record<string, number> = {};
    for (const o of obligations) {
      categoryMap[o.category] = (categoryMap[o.category] || 0) + 1;
    }
    const byCategory = Object.entries(categoryMap).map(([category, cnt]) => ({
      category,
      count: cnt,
    }));

    res.json({
      totalActive,
      overdue,
      dueSoon,
      completed,
      expired,
      paused,
      remindersSentLast30Days,
      byCategory,
    });
  } catch (err) {
    req.log.error({ err }, "getDashboardMetrics error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/upcoming
router.get("/upcoming", requireAuth, async (req: Request, res: Response) => {
  try {
    const days = parseInt((req.query.days as string) || "30");
    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const workspaceId = req.query.workspaceId
      ? parseInt(req.query.workspaceId as string)
      : null;

    const base = and(
      eq(obligationsTable.status, "active"),
      gte(obligationsTable.dueDate, today),
      lte(obligationsTable.dueDate, futureDate),
    );

    const obligations = workspaceId
      ? await db
          .select()
          .from(obligationsTable)
          .where(and(base, eq(obligationsTable.workspaceId, workspaceId)))
      : await db.select().from(obligationsTable).where(base);

    res.json(obligations);
  } catch (err) {
    req.log.error({ err }, "getUpcoming error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
