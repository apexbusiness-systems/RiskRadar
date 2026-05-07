import { Router } from "express";
import { db } from "@workspace/db";
import { reminderRulesTable, auditLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";
import { HttpError, loadObligationForUser, parsePositiveInt } from "../lib/authz";

const router = Router({ mergeParams: true });

function param(req: Request, key: string): string { const v = req.params[key]; return Array.isArray(v) ? v[0] : v; }

router.get("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const obligationId = parsePositiveInt(param(req, "obligationId"), "obligationId");
    const obligation = await loadObligationForUser(obligationId, userId);
    if (!obligation) throw new HttpError(404, "Not found");
    const rules = await db.select().from(reminderRulesTable).where(eq(reminderRulesTable.obligationId, obligationId));
    res.json(rules);
    return;
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "listReminderRules error"); res.status(500).json({ error: "Internal server error" });
    return;
  }
});

router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const obligationId = parsePositiveInt(param(req, "obligationId"), "obligationId");
    const obligation = await loadObligationForUser(obligationId, userId);
    if (!obligation) throw new HttpError(404, "Not found");
    const { daysBefore, channel, recipientType, customEmail, isActive } = req.body;
    if (daysBefore === undefined || !channel || !recipientType) throw new HttpError(400, "daysBefore, channel, recipientType are required");
    const [rule] = await db.insert(reminderRulesTable).values({ obligationId, daysBefore, channel, recipientType, customEmail: customEmail || null, isActive: isActive !== false }).returning();
    await db.insert(auditLogsTable).values({ workspaceId: obligation.workspaceId, obligationId, obligationTitle: obligation.title, actorClerkId: userId, action: "reminder_rule.created", details: { daysBefore, channel } });
    res.status(201).json(rule);
    return;
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "createReminderRule error"); res.status(500).json({ error: "Internal server error" });
    return;
  }
});

router.put("/:ruleId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const ruleId = parsePositiveInt(param(req, "ruleId"), "ruleId");
    const obligationId = parsePositiveInt(param(req, "obligationId"), "obligationId");
    const obligation = await loadObligationForUser(obligationId, userId);
    if (!obligation) throw new HttpError(404, "Not found");
    const [rule] = await db.update(reminderRulesTable).set(req.body).where(and(eq(reminderRulesTable.id, ruleId), eq(reminderRulesTable.obligationId, obligationId))).returning();
    if (!rule) throw new HttpError(404, "Not found");
    res.json(rule);
    return;
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "updateReminderRule error"); res.status(500).json({ error: "Internal server error" });
    return;
  }
});

router.delete("/:ruleId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const ruleId = parsePositiveInt(param(req, "ruleId"), "ruleId");
    const obligationId = parsePositiveInt(param(req, "obligationId"), "obligationId");
    const obligation = await loadObligationForUser(obligationId, userId);
    if (!obligation) throw new HttpError(404, "Not found");
    await db.delete(reminderRulesTable).where(and(eq(reminderRulesTable.id, ruleId), eq(reminderRulesTable.obligationId, obligationId)));
    res.status(204).send();
    return;
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "deleteReminderRule error"); res.status(500).json({ error: "Internal server error" });
    return;
  }
});

export default router;
