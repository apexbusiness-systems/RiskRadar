import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { integrationReceiptsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { verifySignature } from "../lib/integrations/flowc/verify";
import { sha256Hex } from "../lib/integrations/flowc/hash";
import { transformPayload, enrichSignal } from "../lib/integrations/flowc/transform";
import { decide } from "../lib/integrations/flowc/decide";
import { persistReceipt } from "../lib/integrations/flowc/persist";
import {
  getCallbackConfig,
  buildCallbackPayload,
  attemptCallback,
} from "../lib/integrations/flowc/callback";
import { enqueueOutboxRow } from "../lib/integrations/flowc/outbox";

// Raw body is captured by app middleware for /api/internal/flowc routes.
type RawBodyRequest = Request & { rawBody?: Buffer };

const router = Router();

router.post("/signals", async (req: RawBodyRequest, res: Response): Promise<void> => {
  const sourceApp = req.headers["x-source-app"] as string | undefined;
  const tenantKey = req.headers["x-tenant-key"] as string | undefined;
  const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;
  const timestamp = req.headers["x-flowc-timestamp"] as string | undefined;
  const signature = req.headers["x-flowc-signature"] as string | undefined;

  if (!sourceApp || !tenantKey || !idempotencyKey || !timestamp || !signature) {
    res.status(400).json({ error: "Missing required headers" });
    return;
  }

  const rawBody = req.rawBody;
  if (!rawBody || rawBody.length === 0) {
    res.status(400).json({ error: "Empty request body" });
    return;
  }

  const secret = process.env.FLOWC_WEBHOOK_SECRET ?? "";
  if (!secret) {
    logger.warn("FLOWC_WEBHOOK_SECRET not configured");
    res.status(503).json({ error: "Integration not configured" });
    return;
  }

  const verifyResult = verifySignature({ rawBody, timestamp, signature, secret });
  if (!verifyResult.ok) {
    res
      .status(401)
      .json({ error: "Invalid signature", reason: verifyResult.reason });
    return;
  }

  let rawPayload: Record<string, unknown>;
  try {
    rawPayload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const requestHash = sha256Hex(rawBody);

  // Idempotency: check for prior receipt with this key
  const [existingReceipt] = await db
    .select({
      id: integrationReceiptsTable.id,
      requestHash: integrationReceiptsTable.requestHash,
      processedAt: integrationReceiptsTable.processedAt,
    })
    .from(integrationReceiptsTable)
    .where(
      and(
        eq(integrationReceiptsTable.sourceApp, sourceApp),
        eq(integrationReceiptsTable.tenantKey, tenantKey),
        eq(integrationReceiptsTable.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  if (existingReceipt) {
    if (existingReceipt.requestHash === requestHash) {
      // Identical replay — return cached ack
      res.status(200).json({
        received: true,
        receiptId: existingReceipt.id,
        idempotencyKey,
        processedAt: existingReceipt.processedAt.toISOString(),
      });
      return;
    }
    // Same key, different body — deterministic conflict
    res.status(409).json({
      error: "Idempotency key reused with different payload",
      idempotencyKey,
    });
    return;
  }

  const normalized = transformPayload(rawPayload, sourceApp, tenantKey);
  const enriched = await enrichSignal(normalized);

  const decision = await decide(enriched);

  // Resolve target workspace from env var; fall back to slug lookup if configured.
  const workspaceId = resolveWorkspaceId(tenantKey);

  const { receipt, obligationId } = await persistReceipt({
    sourceApp,
    tenantKey,
    idempotencyKey,
    requestHash,
    signatureTimestamp: new Date(parseInt(timestamp, 10) * 1000),
    signal: enriched,
    decision,
    workspaceId,
  });

  const processedAt = receipt.processedAt.toISOString();

  // Enqueue outbox row and attempt best-effort immediate delivery for flagged signals.
  if (
    (decision.code === "FLAGGED_CREATE" || decision.code === "FLAGGED_UPDATE") &&
    getCallbackConfig()
  ) {
    const callbackConfig = getCallbackConfig()!;
    const callbackPayload = buildCallbackPayload({
      receiptId: receipt.id,
      idempotencyKey,
      decision: decision.code,
      signal: enriched,
      obligationId,
      processedAt,
    });
    const payloadHash = sha256Hex(
      Buffer.from(JSON.stringify(callbackPayload)),
    );

    await enqueueOutboxRow({
      receiptId: receipt.id,
      targetKind: "callback",
      targetUrl: callbackConfig.url,
      payload: callbackPayload as unknown as Record<string, unknown>,
      payloadHash,
    });

    // Best-effort fire — failure leaves the row for outbox retry.
    attemptCallback(callbackConfig, callbackPayload).catch(() => undefined);
  }

  logger.info(
    { receiptId: receipt.id, decision: decision.code, sourceApp },
    "flowc.signal.processed",
  );

  res.status(200).json({
    received: true,
    receiptId: receipt.id,
    idempotencyKey,
    processedAt,
  });
});

function resolveWorkspaceId(tenantKey: string): number | null {
  const envId = process.env.FLOWC_WORKSPACE_ID;
  if (envId) {
    const parsed = parseInt(envId, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  // If FLOWC_WORKSPACE_ID is not set, caller must configure it.
  // tenantKey is preserved in the receipt for future mapping.
  void tenantKey;
  return null;
}

export default router;
