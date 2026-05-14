import type { NormalizedSignal } from "./types";
import { groqExtractJson } from "../../ai/groq";

interface EnrichedFields {
  title: string;
  notes: string;
}

export async function enrichSignal(
  signal: NormalizedSignal,
): Promise<NormalizedSignal> {
  const result = await groqExtractJson<EnrichedFields>(
    [
      {
        role: "system",
        content:
          "You are a compliance signal enricher. Given a raw compliance event, return a concise human-readable title (max 80 chars) and a one-sentence notes summary (max 200 chars). Return null fields if uncertain.",
      },
      {
        role: "user",
        content: JSON.stringify({
          eventType: signal.eventType,
          externalObjectId: signal.externalObjectId,
          severity: signal.severity,
        }),
      },
    ],
    {
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          notes: { type: "string" },
        },
        required: ["title", "notes"],
        additionalProperties: false,
      },
      schemaName: "compliance_signal_enrichment",
    },
  );

  if (result !== null && typeof result.title === "string" && result.title.length > 0) {
    return { ...signal, title: result.title, notes: result.notes ?? signal.notes };
  }

  return signal;
}

export function transformPayload(
  raw: Record<string, unknown>,
  sourceApp: string,
  tenantKey: string,
): NormalizedSignal {
  const eventType =
    str(raw.event_type ?? raw.eventType ?? raw.type) ?? "unknown";
  const externalObjectId =
    str(raw.object_id ?? raw.external_id ?? raw.objectId) ?? null;
  const occurredAt =
    str(raw.occurred_at ?? raw.occurredAt ?? raw.timestamp ?? raw.created_at) ??
    new Date().toISOString();
  const signalKind = str(raw.signal_kind ?? raw.signalKind ?? raw.kind) ?? eventType;

  const severityRaw = str(raw.severity ?? raw.risk_level ?? raw.level);
  const severity = normalizeSeverity(severityRaw);

  // review_required takes precedence; fall back to severity threshold
  let reviewRequired: boolean;
  if (raw.review_required !== undefined || raw.reviewRequired !== undefined) {
    reviewRequired = Boolean(raw.review_required ?? raw.reviewRequired);
  } else {
    reviewRequired = severity === "high" || severity === "critical";
  }

  const reviewCode =
    str(raw.review_code ?? raw.reviewCode ?? raw.compliance_code ?? raw.code) ??
    null;
  const summary =
    str(raw.summary ?? raw.description ?? raw.message) ??
    `${sourceApp}: ${eventType}`;
  const evidence = (
    raw.evidence ?? raw.details ?? raw.metadata ?? {}
  ) as Record<string, unknown>;

  return {
    sourceApp,
    tenantKey,
    eventType,
    externalObjectId,
    occurredAt,
    signalKind,
    severity,
    reviewRequired,
    reviewCode,
    summary,
    evidence,
    rawPayload: raw,
  };
}

function str(val: unknown): string | null {
  if (typeof val === "string" && val.length > 0) return val;
  if (typeof val === "number") return String(val);
  return null;
}

function normalizeSeverity(val: string | null): NormalizedSignal["severity"] {
  switch (val?.toLowerCase()) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    default:
      return "info";
  }
}
