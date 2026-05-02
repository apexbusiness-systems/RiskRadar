import { Router } from "express";
import { db } from "@workspace/db";
import {
  obligationsTable,
  auditLogsTable,
  workspaceMembersTable,
} from "@workspace/db";
import { eq, and, gte, lte, like, or, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request, Response } from "express";

const router = Router();

function buildFilters(params: Record<string, string | undefined>) {
  const filters = [];
  if (params.workspaceId) {
    filters.push(eq(obligationsTable.workspaceId, parseInt(params.workspaceId)));
  }
  if (params.status && ["active","expired","completed","paused"].includes(params.status)) {
    filters.push(eq(obligationsTable.status, params.status as "active" | "expired" | "completed" | "paused"));
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
      ),
    );
  }
  return filters;
}

// GET /api/obligations
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const filters = buildFilters(req.query as Record<string, string | undefined>);
    const obligations = filters.length
      ? await db.select().from(obligationsTable).where(and(...filters))
      : await db.select().from(obligationsTable);
    res.json(obligations);
  } catch (err) {
    req.log.error({ err }, "listObligations error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/obligations
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const body = req.body;
    if (!body.workspaceId || !body.title || !body.category || !body.dueDate) {
      res.status(400).json({ error: "workspaceId, title, category, dueDate are required" });
      return;
    }

    const [obligation] = await db
      .insert(obligationsTable)
      .values({
        workspaceId: body.workspaceId,
        title: body.title,
        description: body.description || null,
        category: body.category,
        dueDate: body.dueDate,
        renewalFrequency: body.renewalFrequency || null,
        customFrequencyDays: body.customFrequencyDays || null,
        ownerClerkId: body.ownerClerkId || null,
        ownerEmail: body.ownerEmail || null,
        backupOwnerClerkId: body.backupOwnerClerkId || null,
        backupOwnerEmail: body.backupOwnerEmail || null,
        notes: body.notes || null,
        tags: body.tags || [],
        status: "active",
      })
      .returning();

    await db.insert(auditLogsTable).values({
      workspaceId: body.workspaceId,
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

// GET /api/obligations/export/csv
router.get("/export/csv", requireAuth, async (req: Request, res: Response) => {
  try {
    const filters = buildFilters(req.query as Record<string, string | undefined>);
    const obligations = filters.length
      ? await db.select().from(obligationsTable).where(and(...filters))
      : await db.select().from(obligationsTable);

    const headers = [
      "id","title","description","category","status","dueDate",
      "renewalFrequency","ownerEmail","backupOwnerEmail","notes","tags","createdAt",
    ];

    const rows = obligations.map((o) =>
      [
        o.id,
        `"${(o.title || "").replace(/"/g, '""')}"`,
        `"${(o.description || "").replace(/"/g, '""')}"`,
        o.category,
        o.status,
        o.dueDate,
        o.renewalFrequency || "",
        o.ownerEmail || "",
        o.backupOwnerEmail || "",
        `"${(o.notes || "").replace(/"/g, '""')}"`,
        `"${(o.tags || []).join(";")}"`,
        o.createdAt.toISOString(),
      ].join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=obligations.csv");
    res.send(csv);
  } catch (err) {
    req.log.error({ err }, "exportCsv error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/obligations/import/csv/preview
router.post("/import/csv/preview", requireAuth, async (req: Request, res: Response) => {
  try {
    const { csvContent, columnMapping } = req.body;
    if (!csvContent) {
      res.status(400).json({ error: "csvContent is required" });
      return;
    }

    const lines = csvContent.trim().split("\n");
    const headers = lines[0].split(",").map((h: string) => h.trim().replace(/^"|"$/g, ""));
    const dataRows = lines.slice(1).filter((l: string) => l.trim());

    const rows = dataRows.slice(0, 10).map((line: string) => {
      const values = line.split(",").map((v: string) => v.trim().replace(/^"|"$/g, ""));
      return headers.reduce(
        (acc: Record<string, string>, h: string, i: number) => {
          acc[h] = values[i] || "";
          return acc;
        },
        {},
      );
    });

    const errors: string[] = [];
    let validRows = 0;
    for (const row of rows) {
      const mapped = applyMapping(row, columnMapping || {});
      if (mapped.title && mapped.dueDate && mapped.category) {
        validRows++;
      } else {
        errors.push(`Row missing required fields (title, dueDate, category)`);
      }
    }

    res.json({ headers, rows, totalRows: dataRows.length, validRows, errors });
  } catch (err) {
    req.log.error({ err }, "csvPreview error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/obligations/import/csv
router.post("/import/csv", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { csvContent, columnMapping, workspaceId } = req.body;
    if (!csvContent || !workspaceId) {
      res.status(400).json({ error: "csvContent and workspaceId are required" });
      return;
    }

    const lines = csvContent.trim().split("\n");
    const headers = lines[0].split(",").map((h: string) => h.trim().replace(/^"|"$/g, ""));
    const dataRows = lines.slice(1).filter((l: string) => l.trim());

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const line of dataRows) {
      const values = line.split(",").map((v: string) => v.trim().replace(/^"|"$/g, ""));
      const row = headers.reduce(
        (acc: Record<string, string>, h: string, i: number) => {
          acc[h] = values[i] || "";
          return acc;
        },
        {},
      );

      const mapped = applyMapping(row, columnMapping || {});

      if (!mapped.title || !mapped.dueDate || !mapped.category) {
        errors.push(`Skipped row: missing required fields`);
        skipped++;
        continue;
      }

      try {
        const [obligation] = await db
          .insert(obligationsTable)
          .values({
            workspaceId: parseInt(workspaceId),
            title: mapped.title,
            description: mapped.description || null,
            category: mapped.category,
            dueDate: mapped.dueDate,
            ownerEmail: mapped.ownerEmail || null,
            notes: mapped.notes || null,
            tags: [],
            status: "active",
          })
          .returning();

        await db.insert(auditLogsTable).values({
          workspaceId: parseInt(workspaceId),
          obligationId: obligation.id,
          obligationTitle: obligation.title,
          actorClerkId: userId,
          action: "obligation.imported",
          details: { source: "csv" },
        });

        imported++;
      } catch {
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

// GET /api/obligations/:obligationId
router.get("/:obligationId", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.obligationId);
    const [obligation] = await db
      .select()
      .from(obligationsTable)
      .where(eq(obligationsTable.id, id))
      .limit(1);

    if (!obligation) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(obligation);
  } catch (err) {
    req.log.error({ err }, "getObligation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/obligations/:obligationId
router.put("/:obligationId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const id = parseInt(req.params.obligationId);
    const body = req.body;

    const [obligation] = await db
      .update(obligationsTable)
      .set({
        title: body.title,
        description: body.description ?? null,
        category: body.category,
        dueDate: body.dueDate,
        renewalFrequency: body.renewalFrequency ?? null,
        customFrequencyDays: body.customFrequencyDays ?? null,
        ownerClerkId: body.ownerClerkId ?? null,
        ownerEmail: body.ownerEmail ?? null,
        backupOwnerClerkId: body.backupOwnerClerkId ?? null,
        backupOwnerEmail: body.backupOwnerEmail ?? null,
        notes: body.notes ?? null,
        tags: body.tags || [],
        updatedAt: new Date(),
      })
      .where(eq(obligationsTable.id, id))
      .returning();

    if (!obligation) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.insert(auditLogsTable).values({
      workspaceId: obligation.workspaceId,
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

// DELETE /api/obligations/:obligationId
router.delete("/:obligationId", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const id = parseInt(req.params.obligationId);

    const [obligation] = await db
      .select()
      .from(obligationsTable)
      .where(eq(obligationsTable.id, id))
      .limit(1);

    if (!obligation) {
      res.status(404).json({ error: "Not found" });
      return;
    }

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

// POST /api/obligations/:obligationId/complete
router.post("/:obligationId/complete", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const id = parseInt(req.params.obligationId);
    const { notes } = req.body || {};

    const [obligation] = await db
      .update(obligationsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        notes: notes || undefined,
        updatedAt: new Date(),
      })
      .where(eq(obligationsTable.id, id))
      .returning();

    if (!obligation) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.insert(auditLogsTable).values({
      workspaceId: obligation.workspaceId,
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
