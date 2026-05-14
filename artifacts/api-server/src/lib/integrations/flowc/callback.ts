import { sha256Hex } from "./hash";
import type { NormalizedSignal } from "./types";

export interface CallbackConfig {
  url: string;
  secret: string;
}

export function getCallbackConfig(): CallbackConfig | null {
  const url = process.env.FLOWC_CALLBACK_URL;
  const secret = process.env.FLOWC_CALLBACK_SECRET;
  if (!url || !secret) return null;
  return { url, secret };
}

export interface CallbackPayload {
  event: "receipt.processed";
  receiptId: number;
  idempotencyKey: string;
  decision: string;
  sourceApp: string;
  tenantKey: string;
  obligationId: number | null;
  processedAt: string;
}

export function buildCallbackPayload(params: {
  receiptId: number;
  idempotencyKey: string;
  decision: string;
  signal: NormalizedSignal;
  obligationId: number | null;
  processedAt: string;
}): CallbackPayload {
  return {
    event: "receipt.processed",
    receiptId: params.receiptId,
    idempotencyKey: params.idempotencyKey,
    decision: params.decision,
    sourceApp: params.signal.sourceApp,
    tenantKey: params.signal.tenantKey,
    obligationId: params.obligationId,
    processedAt: params.processedAt,
  };
}

export async function attemptCallback(
  config: CallbackConfig,
  payload: CallbackPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const body = JSON.stringify(payload);
    const sig = sha256Hex(Buffer.from(body));
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-flowc-signature": `sha256=${sig}`,
        "x-flowc-source": "dueradar",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok
      ? { ok: true }
      : { ok: false, error: `HTTP ${res.status}` };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
