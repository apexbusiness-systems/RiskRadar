import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { db, workspacesTable, workspaceMembersTable, obligationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { makeTestApp } from "./setup/test-app";

describe("GET /api/dashboard/triage", () => {
  let workspaceId: number;
  let app: ReturnType<typeof makeTestApp>;
  const TEST_USER = "test_user_123";

  beforeAll(async () => {
    const [ws] = await db.insert(workspacesTable).values({ name: "Triage Test WS", slug: `triage-test-${Date.now()}` }).returning({ id: workspacesTable.id });
    workspaceId = ws.id;
    await db.insert(workspaceMembersTable).values({ workspaceId, clerkUserId: TEST_USER, email: "test@apex.com", role: "owner" });
    await db.insert(obligationsTable).values({ workspaceId, title: "Triage Obligation A", category: "Licensing", dueDate: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0], status: "active", ownerEmail: null, backupOwnerEmail: null, healthScore: 0 });
    await db.insert(obligationsTable).values({ workspaceId, title: "Triage Obligation B", category: "Insurance", dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0], status: "active", ownerEmail: "owner@test.com", backupOwnerEmail: null, healthScore: 70 });
    await db.insert(obligationsTable).values({ workspaceId, title: "Triage Obligation C", category: "Contracts", dueDate: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0], status: "active", ownerEmail: "owner@test.com", backupOwnerEmail: "backup@test.com", healthScore: 100 });
    app = makeTestApp(TEST_USER);
  });

  afterAll(async () => {
    await db.delete(workspacesTable).where(eq(workspacesTable.id, workspaceId));
  });

  it("returns 400 when workspaceId is missing", async () => { const res = await request(app).get("/api/dashboard/triage"); expect(res.status).toBe(400); });
  it("returns 403 for non-member user", async () => { const res = await request(makeTestApp("non_member_999")).get(`/api/dashboard/triage?workspaceId=${workspaceId}`); expect(res.status).toBe(403); });
  it("returns array sorted by healthScore ascending", async () => { const res = await request(app).get(`/api/dashboard/triage?workspaceId=${workspaceId}`); expect(res.status).toBe(200); const scores = res.body.map((o: { healthScore: number }) => o.healthScore); for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]); });
  it("includes healthBreakdown array with 6 factors", async () => { const res = await request(app).get(`/api/dashboard/triage?workspaceId=${workspaceId}`); expect(res.status).toBe(200); for (const item of res.body) expect(item.healthBreakdown).toHaveLength(6); });
  it("first item includes worst obligation", async () => { const res = await request(app).get(`/api/dashboard/triage?workspaceId=${workspaceId}`); expect(res.status).toBe(200); expect(res.body.find((o: { title: string; healthScore: number }) => o.title === "Triage Obligation A")?.healthScore).toBe(0); });
  it("returns max 10 and only active", async () => { await db.insert(obligationsTable).values({ workspaceId, title: "Completed Should Not Appear", category: "Other", dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0], status: "completed", healthScore: 0 }); const res = await request(app).get(`/api/dashboard/triage?workspaceId=${workspaceId}`); expect(res.status).toBe(200); expect(res.body.length).toBeLessThanOrEqual(10); for (const item of res.body) expect(item.status).toBe("active"); });
});
