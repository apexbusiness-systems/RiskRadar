import { db } from "@workspace/db";
import {
  obligationsTable,
  reminderRulesTable,
  deliveryHistoryTable,
  auditLogsTable,
  workspaceMembersTable,
} from "@workspace/db";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { logger } from "./logger";

// Send a reminder email (stub — wire SMTP_* env vars to send real emails)
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;

  if (!smtpHost) {
    logger.info({ to, subject }, "SMTP not configured — skipping email send");
    return true; // pretend success in dev
  }

  try {
    // Dynamic import to avoid failing at startup when nodemailer isn't installed
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
  logger.info("Running reminder processor");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  try {
    // 1. Mark overdue active obligations as expired
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
          action: "obligation.expired",
          details: { dueDate: obligation.dueDate },
        });

        logger.info(
          { obligationId: obligation.id, title: obligation.title },
          "Marked obligation as expired",
        );
      }
    }

    // 2. Process reminder rules
    const rules = await db
      .select({
        rule: reminderRulesTable,
        obligation: obligationsTable,
      })
      .from(reminderRulesTable)
      .innerJoin(
        obligationsTable,
        eq(reminderRulesTable.obligationId, obligationsTable.id),
      )
      .where(
        and(
          eq(reminderRulesTable.isActive, true),
          eq(obligationsTable.status, "active"),
        ),
      );

    for (const { rule, obligation } of rules) {
      // Calculate when this reminder should fire
      const dueDate = new Date(obligation.dueDate);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - rule.daysBefore);
      const reminderDateStr = reminderDate.toISOString().split("T")[0];

      if (reminderDateStr !== todayStr) continue;

      // Determine recipients
      const recipients: string[] = [];

      if (rule.recipientType === "owner" && obligation.ownerEmail) {
        recipients.push(obligation.ownerEmail);
      } else if (
        rule.recipientType === "backup_owner" &&
        obligation.backupOwnerEmail
      ) {
        recipients.push(obligation.backupOwnerEmail);

        // Escalate to backup owner if primary owner didn't complete
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

      const subject = `Reminder: "${obligation.title}" is due in ${rule.daysBefore} day(s)`;
      const body = `
Hello,

This is a reminder that the following obligation is coming up:

Title: ${obligation.title}
Category: ${obligation.category}
Due Date: ${obligation.dueDate}
Days Until Due: ${rule.daysBefore}

${obligation.notes ? `Notes: ${obligation.notes}` : ""}

Please log in to Renewal Radar to take action.

— Renewal Radar
`.trim();

      for (const email of [...new Set(recipients)]) {
        if (!email) continue;
        const success = await sendEmail(email, subject, body);

        await db.insert(deliveryHistoryTable).values({
          obligationId: obligation.id,
          ruleId: rule.id,
          channel: rule.channel,
          recipientEmail: email,
          status: success ? "sent" : "failed",
          errorMessage: success ? null : "Email send failed",
        });

        logger.info(
          {
            obligationId: obligation.id,
            email,
            status: success ? "sent" : "failed",
          },
          "Reminder delivery recorded",
        );
      }

      // Update lastTriggeredAt
      await db
        .update(reminderRulesTable)
        .set({ lastTriggeredAt: new Date() })
        .where(eq(reminderRulesTable.id, rule.id));
    }

    logger.info("Reminder processor complete");
  } catch (err) {
    logger.error({ err }, "Reminder processor error");
  }
}

// Start hourly interval
export function startReminderScheduler(): void {
  logger.info("Starting hourly reminder scheduler");

  // Run once on startup (after 5 seconds to let DB settle)
  setTimeout(() => processReminders(), 5000);

  // Then every hour
  setInterval(() => processReminders(), 60 * 60 * 1000);
}
