import { db } from "@workspace/db";
import {
  integrationReceiptsTable,
  obligationsTable,
} from "@workspace/db";
import { and, eq, isNotNull, inArray } from "drizzle-orm";
import type { NormalizedSignal, DecisionResult } from "./types";

// AI is forbidden in this decision engine.
// All logic is deterministic, based solely on normalized signal fields.
export async function decide(signal: NormalizedSignal): Promise<DecisionResult> {
  if (!signal.reviewRequired) {
    return { code: "ACCEPTED_SILENT", details: null };
  }

  // Review is required — check whether an open obligation already exists
  // tied to a prior flagged receipt for the same source + external object.
  if (signal.externalObjectId) {
    const existingFlagged = await db
      .select({ obligationId: integrationReceiptsTable.obligationId })
      .from(integrationReceiptsTable)
      .where(
        and(
          eq(integrationReceiptsTable.sourceApp, signal.sourceApp),
          eq(
            integrationReceiptsTable.externalObjectId,
            signal.externalObjectId,
          ),
          inArray(integrationReceiptsTable.decision, [
            "FLAGGED_CREATE",
            "FLAGGED_UPDATE",
          ]),
          isNotNull(integrationReceiptsTable.obligationId),
        ),
      )
      .limit(1);

    if (existingFlagged.length > 0) {
      const obligationId = existingFlagged[0].obligationId!;
      const [openObligation] = await db
        .select({ id: obligationsTable.id })
        .from(obligationsTable)
        .where(
          and(
            eq(obligationsTable.id, obligationId),
            eq(obligationsTable.status, "active"),
          ),
        )
        .limit(1);

      if (openObligation) {
        return {
          code: "FLAGGED_UPDATE",
          details: { existingObligationId: openObligation.id },
        };
      }
    }
  }

  return { code: "FLAGGED_CREATE", details: null };
}
