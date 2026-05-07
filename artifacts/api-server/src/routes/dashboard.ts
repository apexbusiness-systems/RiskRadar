import { Router } from "express";
import { db } from "@workspace/db";
import {
  obligationsTable,
  deliveryHistoryTable,
  workspaceMembersTable,
  reminderRulesTable,
} from "@workspace/db";
import { eq, and, gte, lte, sql, isNull, notExists } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";
import { assertWorkspaceMember } from "../lib/authz";

const router = Router();

// ── Membership guard ─────────────────────────────────────────────────────────

async function isMember(workspaceId: number, clerkUserId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: workspaceMembersTable.id })
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.clerkUserId, clerkUserId),
      ),
    )
    .limit(1);
  return !!row;
}

// ── GET /api/dashboard/metrics ───────────────────────────────────────────────

router.get("/metrics", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const workspaceIdParam = req.query.workspaceId as string | undefined;
    if (!workspaceIdParam) {
      res.status(400).json({ error: "workspaceId is required" });
      return;
    }

    const workspaceId = parseInt(workspaceIdParam, 10);
    if (!Number.isInteger(workspaceId)) { res.status(400).json({ error: "Invalid workspaceId" }); return; }
    await assertWorkspaceMember(workspaceId, userId);

    const today = new Date().toISOString().split("T")[0];
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Use SQL aggregates — no full table scan into JS
    const statusCounts = await db
      .select({
        status: obligationsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(obligationsTable)
      .where(eq(obligationsTable.workspaceId, workspaceId))
      .groupBy(obligationsTable.status);

    const totalActive = statusCounts.find((r) => r.status === "active")?.count ?? 0;
    const completed = statusCounts.find((r) => r.status === "completed")?.count ?? 0;
    const expired = statusCounts.find((r) => r.status === "expired")?.count ?? 0;
    const paused = statusCounts.find((r) => r.status === "paused")?.count ?? 0;

    // Overdue = active AND dueDate < today
    const [overdueRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(obligationsTable)
      .where(
        and(
          eq(obligationsTable.workspaceId, workspaceId),
          eq(obligationsTable.status, "active"),
          sql`${obligationsTable.dueDate} < ${today}`,
        ),
      );
    const overdue = overdueRow?.count ?? 0;

    // Due soon = active, dueDate between today and 30 days
    const [dueSoonRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(obligationsTable)
      .where(
        and(
          eq(obligationsTable.workspaceId, workspaceId),
          eq(obligationsTable.status, "active"),
          gte(obligationsTable.dueDate, today),
          lte(obligationsTable.dueDate, in30Days),
        ),
      );
    const dueSoon = dueSoonRow?.count ?? 0;

    // Reminders sent (not pending) in last 30 days
    const [remindersRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveryHistoryTable)
      .innerJoin(obligationsTable, eq(deliveryHistoryTable.obligationId, obligationsTable.id))
      .where(and(eq(obligationsTable.workspaceId, workspaceId), eq(deliveryHistoryTable.status, "sent"), gte(deliveryHistoryTable.sentAt, thirtyDaysAgo)));
    const remindersSentLast30Days = remindersRow?.count ?? 0;

    // By category
    const categoryCounts = await db
      .select({
        category: obligationsTable.category,
        count: sql<number>`count(*)::int`,
      })
      .from(obligationsTable)
      .where(eq(obligationsTable.workspaceId, workspaceId))
      .groupBy(obligationsTable.category);

    const byCategory = categoryCounts.map((r) => ({
      category: r.category,
      count: r.count,
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

// ── GET /api/dashboard/upcoming ──────────────────────────────────────────────

router.get("/upcoming", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const workspaceIdParam = req.query.workspaceId as string | undefined;
    if (!workspaceIdParam) {
      res.status(400).json({ error: "workspaceId is required" });
      return;
    }

    const workspaceId = parseInt(workspaceIdParam, 10);
    if (!Number.isInteger(workspaceId)) { res.status(400).json({ error: "Invalid workspaceId" }); return; }
    await assertWorkspaceMember(workspaceId, userId);

    const days = Math.min(parseInt((req.query.days as string) || "30"), 90);
    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const obligations = await db
      .select()
      .from(obligationsTable)
      .where(
        and(
          eq(obligationsTable.workspaceId, workspaceId),
          eq(obligationsTable.status, "active"),
          gte(obligationsTable.dueDate, today),
          lte(obligationsTable.dueDate, futureDate),
        ),
      )
      .limit(50);

    res.json(obligations);
  } catch (err) {
    req.log.error({ err }, "getUpcoming error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/dashboard/risk ───────────────────────────────────────────────────
// Returns a structured risk overview for the risk cockpit

router.get("/risk", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const workspaceIdParam = req.query.workspaceId as string | undefined;
    if (!workspaceIdParam) {
      res.status(400).json({ error: "workspaceId is required" });
      return;
    }

    const workspaceId = parseInt(workspaceIdParam, 10);
    if (!Number.isInteger(workspaceId)) { res.status(400).json({ error: "Invalid workspaceId" }); return; }
    await assertWorkspaceMember(workspaceId, userId);

    const today = new Date().toISOString().split("T")[0];
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Total active
    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(obligationsTable)
      .where(
        and(
          eq(obligationsTable.workspaceId, workspaceId),
          eq(obligationsTable.status, "active"),
        ),
      );
    const totalActive = totalRow?.count ?? 0;

    // Overdue (active, past due)
    const overdueItems = await db
      .select()
      .from(obligationsTable)
      .where(
        and(
          eq(obligationsTable.workspaceId, workspaceId),
          eq(obligationsTable.status, "active"),
          sql`${obligationsTable.dueDate} < ${today}`,
        ),
      )
      .limit(20);

    // Critical: due in 7 days
    const criticalItems = await db
      .select()
      .from(obligationsTable)
      .where(
        and(
          eq(obligationsTable.workspaceId, workspaceId),
          eq(obligationsTable.status, "active"),
          gte(obligationsTable.dueDate, today),
          lte(obligationsTable.dueDate, in7Days),
        ),
      )
      .limit(20);

    // Missing owner
    const [missingOwnerRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(obligationsTable)
      .where(
        and(
          eq(obligationsTable.workspaceId, workspaceId),
          eq(obligationsTable.status, "active"),
          isNull(obligationsTable.ownerEmail),
        ),
      );
    const missingOwnerCount = missingOwnerRow?.count ?? 0;

    // Missing backup owner
    const [missingBackupRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(obligationsTable)
      .where(
        and(
          eq(obligationsTable.workspaceId, workspaceId),
          eq(obligationsTable.status, "active"),
          isNull(obligationsTable.backupOwnerEmail),
        ),
      );
    const missingBackupCount = missingBackupRow?.count ?? 0;

    // No active reminder rules
    const noReminderItems = await db
      .select()
      .from(obligationsTable)
      .where(
        and(
          eq(obligationsTable.workspaceId, workspaceId),
          eq(obligationsTable.status, "active"),
          notExists(
            db
              .select({ id: reminderRulesTable.id })
              .from(reminderRulesTable)
              .where(
                and(
                  eq(reminderRulesTable.obligationId, obligationsTable.id),
                  eq(reminderRulesTable.isActive, true),
                ),
              ),
          ),
        ),
      )
      .limit(20);

    // Risk score (0 = safe, 100 = maximum exposure)
    const overdueWeight = overdueItems.length * 4;
    const criticalWeight = criticalItems.length * 2;
    const noOwnerWeight = missingOwnerCount * 2;
    const noBackupWeight = missingBackupCount * 1;
    const noReminderWeight = noReminderItems.length * 1;
    const maxPossibleWeight = Math.max(totalActive * (4 + 2 + 2 + 1 + 1), 1);
    const rawScore = overdueWeight + criticalWeight + noOwnerWeight + noBackupWeight + noReminderWeight;
    const riskScore = Math.min(100, Math.round((rawScore / maxPossibleWeight) * 100));

    res.json({
      riskScore,
      totalActive,
      overdueCount: overdueItems.length,
      criticalCount: criticalItems.length,
      missingOwnerCount,
      missingBackupCount,
      noReminderCount: noReminderItems.length,
      overdueItems,
      criticalItems,
      noReminderItems: noReminderItems.slice(0, 5),
    });
  } catch (err) {
    req.log.error({ err }, "getDashboardRisk error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
