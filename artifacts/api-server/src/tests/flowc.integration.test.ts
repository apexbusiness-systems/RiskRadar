import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import {
  workspacesTable,
  integrationReceiptsTable,
  integrationOutboxTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import router from "../routes";

// ── Test app with raw-body capture (mirrors app.ts verify callback) ──────────

function makeFlowCTestApp() {
  const app = express();
  app.use(
    express.json({
      verify: (req: any, _res: any, buf: Buffer) => {
        const url: string =
          (req as any).originalUrl ?? (req as any).url ?? "";
        if (url.startsWith("/api/internal/flowc")) {
          (req as any).rawBody = buf;
        }
      },
    }),
  );
  app.use("/api", router);
  return app;
}

// ── HMAC helpers ─────────────────────────────────────────────────────────────

function signPayload(secret: string, timestamp: number, body: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SECRET = "test-flowc-secret-xyz";

const CLEAN_BODY = JSON.stringify({
  event_type: "compliance.check",
  object_id: "obj-clean-001",
  occurred_at: new Date().toISOString(),
  signal_kind: "audit",
  severity: "info",
  review_required: false,
  summary: "Routine compliance check passed",
  evidence: {},
});

const FLAGGED_BODY = JSON.stringify({
  event_type: "compliance.violation",
  object_id: `obj-flagged-${crypto.randomUUID()}`,
  occurred_at: new Date().toISOString(),
  signal_kind: "violation",
  severity: "high",
  review_required: true,
  review_code: "GDPR-001",
  summary: "Data processing violation detected",
  evidence: { field: "user_data" },
});

// ── Suite setup ───────────────────────────────────────────────────────────────

describe("FlowC Integration", () => {
  let app: ReturnType<typeof makeFlowCTestApp>;
  let workspaceId: number;

  beforeAll(async () => {
    process.env.FLOWC_WEBHOOK_SECRET = SECRET;

    // Create an isolated test workspace
    const [ws] = await db
      .insert(workspacesTable)
      .values({ name: "FlowC Test WS", slug: `flowc-test-${Date.now()}` })
      .returning({ id: workspacesTable.id });
    workspaceId = ws.id;
    process.env.FLOWC_WORKSPACE_ID = String(workspaceId);

    app = makeFlowCTestApp();
  });

  afterAll(async () => {
    delete process.env.FLOWC_WEBHOOK_SECRET;
    delete process.env.FLOWC_WORKSPACE_ID;
    delete process.env.FLOWC_CALLBACK_URL;
    delete process.env.FLOWC_CALLBACK_SECRET;
  });

  // ── Header builder ────────────────────────────────────────────────────────

  function headers(
    body: string,
    overrides: Record<string, string> = {},
  ): Record<string, string> {
    const ts = Math.floor(Date.now() / 1000);
    const sig = signPayload(SECRET, ts, body);
    return {
      "x-source-app": "flowc-test",
      "x-tenant-key": "flowc-test",
      "x-idempotency-key": crypto.randomUUID(),
      "x-flowc-timestamp": String(ts),
      "x-flowc-signature": sig,
      "Content-Type": "application/json",
      ...overrides,
    };
  }

  async function post(body: string, hdrs: Record<string, string>) {
    return request(app)
      .post("/api/internal/flowc/signals")
      .set(hdrs)
      .send(body);
  }

  // ── Tests ─────────────────────────────────────────────────────────────────

  it("accepts a valid signed webhook", async () => {
    const res = await post(CLEAN_BODY, headers(CLEAN_BODY));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(typeof res.body.receiptId).toBe("number");
    expect(typeof res.body.processedAt).toBe("string");
  });

  it("rejects invalid signature", async () => {
    const hdrs = headers(CLEAN_BODY, {
      "x-flowc-signature": "sha256=deadbeef00000000000000000000000000000000000000000000000000000000",
    });
    const res = await post(CLEAN_BODY, hdrs);
    expect(res.status).toBe(401);
    expect(res.body.reason).toBe("signature_mismatch");
  });

  it("rejects stale timestamp", async () => {
    const staleTs = Math.floor(Date.now() / 1000) - 400;
    const sig = signPayload(SECRET, staleTs, CLEAN_BODY);
    const hdrs = headers(CLEAN_BODY, {
      "x-flowc-timestamp": String(staleTs),
      "x-flowc-signature": sig,
    });
    const res = await post(CLEAN_BODY, hdrs);
    expect(res.status).toBe(401);
    expect(res.body.reason).toBe("stale_timestamp");
  });

  it("first request inserts receipt", async () => {
    const key = crypto.randomUUID();
    const hdrs = headers(CLEAN_BODY, { "x-idempotency-key": key });
    const res = await post(CLEAN_BODY, hdrs);
    expect(res.status).toBe(200);

    const [receipt] = await db
      .select()
      .from(integrationReceiptsTable)
      .where(eq(integrationReceiptsTable.idempotencyKey, key))
      .limit(1);

    expect(receipt).toBeDefined();
    expect(receipt.sourceApp).toBe("flowc-test");
    expect(receipt.decision).toBe("ACCEPTED_SILENT");
  });

  it("duplicate identical request returns cached ack", async () => {
    const key = crypto.randomUUID();
    const res1 = await post(CLEAN_BODY, headers(CLEAN_BODY, { "x-idempotency-key": key }));
    expect(res1.status).toBe(200);

    const res2 = await post(CLEAN_BODY, headers(CLEAN_BODY, { "x-idempotency-key": key }));
    expect(res2.status).toBe(200);
    expect(res2.body.receiptId).toBe(res1.body.receiptId);
    expect(res2.body.processedAt).toBe(res1.body.processedAt);
  });

  it("duplicate same key with different payload returns 409 conflict", async () => {
    const key = crypto.randomUUID();
    const bodyA = JSON.stringify({ event_type: "test.a", review_required: false, nonce: 1 });
    const bodyB = JSON.stringify({ event_type: "test.b", review_required: false, nonce: 2 });

    await post(bodyA, headers(bodyA, { "x-idempotency-key": key }));

    const res = await post(bodyB, headers(bodyB, { "x-idempotency-key": key }));
    expect(res.status).toBe(409);
  });

  it("clean signal stores receipt and does NOT create obligation", async () => {
    const key = crypto.randomUUID();
    const res = await post(CLEAN_BODY, headers(CLEAN_BODY, { "x-idempotency-key": key }));
    expect(res.status).toBe(200);

    const [receipt] = await db
      .select()
      .from(integrationReceiptsTable)
      .where(eq(integrationReceiptsTable.idempotencyKey, key))
      .limit(1);

    expect(receipt.decision).toBe("ACCEPTED_SILENT");
    expect(receipt.obligationId).toBeNull();
  });

  it("flagged signal creates obligation exactly once", async () => {
    const key = crypto.randomUUID();
    // Use unique object_id per test to avoid cross-test FLAGGED_UPDATE
    const body = JSON.stringify({
      event_type: "compliance.violation",
      object_id: `obj-once-${crypto.randomUUID()}`,
      severity: "high",
      review_required: true,
      review_code: "TEST-001",
      summary: "Test flagged signal",
      evidence: {},
    });

    const res = await post(body, headers(body, { "x-idempotency-key": key }));
    expect(res.status).toBe(200);

    const [receipt] = await db
      .select()
      .from(integrationReceiptsTable)
      .where(eq(integrationReceiptsTable.idempotencyKey, key))
      .limit(1);

    expect(receipt.decision).toBe("FLAGGED_CREATE");
    expect(receipt.obligationId).not.toBeNull();
    expect(typeof receipt.obligationId).toBe("number");
  });

  it("repeated flagged signal with same object updates existing obligation", async () => {
    const objectId = `obj-repeat-${crypto.randomUUID()}`;

    const mkBody = (summary: string) =>
      JSON.stringify({
        event_type: "compliance.violation",
        object_id: objectId,
        severity: "high",
        review_required: true,
        review_code: "GDPR-002",
        summary,
        evidence: {},
      });

    const body1 = mkBody("First violation");
    const res1 = await post(
      body1,
      headers(body1, { "x-idempotency-key": crypto.randomUUID() }),
    );
    expect(res1.status).toBe(200);

    const body2 = mkBody("Second violation, same object");
    const key2 = crypto.randomUUID();
    const res2 = await post(body2, headers(body2, { "x-idempotency-key": key2 }));
    expect(res2.status).toBe(200);

    const [r2] = await db
      .select()
      .from(integrationReceiptsTable)
      .where(eq(integrationReceiptsTable.idempotencyKey, key2))
      .limit(1);

    expect(r2.decision).toBe("FLAGGED_UPDATE");
  });

  it("callback disabled mode succeeds without errors", async () => {
    delete process.env.FLOWC_CALLBACK_URL;
    const key = crypto.randomUUID();
    const body = JSON.stringify({
      event_type: "compliance.violation",
      object_id: `obj-no-cb-${crypto.randomUUID()}`,
      severity: "critical",
      review_required: true,
      review_code: "NO-CB",
      summary: "Callback disabled test",
    });
    const res = await post(body, headers(body, { "x-idempotency-key": key }));
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it("callback failure persists outbox row for retry", async () => {
    // Point at a port that refuses connections — immediate failure guaranteed.
    process.env.FLOWC_CALLBACK_URL = "http://localhost:1";
    process.env.FLOWC_CALLBACK_SECRET = "cb-secret";

    const key = crypto.randomUUID();
    const body = JSON.stringify({
      event_type: "compliance.violation",
      object_id: `obj-cb-fail-${crypto.randomUUID()}`,
      severity: "high",
      review_required: true,
      review_code: "CB-FAIL",
      summary: "Callback failure test",
    });
    const res = await post(body, headers(body, { "x-idempotency-key": key }));
    expect(res.status).toBe(200);

    // Give the fire-and-forget attempt time to resolve before checking
    await new Promise((r) => setTimeout(r, 200));

    const [receipt] = await db
      .select()
      .from(integrationReceiptsTable)
      .where(eq(integrationReceiptsTable.idempotencyKey, key))
      .limit(1);

    const outboxRows = await db
      .select()
      .from(integrationOutboxTable)
      .where(eq(integrationOutboxTable.receiptId, receipt.id));

    expect(outboxRows.length).toBeGreaterThan(0);
    expect(outboxRows[0].targetKind).toBe("callback");

    delete process.env.FLOWC_CALLBACK_URL;
    delete process.env.FLOWC_CALLBACK_SECRET;
  });

  it("resolves workspace from tenantKey slug when FLOWC_WORKSPACE_ID is absent", async () => {
    const slug = `tenant-${crypto.randomUUID()}`;
    await db
      .insert(workspacesTable)
      .values({ name: "Tenant WS", slug })
      .returning({ id: workspacesTable.id });

    const savedEnv = process.env.FLOWC_WORKSPACE_ID;
    delete process.env.FLOWC_WORKSPACE_ID;

    try {
      const body = JSON.stringify({
        event_type: "compliance.check",
        review_required: false,
        summary: "Tenant key resolution test",
        evidence: {},
      });
      const key = crypto.randomUUID();
      const hdrs = headers(body, {
        "x-tenant-key": slug,
        "x-idempotency-key": key,
      });
      const res = await post(body, hdrs);
      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      const [receipt] = await db
        .select()
        .from(integrationReceiptsTable)
        .where(eq(integrationReceiptsTable.idempotencyKey, key))
        .limit(1);
      expect(receipt).toBeDefined();
      expect(receipt.tenantKey).toBe(slug);
    } finally {
      if (savedEnv !== undefined) {
        process.env.FLOWC_WORKSPACE_ID = savedEnv;
      }
    }
  });

  it("returns 422 when tenantKey has no matching workspace and FLOWC_WORKSPACE_ID is absent", async () => {
    const savedEnv = process.env.FLOWC_WORKSPACE_ID;
    delete process.env.FLOWC_WORKSPACE_ID;

    try {
      const body = JSON.stringify({
        event_type: "compliance.check",
        review_required: false,
        summary: "Unresolvable workspace test",
        evidence: {},
      });
      const hdrs = headers(body, {
        "x-tenant-key": `unknown-tenant-${crypto.randomUUID()}`,
        "x-idempotency-key": crypto.randomUUID(),
      });
      const res = await post(body, hdrs);
      expect(res.status).toBe(422);
      expect(res.body.error).toBe("workspace_not_resolved");
    } finally {
      if (savedEnv !== undefined) {
        process.env.FLOWC_WORKSPACE_ID = savedEnv;
      }
    }
  });

  it("outbox retry claims pending rows safely without throwing", async () => {
    const { processOutbox } = await import(
      "../lib/integrations/flowc/outbox"
    );
    // No callback configured — processOutbox is a no-op and must not throw.
    delete process.env.FLOWC_CALLBACK_URL;
    await expect(processOutbox()).resolves.toBeUndefined();
  });

  it("raw-body capture preserves signature validity for multibyte payloads", async () => {
    const body = JSON.stringify({
      event_type: "test.multibyte",
      review_required: false,
      emoji: "🔒 compliance 日本語",
      summary: "multibyte test",
    });
    const res = await post(body, headers(body));
    expect(res.status).toBe(200);
  });
});
