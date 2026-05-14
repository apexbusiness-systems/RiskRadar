// Optional Groq AI advisory layer — disabled by default.
//
// Enable with:
//   ENABLE_GROQ_AI=true
//   GROQ_API_KEY=<your key>
//
// This module is NOT wired into any mandatory write-path. All existing
// behaviour is unchanged when Groq is disabled or misconfigured.
//
// Suggested use cases (read-only, advisory):
//   - Summarising external compliance evidence
//   - Drafting human-readable explanations for flagged signals
//   - Suggesting reminder policies for new obligations
//   - Explaining CSV import rows in plain language

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqJsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface GroqOptions {
  model?: string;
  maxTokens?: number;
  schema: GroqJsonSchema;
  schemaName: string;
}

function isEnabled(): boolean {
  return (
    process.env.ENABLE_GROQ_AI === "true" && !!process.env.GROQ_API_KEY
  );
}

/**
 * Extract structured JSON from a Groq completion using strict JSON schema mode.
 * Returns null when Groq is disabled, misconfigured, or the call fails.
 * Never throws.
 */
export async function groqExtractJson<T>(
  messages: GroqMessage[],
  opts: GroqOptions,
): Promise<T | null> {
  if (!isEnabled()) return null;

  const apiKey = process.env.GROQ_API_KEY!;

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model ?? DEFAULT_MODEL,
        messages,
        max_tokens: opts.maxTokens ?? 512,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: opts.schemaName,
            strict: true,
            schema: opts.schema,
          },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
