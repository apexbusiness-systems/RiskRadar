import { describe, it, expect } from "vitest";
import { computeHealthScore } from "../lib/healthScore";

const base = { status: "active" as const, dueDate: "2099-01-01", ownerEmail: "o@x.com", backupOwnerEmail: "b@x.com", activeReminderRuleCount: 1 };

describe("computeHealthScore", () => {
  it("non-active always 100", () => expect(computeHealthScore({ ...base, status: "paused" }).score).toBe(100));
  it("overdue", () => expect(computeHealthScore({ ...base, dueDate: "2000-01-01" }).factors[0].triggered).toBe(true));
  it("due critical", () => expect(computeHealthScore({ ...base, dueDate: new Date().toISOString().split("T")[0] }).factors[1].triggered).toBe(true));
  it("due soon", () => { const d = new Date(); d.setDate(d.getDate()+10); expect(computeHealthScore({ ...base, dueDate: d.toISOString().split("T")[0] }).factors[2].triggered).toBe(true); });
  it("no reminder", () => expect(computeHealthScore({ ...base, activeReminderRuleCount: 0 }).factors[3].triggered).toBe(true));
  it("no owner", () => expect(computeHealthScore({ ...base, ownerEmail: null }).factors[4].triggered).toBe(true));
  it("no backup", () => expect(computeHealthScore({ ...base, backupOwnerEmail: null }).factors[5].triggered).toBe(true));
  it("stacking", () => expect(computeHealthScore({ ...base, dueDate: "2000-01-01", activeReminderRuleCount: 0, ownerEmail: null, backupOwnerEmail: null }).score).toBe(25));
  it("clamp at 0", () => expect(computeHealthScore({ ...base, dueDate: "2000-01-01", activeReminderRuleCount: 0, ownerEmail: null, backupOwnerEmail: null }).score).toBeGreaterThanOrEqual(0));
  it("factor order", () => expect(computeHealthScore(base).factors.map((f) => f.key)).toEqual(["overdue", "due_critical", "due_soon", "no_reminder", "no_owner", "no_backup"]));
  it("deductions stable", () => expect(computeHealthScore(base).factors.map((f) => f.deduction)).toEqual([40,25,10,20,10,5]));
  it("frontend parity case", () => expect(computeHealthScore({ ...base, dueDate: "2000-01-01", activeReminderRuleCount: 0, ownerEmail: null }).score).toBe(30));
});
