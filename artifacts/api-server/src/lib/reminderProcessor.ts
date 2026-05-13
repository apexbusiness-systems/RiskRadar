import { db } from "@workspace/db";
import {
  obligationsTable,
  reminderRulesTable,
  deliveryHistoryTable,
  auditLogsTable,
  workspaceMembersTable,
} from "@workspace/db";
import { eq, and, gte, lt } from "drizzle-orm";
import { logger } from "./logger";

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;

  if (!smtpHost) {
    logger.info({ to, subject }, "SMTP not configured — email not sent");
    return false; // accurately report as not-sent
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@renewalradar.app",
      to,
      subject,
      text: body,
    });
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
    return false;
  }
}

export async function processReminders(): Promise<void> {
  const runId = `reminder-${Date.now()}`;
  logger.info({ runId }, "Running reminder processor");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  try {
    // ── 1. Mark overdue active obligations as expired ────────────────────────
    const activeObligations = await db
      .select()
      .from(obligationsTable)
      .where(eq(obligationsTable.status, "active"));

    for (const obligation of activeObligations) {
      if (obligation.dueDate < todayStr) {
        await db
          .update(obligationsTable)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(obligationsTable.id, obligation.id));

        await db.insert(auditLogsTable).values({
          workspaceId: obligation.workspaceId,
          obligationId: obligation.id,
          obligationTitle: obligation.title,
          actorClerkId: null,
          actorName: "System",
          action: "obligation.expired",
          details: { dueDate: obligation.dueDate },
        });

        logger.info(
          { obligationId: obligation.id, title: obligation.title },
          "Marked obligation as expired",
        );
      }
    }

    // ── 2. Process reminder rules (with deduplication) ───────────────────────
    const rules = await db
      .select({
        rule: reminderRulesTable,
        obligation: obligationsTable,
      })
      .from(reminderRulesTable)
      .innerJoin(obligationsTable, eq(reminderRulesTable.obligationId, obligationsTable.id))
      .where(
        and(
          eq(reminderRulesTable.isActive, true),
          eq(obligationsTable.status, "active"),
        ),
      );

    for (const { rule, obligation } of rules) {
      // Deduplication: skip if this rule already fired today
      if (rule.lastTriggeredAt) {
        const lastFiredDate = new Date(rule.lastTriggeredAt).toISOString().split("T")[0];
        if (lastFiredDate === todayStr) {
          logger.info(
            { ruleId: rule.id, obligationId: obligation.id },
            "Rule already fired today — skipping",
          );
          continue;
        }
      }

      // Calculate when this reminder should fire
      const dueDate = new Date(obligation.dueDate + "T12:00:00Z");
      const reminderDate = new Date(dueDate);
      reminderDate.setUTCDate(reminderDate.getUTCDate() - rule.daysBefore);
      const reminderDateStr = reminderDate.toISOString().split("T")[0];

      if (reminderDateStr !== todayStr) continue;

      // Determine recipients
      const recipients: string[] = [];

      if (rule.recipientType === "owner" && obligation.ownerEmail) {
        recipients.push(obligation.ownerEmail);
      } else if (rule.recipientType === "backup_owner" && obligation.backupOwnerEmail) {
        recipients.push(obligation.backupOwnerEmail);
        if (obligation.ownerEmail && !obligation.completedAt) {
          recipients.push(obligation.ownerEmail);
        }
      } else if (rule.recipientType === "all_members") {
        const members = await db
          .select({ email: workspaceMembersTable.email })
          .from(workspaceMembersTable)
          .where(eq(workspaceMembersTable.workspaceId, obligation.workspaceId));
        recipients.push(...members.map((m) => m.email).filter(Boolean));
      } else if (rule.recipientType === "custom_email" && rule.customEmail) {
        recipients.push(rule.customEmail);
      }

      if (recipients.length === 0) {
        logger.warn(
          { ruleId: rule.id, obligationId: obligation.id },
          "No recipients for reminder rule",
        );
        continue;
      }

      const daysUntilDue = Math.ceil(
        (new Date(obligation.dueDate + "T12:00:00Z").getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const subject = `Reminder: "${obligation.title}" is due in ${rule.daysBefore} day(s)`;
      const body = `Hello,

This is a reminder that the following obligation is coming up:

Title:        ${obligation.title}
Category:     ${obligation.category}
Due Date:     ${obligation.dueDate}
Days Until Due: ${daysUntilDue}
${obligation.ownerEmail ? `Owner:        ${obligation.ownerEmail}` : ""}
${obligation.notes ? `\nNotes: ${obligation.notes}` : ""}

Please log in to RiskRadar to take action.

— RiskRadar`.trim();

      const uniqueRecipients = [...new Set(recipients)].filter(Boolean);

      for (const email of uniqueRecipients) {
        // Application-level idempotency guard: one delivery record per rule/obligation/recipient/day.
        const dayStart = new Date(`${todayStr}T00:00:00.000Z`);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const [existingDelivery] = await db
          .select({ id: deliveryHistoryTable.id })
          .from(deliveryHistoryTable)
          .where(
            and(
              eq(deliveryHistoryTable.obligationId, obligation.id),
              eq(deliveryHistoryTable.ruleId, rule.id),
              eq(deliveryHistoryTable.recipientEmail, email),
              gte(deliveryHistoryTable.sentAt, dayStart),
              lt(deliveryHistoryTable.sentAt, dayEnd),
            ),
          )
          .limit(1);
        if (existingDelivery) {
          logger.info(
            { runId, ruleId: rule.id, obligationId: obligation.id },
            "Skipping duplicate reminder delivery for recipient/day",
          );
          continue;
        }

        const smtpConfigured = !!process.env.SMTP_HOST;
        const success = smtpConfigured ? await sendEmail(email, subject, body) : false;

        const deliveryStatus = smtpConfigured
          ? success
            ? "sent"
            : "failed"
          : "pending";

        const errorMsg = smtpConfigured
          ? success
            ? null
            : "Email send failed"
          : "SMTP not configured — delivery pending";

        await db.insert(deliveryHistoryTable).values({
          obligationId: obligation.id,
          ruleId: rule.id,
          channel: rule.channel,
          recipientEmail: email,
          status: deliveryStatus as "sent" | "failed" | "pending",
          errorMessage: errorMsg,
        });

        logger.info(
          { runId, obligationId: obligation.id, status: deliveryStatus },
          "Reminder delivery recorded",
        );
      }

      // Update lastTriggeredAt to now to prevent duplicate fires today
      await db
        .update(reminderRulesTable)
        .set({ lastTriggeredAt: new Date() })
        .where(eq(reminderRulesTable.id, rule.id));
    }

    logger.info({ runId }, "Reminder processor complete");
  } catch (err) {
    logger.error({ err, runId }, "Reminder processor error");
  }
}

// Start hourly interval — returns a cleanup function for graceful shutdown
export function startReminderScheduler(): () => void {
  logger.info("Starting hourly reminder scheduler");

  const startupTimer = setTimeout(() => processReminders(), 5000);
  const interval = setInterval(() => processReminders(), 60 * 60 * 1000);

  return () => {
    clearTimeout(startupTimer);
    clearInterval(interval);
    logger.info("Reminder scheduler stopped");
  };
}
