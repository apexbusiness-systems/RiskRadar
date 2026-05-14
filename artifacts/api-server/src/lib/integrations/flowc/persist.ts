import { db } from "@workspace/db";
import {
  integrationReceiptsTable,
  obligationsTable,
  auditLogsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import type { NormalizedSignal, DecisionResult } from "./types";
import type { IntegrationReceipt } from "@workspace/db";

export interface PersistInput {
  sourceApp: string;
  tenantKey: string;
  idempotencyKey: string;
  requestHash: string;
  signatureTimestamp: Date;
  signal: NormalizedSignal;
  decision: DecisionResult;
  workspaceId: number | null;
}

export interface PersistResult {
  receipt: IntegrationReceipt;
  obligationId: number | null;
}

export async function persistReceipt(
  input: PersistInput,
): Promise<PersistResult> {
  const {
    sourceApp,
    tenantKey,
    idempotencyKey,
    requestHash,
    signatureTimestamp,
    signal,
    decision,
    workspaceId,
  } = input;

  return db.transaction(async (tx) => {
    let obligationId: number | null = null;

    if (
      decision.code === "FLAGGED_CREATE" &&
      workspaceId !== null
    ) {
      const title = buildTitle(signal);
      const notes = buildNotes(signal);
      const dueDate = computeDueDate(signal);

      const [newObligation] = await tx
        .insert(obligationsTable)
        .values({
          workspaceId,
          title,
          category: signal.signalKind,
          notes,
          dueDate,
          tags: [`flowc:${sourceApp}`, `severity:${signal.severity}`],
        })
        .returning({ id: obligationsTable.id });

      obligationId = newObligation.id;

      await tx.insert(auditLogsTable).values({
        workspaceId,
        obligationId,
        obligationTitle: title,
        actorClerkId: null,
        actorName: `integration:${sourceApp}`,
        action: "obligation.created",
        details: {
          source: "flowc",
          sourceApp,
          tenantKey,
          externalObjectId: signal.externalObjectId,
          severity: signal.severity,
          reviewCode: signal.reviewCode,
          idempotencyKey,
        },
      });
    } else if (
      decision.code === "FLAGGED_UPDATE" &&
      decision.details?.existingObligationId
    ) {
      obligationId = decision.details.existingObligationId as number;

      const [existing] = await tx
        .select({
          title: obligationsTable.title,
          workspaceId: obligationsTable.workspaceId,
        })
        .from(obligationsTable)
        .where(eq(obligationsTable.id, obligationId))
        .limit(1);

      if (existing) {
        await tx
          .update(obligationsTable)
          .set({ updatedAt: new Date() })
          .where(eq(obligationsTable.id, obligationId));

        await tx.insert(auditLogsTable).values({
          workspaceId: existing.workspaceId,
          obligationId,
          obligationTitle: existing.title,
          actorClerkId: null,
          actorName: `integration:${sourceApp}`,
          action: "obligation.updated",
          details: {
            source: "flowc",
            sourceApp,
            tenantKey,
            externalObjectId: signal.externalObjectId,
            severity: signal.severity,
            reviewCode: signal.reviewCode,
            idempotencyKey,
          },
        });
      }
    }

    const [receipt] = await tx
      .insert(integrationReceiptsTable)
      .values({
        sourceApp,
        tenantKey,
        eventType: signal.eventType,
        externalObjectId: signal.externalObjectId,
        idempotencyKey,
        requestHash,
        signatureTimestamp,
        normalizedPayload: signal as unknown as Record<string, unknown>,
        decision: decision.code,
        decisionCode: decision.code,
        decisionDetails: decision.details,
        obligationId,
      })
      .returning();

    return { receipt, obligationId };
  });
}

function buildTitle(signal: NormalizedSignal): string {
  const parts = [`Review required: ${signal.eventType}`];
  if (signal.reviewCode) parts.push(`[${signal.reviewCode}]`);
  parts.push(`— ${signal.sourceApp}`);
  return parts.join(" ");
}

function buildNotes(signal: NormalizedSignal): string {
  return [
    `Source: ${signal.sourceApp}`,
    signal.externalObjectId
      ? `External object: ${signal.externalObjectId}`
      : null,
    `Summary: ${signal.summary}`,
    `Severity: ${signal.severity}`,
    `Occurred: ${signal.occurredAt}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function computeDueDate(signal: NormalizedSignal): string {
  const base = signal.occurredAt ? new Date(signal.occurredAt) : new Date();
  const ref = Number.isNaN(base.getTime()) ? new Date() : base;
  const due = new Date(ref.getTime() + 30 * 24 * 60 * 60 * 1000);
  return due.toISOString().split("T")[0];
}
