import { db } from "@workspace/db";
import {
  workspacesTable,
  workspaceMembersTable,
  obligationsTable,
  reminderRulesTable,
  deliveryHistoryTable,
  auditLogsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";

export async function seedDemoData(clerkUserId: string, email: string, name?: string): Promise<{ workspaceId: number }> {
  logger.info({ clerkUserId }, "Seeding demo data");
  const normalizedEmail = email.toLowerCase().trim();
  const demoDataMode = process.env.DEMO_DATA_MODE !== "false";
  const demoOwnerEmail = "owner@northstar-demo.example.com";
  const seedOwnerEmail = demoDataMode ? demoOwnerEmail : normalizedEmail;

  // Check if user already has a workspace
  const existing = await db
    .select()
    .from(workspaceMembersTable)
    .where(eq(workspaceMembersTable.clerkUserId, clerkUserId))
    .limit(1);

  if (existing.length > 0) {
    const [workspace] = await db
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, existing[0].workspaceId))
      .limit(1);
    return { workspaceId: workspace.id };
  }

  // Accept any pending invite rows mapped by email.
  const [pendingInvite] = await db
    .select()
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.email, normalizedEmail),
        eq(workspaceMembersTable.clerkUserId, `pending:${normalizedEmail}`),
      ),
    )
    .limit(1);

  if (pendingInvite) {
    await db
      .update(workspaceMembersTable)
      .set({
        clerkUserId,
        name: name ? String(name).slice(0, 200) : pendingInvite.name,
      })
      .where(eq(workspaceMembersTable.id, pendingInvite.id));

    await db.insert(auditLogsTable).values({
      workspaceId: pendingInvite.workspaceId,
      actorClerkId: clerkUserId,
      actorName: name || normalizedEmail,
      action: "member.invite.accepted",
      details: { role: pendingInvite.role },
    });

    logger.info(
      { workspaceId: pendingInvite.workspaceId, clerkUserId },
      "security.invite.accepted",
    );
    return { workspaceId: pendingInvite.workspaceId };
  }

  // Create demo workspace
  const [workspace] = await db
    .insert(workspacesTable)
    .values({ name: "Northstar Demo Operations", slug: `demo-${Date.now()}` })
    .returning();

  // Add user as owner
  await db.insert(workspaceMembersTable).values({
    workspaceId: workspace.id,
    clerkUserId,
    email: seedOwnerEmail,
    name: name || "Demo Owner",
    role: "owner",
  });

  // Create demo obligations
  const today = new Date();
  const addDays = (d: Date, days: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + days);
    return r.toISOString().split("T")[0];
  };
  const subDays = (d: Date, days: number) => addDays(d, -days);

  const obligations = [
    {
      workspaceId: workspace.id,
      title: "Business License Renewal",
      description: "Annual city business license renewal",
      category: "Licensing",
      status: "active" as const,
      dueDate: addDays(today, 15),
      renewalFrequency: "annually" as const,
      ownerEmail: seedOwnerEmail,
      notes: "Contact city hall for renewal form",
      tags: ["city", "annual"],
    },
    {
      workspaceId: workspace.id,
      title: "Cyber Liability Insurance",
      description: "Annual cyber insurance policy renewal",
      category: "Insurance",
      status: "active" as const,
      dueDate: addDays(today, 45),
      renewalFrequency: "annually" as const,
      ownerEmail: seedOwnerEmail,
      notes: "Get at least 3 quotes before renewing",
      tags: ["insurance", "annual"],
    },
    {
      workspaceId: workspace.id,
      title: "SaaS Vendor Contract - Northstar CRM",
      description: "Annual Northstar CRM contract renewal",
      category: "Contracts",
      status: "active" as const,
      dueDate: addDays(today, 8),
      renewalFrequency: "annually" as const,
      ownerEmail: seedOwnerEmail,
      notes: "Negotiate pricing before renewal",
      tags: ["saas", "crm"],
    },
    {
      workspaceId: workspace.id,
      title: "Cloud Platform Credits Review",
      description: "Quarterly review of cloud spending and credits",
      category: "Software",
      status: "active" as const,
      dueDate: addDays(today, 22),
      renewalFrequency: "quarterly" as const,
      ownerEmail: seedOwnerEmail,
      tags: ["cloud", "quarterly"],
    },
    {
      workspaceId: workspace.id,
      title: "Employee Handbook Review",
      description: "Annual review and update of employee handbook",
      category: "HR & Compliance",
      status: "active" as const,
      dueDate: subDays(today, 5),
      renewalFrequency: "annually" as const,
      ownerEmail: seedOwnerEmail,
      notes: "Include any new labor law changes",
      tags: ["hr", "compliance"],
    },
    {
      workspaceId: workspace.id,
      title: "Domain Name Renewal - northstar-demo.example.com",
      description: "Annual domain registration renewal",
      category: "Software",
      status: "active" as const,
      dueDate: addDays(today, 60),
      renewalFrequency: "annually" as const,
      ownerEmail: seedOwnerEmail,
      tags: ["domain", "annual"],
    },
    {
      workspaceId: workspace.id,
      title: "Professional Liability Insurance",
      description: "E&O insurance annual renewal",
      category: "Insurance",
      status: "completed" as const,
      dueDate: subDays(today, 30),
      renewalFrequency: "annually" as const,
      ownerEmail: seedOwnerEmail,
      tags: ["insurance", "annual"],
    },
    {
      workspaceId: workspace.id,
      title: "Office Lease Agreement",
      description: "5-year lease with annual rent review",
      category: "Real Estate",
      status: "active" as const,
      dueDate: addDays(today, 90),
      renewalFrequency: "annually" as const,
      ownerEmail: seedOwnerEmail,
      notes: "Review market rates before negotiation",
      tags: ["lease", "real-estate"],
    },
    {
      workspaceId: workspace.id,
      title: "GDPR Data Processing Audit",
      description: "Quarterly data processing compliance audit",
      category: "HR & Compliance",
      status: "active" as const,
      dueDate: addDays(today, 3),
      renewalFrequency: "quarterly" as const,
      ownerEmail: seedOwnerEmail,
      tags: ["gdpr", "compliance", "quarterly"],
    },
    {
      workspaceId: workspace.id,
      title: "Food Handler Permits",
      description: "Staff food handler certification renewal",
      category: "Licensing",
      status: "expired" as const,
      dueDate: subDays(today, 10),
      ownerEmail: seedOwnerEmail,
      tags: ["permits", "staff"],
    },
  ];

  const insertedObligations = await db
    .insert(obligationsTable)
    .values(obligations)
    .returning();

  // Add reminder rules to first few obligations
  for (const obligation of insertedObligations.slice(0, 5)) {
    await db.insert(reminderRulesTable).values([
      {
        obligationId: obligation.id,
        daysBefore: 30,
        channel: "email",
        recipientType: "owner",
        isActive: true,
      },
      {
        obligationId: obligation.id,
        daysBefore: 7,
        channel: "email",
        recipientType: "owner",
        isActive: true,
      },
    ]);
  }

  // Add some delivery history
  const historyEntries = insertedObligations.slice(0, 3).map((o, i) => ({
    obligationId: o.id,
    channel: "email",
    recipientEmail: email,
    status: "sent" as const,
    sentAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
  }));

  await db.insert(deliveryHistoryTable).values(historyEntries);

  // Add audit logs
  await db.insert(auditLogsTable).values(
    insertedObligations.map((o) => ({
      workspaceId: workspace.id,
      obligationId: o.id,
      obligationTitle: o.title,
      actorClerkId: clerkUserId,
      action: "obligation.created",
      details: { source: "seed" },
    })),
  );

  logger.info({ workspaceId: workspace.id }, "Demo data seeded");
  return { workspaceId: workspace.id };
}
