import { Router } from "express";
import { db } from "@workspace/db";
import {
  obligationsTable,
  auditLogsTable,
  workspaceMembersTable,
  reminderRulesTable,
} from "@workspace/db";
import { eq, and, gte, lte, like, or, isNull, notInArray } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router = Router();

function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : v;
}

// ── RFC 4180–compliant CSV parser ────────────────────────────────────────────

function parseCSVField(line: string, startIdx: number): { value: string; nextIdx: number } {
  let value = "";
  let i = startIdx;

  if (line[i] === '"') {
    i++; // skip opening quote
    while (i < line.length) {
      if (line[i] === '"') {
        if (line[i + 1] === '"') {
          value += '"';
          i += 2;
        } else {
          i++; // skip closing quote
          break;
        }
      } else {
        value += line[i++];
      }
    }
  } else {
    while (i < line.length && line[i] !== ",") {
      value += line[i++];
    }
  }

  return { value: value.trim(), nextIdx: i };
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i <= line.length) {
    const { value, nextIdx } = parseCSVField(line, i);
    fields.push(value);
    i = nextIdx;
    if (line[i] === ",") i++;
    else break;
  }

  return fields;
}

function parseCSV(content: string): { headers: string[]; dataRows: string[][] } {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length === 0) return { headers: [], dataRows: [] };

  const headers = parseCSVLine(lines[0]);
  const dataRows = lines.slice(1).map((l) => parseCSVLine(l));

  return { headers, dataRows };
}

function applyMapping(
  row: Record<string, string>,
  mapping: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = { ...row };
  for (const [target, source] of Object.entries(mapping)) {
    if (source && row[source] !== undefined) {
      result[target] = row[source];
    }
  }
  return result;
}

// ── Membership helpers ───────────────────────────────────────────────────────

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

async function getObligationAndCheckAccess(
  obligationId: number,
  userId: string,
  res: Response,
): Promise<typeof obligationsTable.$inferSelect | null> {
  const [obligation] = await db
    .select()
    .from(obligationsTable)
    .where(eq(obligationsTable.id, obligationId))
    .limit(1);

  if (!obligation) {
    res.status(404).json({ error: "Not found" });
    return null;
  }

  const member = await isMember(obligation.workspaceId, userId);
  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return obligation;
}

// ── Filter builder ────────────────────────────────────────────────────────────

function buildFilters(params: Record<string, string | undefined>, workspaceId: number) {
  const filters = [eq(obligationsTable.workspaceId, workspaceId)];

  if (params.status && ["active", "expired", "completed", "paused"].includes(params.status)) {
    filters.push(
      eq(
        obligationsTable.status,
        params.status as "active" | "expired" | "completed" | "paused",
      ),
    );
  }
  if (params.category) {
    filters.push(eq(obligationsTable.category, params.category));
  }
  if (params.ownerId) {
    filters.push(eq(obligationsTable.ownerClerkId, params.ownerId));
  }
  if (params.dueBefore) {
    filters.push(lte(obligationsTable.dueDate, params.dueBefore));
  }
  if (params.dueAfter) {
    filters.push(gte(obligationsTable.dueDate, params.dueAfter));
  }
  if (params.search) {
    const term = `%${params.search}%`;
    filters.push(
      or(
        like(obligationsTable.title, term),
        like(obligationsTable.description, term),
        like(obligationsTable.category, term),
      )!,
    );
  }

  return filters;
}

// ── GET /api/obligations ──────────────────────────────────────────────────────

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;

  const workspaceIdParam = req.query.workspaceId as string | undefined;
  if (!workspaceIdParam) {
    res.status(400).json({ error: "workspaceId query param is required" });
    return;
  }

  const workspaceId = parseInt(workspaceIdParam);
  if (isNaN(workspaceId)) {
    res.status(400).json({ error: "Invalid workspaceId" });
    return;
  }

  const member = await isMember(workspaceId, userId);
  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "200"), 500);
    const offset = parseInt((req.query.offset as string) || "0");
    const filters = buildFilters(req.query as Record<string, string | undefined>, workspaceId);

    const obligations = await db
      .select()
      .from(obligationsTable)
      .where(and(...filters))
      .limit(limit)
      .offset(offset);

    res.json(obligations);
  } catch (err) {
    req.log.error({ err }, "listObligations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/obligations ─────────────────────────────────────────────────────

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const body = req.body;

    if (!body.workspaceId || !body.title || !body.category || !body.dueDate) {
      res.status(400).json({ error: "workspaceId, title, category, dueDate are required" });
      return;
    }

    const workspaceId = parseInt(String(body.workspaceId));
    const member = await isMember(workspaceId, userId);
    if (!member) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [obligation] = await db
      .insert(obligationsTable)
      .values({
        workspaceId,
        title: String(body.title).slice(0, 500),
        description: body.description ? String(body.description).slice(0, 2000) : null,
        category: String(body.category).slice(0, 100),
        dueDate: String(body.dueDate),
        renewalFrequency: body.renewalFrequency || null,
        customFrequencyDays: body.customFrequencyDays ? parseInt(body.customFrequencyDays) : null,
        ownerClerkId: body.ownerClerkId || null,
        ownerName: body.ownerName || null,
        ownerEmail: body.ownerEmail || null,
        backupOwnerClerkId: body.backupOwnerClerkId || null,
        backupOwnerName: body.backupOwnerName || null,
        backupOwnerEmail: body.backupOwnerEmail || null,
        notes: body.notes ? String(body.notes).slice(0, 5000) : null,
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map(String) : [],
        status: "active",
      })
      .returning();

    await db.insert(auditLogsTable).values({
      workspaceId,
      obligationId: obligation.id,
      obligationTitle: obligation.title,
      actorClerkId: userId,
      action: "obligation.created",
      details: { title: obligation.title },
    });

    res.status(201).json(obligation);
  } catch (err) {
    req.log.error({ err }, "createObligation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/obligations/export/csv ───────────────────────────────────────────

router.get("/export/csv", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;

  const workspaceIdParam = req.query.workspaceId as string | undefined;
  if (!workspaceIdParam) {
    res.status(400).json({ error: "workspaceId query param is required" });
    return;
  }

  const workspaceId = parseInt(workspaceIdParam);
  const member = await isMember(workspaceId, userId);
  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const filters = buildFilters(req.query as Record<string, string | undefined>, workspaceId);
    const obligations = await db
      .select()
      .from(obligationsTable)
      .where(and(...filters));

    const headers = [
      "id",
      "title",
      "description",
      "category",
      "status",
      "dueDate",
      "renewalFrequency",
      "ownerEmail",
      "backupOwnerEmail",
      "notes",
      "tags",
      "createdAt",
    ];

    function csvCell(value: string | null | undefined): string {
      const s = String(value ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }

    const rows = obligations.map((o) =>
      [
        o.id,
        csvCell(o.title),
        csvCell(o.description),
        csvCell(o.category),
        o.status,
        o.dueDate,
        o.renewalFrequency || "",
        csvCell(o.ownerEmail),
        csvCell(o.backupOwnerEmail),
        csvCell(o.notes),
        csvCell((o.tags || []).join(";")),
        o.createdAt.toISOString(),
      ].join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="obligations.csv"');
    res.send(csv);
  } catch (err) {
    req.log.error({ err }, "exportCsv error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/obligations/import/csv/preview ──────────────────────────────────

router.post("/import/csv/preview", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const { csvContent, columnMapping, workspaceId: wsIdRaw } = req.body;
    if (!csvContent) {
      res.status(400).json({ error: "csvContent is required" });
      return;
    }

    if (wsIdRaw) {
      const member = await isMember(parseInt(String(wsIdRaw)), userId);
      if (!member) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    const { headers, dataRows } = parseCSV(csvContent);
    const previewRows = dataRows.slice(0, 10);

    const errors: string[] = [];
    let validRows = 0;

    const rowObjects = previewRows.map((values) => {
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });

    for (const row of rowObjects) {
      const mapped = applyMapping(row, columnMapping || {});
      if (mapped.title && mapped.dueDate && mapped.category) {
        validRows++;
      } else {
        const missing = ["title", "dueDate", "category"].filter((f) => !mapped[f]).join(", ");
        errors.push(`Row missing: ${missing}`);
      }
    }

    res.json({
      headers,
      rows: rowObjects,
      totalRows: dataRows.length,
      validRows,
      errors,
    });
  } catch (err) {
    req.log.error({ err }, "csvPreview error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/obligations/import/csv ─────────────────────────────────────────

router.post("/import/csv", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const { csvContent, columnMapping, workspaceId: wsIdRaw } = req.body;

    if (!csvContent || !wsIdRaw) {
      res.status(400).json({ error: "csvContent and workspaceId are required" });
      return;
    }

    const workspaceId = parseInt(String(wsIdRaw));
    const member = await isMember(workspaceId, userId);
    if (!member) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { headers, dataRows } = parseCSV(csvContent);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const values of dataRows) {
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });

      const mapped = applyMapping(row, columnMapping || {});

      if (!mapped.title || !mapped.dueDate || !mapped.category) {
        const missing = ["title", "dueDate", "category"].filter((f) => !mapped[f]).join(", ");
        errors.push(`Skipped row: missing ${missing}`);
        skipped++;
        continue;
      }

      // Basic date validation
      if (!/^\d{4}-\d{2}-\d{2}$/.test(mapped.dueDate)) {
        errors.push(`Skipped "${mapped.title}": invalid date format (expected YYYY-MM-DD)`);
        skipped++;
        continue;
      }

      try {
        const [obligation] = await db
          .insert(obligationsTable)
          .values({
            workspaceId,
            title: mapped.title.slice(0, 500),
            description: mapped.description ? mapped.description.slice(0, 2000) : null,
            category: mapped.category.slice(0, 100),
            dueDate: mapped.dueDate,
            ownerEmail: mapped.ownerEmail || null,
            backupOwnerEmail: mapped.backupOwnerEmail || null,
            notes: mapped.notes ? mapped.notes.slice(0, 5000) : null,
            renewalFrequency: (mapped.renewalFrequency as "once" | "monthly" | "quarterly" | "annually" | "custom" | null) || null,
            tags: [],
            status: "active",
          })
          .returning();

        await db.insert(auditLogsTable).values({
          workspaceId,
          obligationId: obligation.id,
          obligationTitle: obligation.title,
          actorClerkId: userId,
          action: "obligation.imported",
          details: { source: "csv" },
        });

        imported++;
      } catch (rowErr) {
        errors.push(`Failed to import: ${mapped.title}`);
        skipped++;
      }
    }

    res.json({ imported, skipped, errors });
  } catch (err) {
    req.log.error({ err }, "csvImport error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/obligations/:obligationId ────────────────────────────────────────

router.get("/:obligationId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(param(req, "obligationId"));

  try {
    const obligation = await getObligationAndCheckAccess(id, userId, res);
    if (!obligation) return;
    res.json(obligation);
  } catch (err) {
    req.log.error({ err }, "getObligation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/obligations/:obligationId ────────────────────────────────────────

router.put("/:obligationId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(param(req, "obligationId"));

  try {
    const existing = await getObligationAndCheckAccess(id, userId, res);
    if (!existing) return;

    const body = req.body;
    const [obligation] = await db
      .update(obligationsTable)
      .set({
        title: body.title ? String(body.title).slice(0, 500) : existing.title,
        description: body.description !== undefined ? String(body.description || "").slice(0, 2000) || null : existing.description,
        category: body.category ? String(body.category).slice(0, 100) : existing.category,
        dueDate: body.dueDate || existing.dueDate,
        renewalFrequency: body.renewalFrequency ?? existing.renewalFrequency,
        customFrequencyDays: body.customFrequencyDays ?? existing.customFrequencyDays,
        ownerClerkId: body.ownerClerkId ?? existing.ownerClerkId,
        ownerName: body.ownerName ?? existing.ownerName,
        ownerEmail: body.ownerEmail !== undefined ? (body.ownerEmail || null) : existing.ownerEmail,
        backupOwnerClerkId: body.backupOwnerClerkId ?? existing.backupOwnerClerkId,
        backupOwnerName: body.backupOwnerName ?? existing.backupOwnerName,
        backupOwnerEmail: body.backupOwnerEmail !== undefined ? (body.backupOwnerEmail || null) : existing.backupOwnerEmail,
        notes: body.notes !== undefined ? String(body.notes || "").slice(0, 5000) || null : existing.notes,
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map(String) : existing.tags,
        status: body.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(obligationsTable.id, id))
      .returning();

    await db.insert(auditLogsTable).values({
      workspaceId: existing.workspaceId,
      obligationId: obligation.id,
      obligationTitle: obligation.title,
      actorClerkId: userId,
      action: "obligation.updated",
      details: { changes: Object.keys(body) },
    });

    res.json(obligation);
  } catch (err) {
    req.log.error({ err }, "updateObligation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/obligations/:obligationId ─────────────────────────────────────

router.delete("/:obligationId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(param(req, "obligationId"));

  try {
    const obligation = await getObligationAndCheckAccess(id, userId, res);
    if (!obligation) return;

    await db.delete(obligationsTable).where(eq(obligationsTable.id, id));

    await db.insert(auditLogsTable).values({
      workspaceId: obligation.workspaceId,
      obligationId: null,
      obligationTitle: obligation.title,
      actorClerkId: userId,
      action: "obligation.deleted",
      details: { title: obligation.title },
    });

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteObligation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/obligations/:obligationId/complete ──────────────────────────────

router.post("/:obligationId/complete", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(param(req, "obligationId"));

  try {
    const existing = await getObligationAndCheckAccess(id, userId, res);
    if (!existing) return;

    const { notes } = req.body || {};
    const [obligation] = await db
      .update(obligationsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        notes: notes ? String(notes).slice(0, 5000) : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(obligationsTable.id, id))
      .returning();

    await db.insert(auditLogsTable).values({
      workspaceId: existing.workspaceId,
      obligationId: obligation.id,
      obligationTitle: obligation.title,
      actorClerkId: userId,
      action: "obligation.completed",
      details: { notes },
    });

    res.json(obligation);
  } catch (err) {
    req.log.error({ err }, "completeObligation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
