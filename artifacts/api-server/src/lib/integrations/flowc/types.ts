export interface NormalizedSignal {
  sourceApp: string;
  tenantKey: string;
  eventType: string;
  externalObjectId: string | null;
  occurredAt: string;
  signalKind: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  reviewRequired: boolean;
  reviewCode: string | null;
  summary: string;
  evidence: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
  title?: string;
  notes?: string;
}

export type DecisionCode =
  | "ACCEPTED_SILENT"
  | "FLAGGED_CREATE"
  | "FLAGGED_UPDATE"
  | "REJECTED_SCHEMA"
  | "REJECTED_HASH_MISMATCH";

export interface DecisionResult {
  code: DecisionCode;
  details: Record<string, unknown> | null;
}

export interface SilentAck {
  received: true;
  receiptId: number;
  idempotencyKey: string;
  processedAt: string;
}
