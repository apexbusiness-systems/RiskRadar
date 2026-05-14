import { db } from "@workspace/db";
import { integrationOutboxTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../../logger";
import { getCallbackConfig, attemptCallback } from "./callback";
import type { CallbackPayload } from "./callback";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;

function backoffSeconds(attemptCount: number): number {
  // Exponential backoff: 30, 60, 120, 240, capped at 300 seconds
  return Math.min(30 * Math.pow(2, attemptCount), 300);
}

export async function processOutbox(): Promise<void> {
  const config = getCallbackConfig();
  if (!config) return;

  try {
    await db.transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.execute<{
        id: number;
        receipt_id: number;
        target_kind: string;
        target_url: string | null;
        event_name: string | null;
        payload: unknown;
        attempt_count: number;
      }>(sql`
        SELECT id, receipt_id, target_kind, target_url, event_name, payload, attempt_count
        FROM integration_outbox
        WHERE status = 'pending' AND next_attempt_at <= ${now}
        ORDER BY next_attempt_at ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      `);

      for (const row of claimed.rows) {
        const payload =
          typeof row.payload === "string"
            ? JSON.parse(row.payload)
            : (row.payload as CallbackPayload);

        let ok = false;
        let error: string | undefined;

        if (row.target_kind === "callback" && row.target_url) {
          const result = await attemptCallback(
            { url: row.target_url, secret: config.secret },
            payload as CallbackPayload,
          );
          ok = result.ok;
          error = result.error;
        }

        const newAttemptCount = row.attempt_count + 1;

        if (ok) {
          await tx.execute(sql`
            UPDATE integration_outbox
            SET status = 'sent', sent_at = NOW(),
                attempt_count = ${newAttemptCount}, updated_at = NOW()
            WHERE id = ${row.id}
          `);
        } else if (newAttemptCount >= MAX_ATTEMPTS) {
          await tx.execute(sql`
            UPDATE integration_outbox
            SET status = 'dead_letter', attempt_count = ${newAttemptCount},
                last_error = ${error ?? "unknown"}, updated_at = NOW()
            WHERE id = ${row.id}
          `);
          logger.warn(
            { outboxId: row.id, error },
            "flowc.outbox.dead_letter",
          );
        } else {
          const nextSecs = backoffSeconds(newAttemptCount);
          await tx.execute(sql`
            UPDATE integration_outbox
            SET status = 'pending', attempt_count = ${newAttemptCount},
                last_error = ${error ?? "unknown"},
                next_attempt_at = NOW() + (${nextSecs} * INTERVAL '1 second'),
                updated_at = NOW()
            WHERE id = ${row.id}
          `);
        }
      }
    });
  } catch (err) {
    logger.error({ err }, "flowc.outbox.process_error");
  }
}

export async function enqueueOutboxRow(params: {
  receiptId: number;
  targetKind: "callback" | "event";
  targetUrl?: string;
  eventName?: string;
  payload: Record<string, unknown>;
  payloadHash: string;
}): Promise<void> {
  await db
    .insert(integrationOutboxTable)
    .values({
      receiptId: params.receiptId,
      targetKind: params.targetKind,
      targetUrl: params.targetUrl ?? null,
      eventName: params.eventName ?? null,
      payload: params.payload,
      payloadHash: params.payloadHash,
      status: "pending",
      attemptCount: 0,
    })
    .onConflictDoNothing();
}

export function startOutboxScheduler(): () => void {
  const config = getCallbackConfig();
  if (!config) {
    logger.info("FlowC outbox scheduler disabled — FLOWC_CALLBACK_URL not set");
    return () => {};
  }

  logger.info("Starting FlowC outbox retry scheduler (5-minute interval)");
  const interval = setInterval(() => {
    processOutbox().catch((err) =>
      logger.error({ err }, "flowc.outbox.scheduler_error"),
    );
  }, 5 * 60 * 1000);

  return () => {
    clearInterval(interval);
    logger.info("FlowC outbox scheduler stopped");
  };
}
