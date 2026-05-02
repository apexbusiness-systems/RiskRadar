import { Router } from "express";
import { db } from "@workspace/db";
import { reminderRulesTable, auditLogsTable, obligationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router = Router({ mergeParams: true });

// GET /api/obligations/:obligationId/reminder-rules
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const obligationId = parseInt(req.params.obligationId);
    const rules = await db
      .select()
      .from(reminderRulesTable)
      .where(eq(reminderRulesTable.obligationId, obligationId));
    res.json(rules);
  } catch (err) {
    req.log.error({ err }, "listReminderRules error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/obligations/:obligationId/reminder-rules
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const obligationId = parseInt(req.params.obligationId);
    const { daysBefore, channel, recipientType, customEmail, isActive } = req.body;

    if (daysBefore === undefined || !channel || !recipientType) {
      res.status(400).json({ error: "daysBefore, channel, recipientType are required" });
      return;
    }

    const [rule] = await db
      .insert(reminderRulesTable)
      .values({
        obligationId,
        daysBefore,
        channel,
        recipientType,
        customEmail: customEmail || null,
        isActive: isActive !== false,
      })
      .returning();

    const [obligation] = await db
      .select({ workspaceId: obligationsTable.workspaceId, title: obligationsTable.title })
      .from(obligationsTable)
      .where(eq(obligationsTable.id, obligationId))
      .limit(1);

    if (obligation) {
      await db.insert(auditLogsTable).values({
        workspaceId: obligation.workspaceId,
        obligationId,
        obligationTitle: obligation.title,
        actorClerkId: userId,
        action: "reminder_rule.created",
        details: { daysBefore, channel },
      });
    }

    res.status(201).json(rule);
  } catch (err) {
    req.log.error({ err }, "createReminderRule error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/obligations/:obligationId/reminder-rules/:ruleId
router.put("/:ruleId", requireAuth, async (req: Request, res: Response) => {
  try {
    const ruleId = parseInt(req.params.ruleId);
    const obligationId = parseInt(req.params.obligationId);
    const { daysBefore, channel, recipientType, customEmail, isActive } = req.body;

    const [rule] = await db
      .update(reminderRulesTable)
      .set({
        daysBefore,
        channel,
        recipientType,
        customEmail: customEmail || null,
        isActive: isActive !== false,
      })
      .where(
        and(
          eq(reminderRulesTable.id, ruleId),
          eq(reminderRulesTable.obligationId, obligationId),
        ),
      )
      .returning();

    if (!rule) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(rule);
  } catch (err) {
    req.log.error({ err }, "updateReminderRule error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/obligations/:obligationId/reminder-rules/:ruleId
router.delete("/:ruleId", requireAuth, async (req: Request, res: Response) => {
  try {
    const ruleId = parseInt(req.params.ruleId);
    const obligationId = parseInt(req.params.obligationId);

    await db
      .delete(reminderRulesTable)
      .where(
        and(
          eq(reminderRulesTable.id, ruleId),
          eq(reminderRulesTable.obligationId, obligationId),
        ),
      );

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteReminderRule error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
