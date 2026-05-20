import { describe, it, expect } from "vitest";
import { computeHealthScore } from "../lib/healthScore";

function daysFromNow(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

describe("computeHealthScore", () => {
  const healthy = {
    status: "active" as const,
    dueDate: daysFromNow(60),
    ownerEmail: "owner@test.com",
    backupOwnerEmail: "backup@test.com",
    activeReminderRuleCount: 2,
  };

  it("returns 100 for a perfectly healthy active obligation", () => {
    const { score, factors } = computeHealthScore(healthy);
    expect(score).toBe(100);
    expect(factors.every((f) => !f.triggered)).toBe(true);
  });

  it("deducts 40 for overdue obligation", () => {
    const { score, factors } = computeHealthScore({ ...healthy, dueDate: daysFromNow(-5) });
    expect(score).toBe(60);
    expect(factors.find((f) => f.key === "overdue")?.triggered).toBe(true);
    expect(factors.find((f) => f.key === "due_critical")?.triggered).toBe(false);
  });

  it("deducts 25 for obligation due in 7 days (not overdue)", () => expect(computeHealthScore({ ...healthy, dueDate: daysFromNow(7) }).score).toBe(75));
  it("deducts 25 for obligation due TODAY", () => expect(computeHealthScore({ ...healthy, dueDate: daysFromNow(0) }).score).toBe(75));
  it("deducts 10 for obligation due in 30 days (due_soon)", () => expect(computeHealthScore({ ...healthy, dueDate: daysFromNow(30) }).score).toBe(90));

  it("does NOT deduct for due_soon when due in 8 days", () => {
    const { score, factors } = computeHealthScore({ ...healthy, dueDate: daysFromNow(8) });
    expect(factors.find((f) => f.key === "due_soon")?.triggered).toBe(false);
    expect(factors.find((f) => f.key === "due_critical")?.triggered).toBe(true);
    expect(score).toBe(75);
  });

  it("deducts 20 for no active reminder rules", () => expect(computeHealthScore({ ...healthy, activeReminderRuleCount: 0 }).score).toBe(80));
  it("deducts 10 for no owner", () => expect(computeHealthScore({ ...healthy, ownerEmail: null }).score).toBe(90));
  it("deducts 5 for no backup owner", () => expect(computeHealthScore({ ...healthy, backupOwnerEmail: null }).score).toBe(95));

  it("stacks all deductions", () => {
    const { score } = computeHealthScore({ status: "active", dueDate: daysFromNow(-1), ownerEmail: null, backupOwnerEmail: null, activeReminderRuleCount: 0 });
    expect(score).toBe(25);
  });

  it("returns score=100 and no triggers for non-active status", () => {
    for (const status of ["completed", "paused", "expired"] as const) {
      const { score, factors } = computeHealthScore({ ...healthy, status, dueDate: daysFromNow(-10) });
      expect(score).toBe(100);
      expect(factors.every((f) => !f.triggered)).toBe(true);
    }
  });

  it("returns exactly 6 factors always", () => expect(computeHealthScore(healthy).factors).toHaveLength(6));
  it("all factor keys are present and stable", () => expect(computeHealthScore(healthy).factors.map((f) => f.key)).toEqual(["overdue", "due_critical", "due_soon", "no_reminder", "no_owner", "no_backup"]));
});
