import { Router } from "express";
import { db } from "@workspace/db";
import { reminderRulesTable, auditLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { AuthzError, HttpError, loadObligationForUser, parsePositiveInt } from "../lib/authz";
import type { Request, Response } from "express";

const router = Router({ mergeParams: true });

function param(req: Request, key: string): string { const v = req.params[key]; return Array.isArray(v) ? v[0] : v; }

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const obligationId = parsePositiveInt(param(req, "obligationId"), "obligationId");
    await loadObligationForUser(obligationId, (req as AuthenticatedRequest).userId);
    const rules = await db.select().from(reminderRulesTable).where(eq(reminderRulesTable.obligationId, obligationId));
    res.json(rules);
    return;
  } catch (err) {
    if (err instanceof AuthzError || err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
    req.log.error({ err }, "listReminderRules error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const obligationId = parsePositiveInt(param(req, "obligationId"), "obligationId");
    const obligation = await loadObligationForUser(obligationId, userId);
    const { daysBefore, channel, recipientType, customEmail, isActive } = req.body;
    if (daysBefore === undefined || !channel || !recipientType) return void res.status(400).json({ error: "daysBefore, channel, recipientType are required" });

    const [rule] = await db.insert(reminderRulesTable).values({ obligationId, daysBefore, channel, recipientType, customEmail: customEmail || null, isActive: isActive !== false }).returning();
    await db.insert(auditLogsTable).values({ workspaceId: obligation.workspaceId, obligationId, obligationTitle: obligation.title, actorClerkId: userId, action: "reminder_rule.created", details: { daysBefore, channel } });
    res.status(201).json(rule);
    return;
  } catch (err) {
    if (err instanceof AuthzError || err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
    req.log.error({ err }, "createReminderRule error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:ruleId", requireAuth, async (req: Request, res: Response) => {
  try {
    const ruleId = parsePositiveInt(param(req, "ruleId"), "ruleId");
    const obligationId = parsePositiveInt(param(req, "obligationId"), "obligationId");
    await loadObligationForUser(obligationId, (req as AuthenticatedRequest).userId);
    const { daysBefore, channel, recipientType, customEmail, isActive } = req.body;

    const [rule] = await db.update(reminderRulesTable).set({ daysBefore, channel, recipientType, customEmail: customEmail || null, isActive: isActive !== false }).where(and(eq(reminderRulesTable.id, ruleId), eq(reminderRulesTable.obligationId, obligationId))).returning();
    if (!rule) return void res.status(404).json({ error: "Not found" });
    res.json(rule);
    return;
  } catch (err) {
    if (err instanceof AuthzError || err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
    req.log.error({ err }, "updateReminderRule error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:ruleId", requireAuth, async (req: Request, res: Response) => {
  try {
    const ruleId = parsePositiveInt(param(req, "ruleId"), "ruleId");
    const obligationId = parsePositiveInt(param(req, "obligationId"), "obligationId");
    await loadObligationForUser(obligationId, (req as AuthenticatedRequest).userId);
    await db.delete(reminderRulesTable).where(and(eq(reminderRulesTable.id, ruleId), eq(reminderRulesTable.obligationId, obligationId)));
    res.status(204).send();
    return;
  } catch (err) {
    if (err instanceof AuthzError || err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
    req.log.error({ err }, "deleteReminderRule error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
