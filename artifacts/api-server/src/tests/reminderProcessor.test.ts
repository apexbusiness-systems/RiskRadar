import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── Module-level mocks ────────────────────────────────────────────────────────

// Track calls to the mock db so tests can inspect them
const mockDbCalls = {
  selectResults: [] as any[],
  insertValues: [] as any[],
  updateSets: [] as any[],
  updateWheres: [] as any[],
};

// Chainable mock builder — each method returns `this` so callers can chain
// arbitrarily; the terminal await resolves to the pre-configured result.
function makeMockChain(resolveValue: any = []) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    // `.then` makes the chain itself a thenable so `await chain` works
    then: (resolve: (v: any) => any, reject?: (e: any) => any) =>
      Promise.resolve(resolveValue).then(resolve, reject),
  };
  return chain;
}

// Persistent mock db object; `selectQueue` drives sequential select() calls.
let selectQueue: any[][] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let insertSpy: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let updateSpy: any;

const mockDb = {
  select: vi.fn((_fields?: any) => {
    const result = selectQueue.shift() ?? [];
    return makeMockChain(result);
  }),
  insert: vi.fn((_table: any) => {
    const chain = makeMockChain(undefined);
    insertSpy && insertSpy(chain);
    return chain;
  }),
  update: vi.fn((_table: any) => {
    const chain = makeMockChain(undefined);
    updateSpy && updateSpy(chain);
    return chain;
  }),
};

vi.mock("@workspace/db", () => ({
  db: mockDb,
  // Export table stubs so the processor's named imports resolve without error
  obligationsTable: { status: "status", dueDate: "dueDate", id: "id" },
  reminderRulesTable: {
    obligationId: "obligationId",
    isActive: "isActive",
    id: "id",
    lastTriggeredAt: "lastTriggeredAt",
  },
  deliveryHistoryTable: {
    id: "id",
    obligationId: "obligationId",
    ruleId: "ruleId",
    recipientEmail: "recipientEmail",
    sentAt: "sentAt",
  },
  auditLogsTable: {},
  workspaceMembersTable: { workspaceId: "workspaceId", email: "email" },
}));

// nodemailer is imported dynamically inside sendEmail() — mock it here so
// `await import("nodemailer")` returns the mock in every test.
let sendMailSpy: ReturnType<typeof vi.fn>;

vi.mock("nodemailer", () => {
  sendMailSpy = vi.fn().mockResolvedValue({});
  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail: sendMailSpy,
      })),
    },
  };
});

// ── Import the function under test AFTER mocks are registered ────────────────
import { processReminders } from "../lib/reminderProcessor";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a date string N days from today (negative = past) */
function dayOffset(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

const TODAY = dayOffset(0);

function makeObligation(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 1,
    workspaceId: 10,
    title: "Test Obligation",
    category: "Legal",
    dueDate: dayOffset(7),
    status: "active",
    ownerEmail: "owner@example.com",
    backupOwnerEmail: null,
    notes: null,
    completedAt: null,
    ...overrides,
  };
}

function makeRule(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 101,
    obligationId: 1,
    daysBefore: 7,
    channel: "email",
    recipientType: "owner",
    customEmail: null,
    isActive: true,
    lastTriggeredAt: null,
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("processReminders", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    selectQueue = [];

    // Re-wire the spies after resetAllMocks() clears them
    sendMailSpy = vi.fn().mockResolvedValue({});
    insertSpy = vi.fn();
    updateSpy = vi.fn();

    // Restore the select mock (resetAllMocks clears implementation)
    mockDb.select.mockImplementation((_fields?: any) => {
      const result = selectQueue.shift() ?? [];
      return makeMockChain(result);
    });
    mockDb.insert.mockImplementation((_table: any) => {
      const chain = makeMockChain(undefined);
      insertSpy(chain);
      return chain;
    });
    mockDb.update.mockImplementation((_table: any) => {
      const chain = makeMockChain(undefined);
      updateSpy(chain);
      return chain;
    });

    // Re-wire nodemailer mock after reset
    const nodemailer = require("nodemailer");
    nodemailer.default.createTransport.mockReturnValue({ sendMail: sendMailSpy });

    // Default: no SMTP configured
    delete process.env.SMTP_HOST;
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
  });

  // ── 1. Overdue marking ──────────────────────────────────────────────────────
  describe("overdue obligation marking", () => {
    it("marks an obligation as expired when dueDate is in the past", async () => {
      const overdueObligation = makeObligation({ dueDate: dayOffset(-1) });

      // select() call 1: active obligations
      // select() call 2: reminder rules join (returns nothing — focus on marking)
      selectQueue = [[overdueObligation], []];

      await processReminders();

      // db.update should have been called (to set status='expired')
      expect(mockDb.update).toHaveBeenCalledTimes(1);

      // db.insert should have been called (audit log)
      expect(mockDb.insert).toHaveBeenCalledTimes(1);

      // Verify the update chain received the right set() argument
      const updateChain = updateSpy.mock.calls[0][0];
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "expired" }),
      );
    });

    it("inserts an audit log entry when an obligation expires", async () => {
      const overdueObligation = makeObligation({ dueDate: dayOffset(-2) });
      selectQueue = [[overdueObligation], []];

      await processReminders();

      const insertChain = insertSpy.mock.calls[0][0];
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "obligation.expired",
          actorName: "System",
          obligationId: overdueObligation.id,
        }),
      );
    });
  });

  // ── 2. Skip non-overdue ─────────────────────────────────────────────────────
  describe("non-overdue obligations", () => {
    it("does NOT update obligations whose dueDate is in the future", async () => {
      const futureObligation = makeObligation({ dueDate: dayOffset(5) });
      selectQueue = [[futureObligation], []];

      await processReminders();

      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("does NOT update obligations due exactly today", async () => {
      const todayObligation = makeObligation({ dueDate: TODAY });
      selectQueue = [[todayObligation], []];

      await processReminders();

      // dueDate < todayStr is false when equal, so no update
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  // ── 3. Reminder fires on correct day ────────────────────────────────────────
  describe("reminder rule firing", () => {
    it("sends an email when today equals dueDate - daysBefore", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const dueDate = dayOffset(7);
      const obligation = makeObligation({ dueDate });
      const rule = makeRule({ daysBefore: 7 });

      // select 1: active obligations (no overdue ones today)
      // select 2: rules+obligations join
      // select 3: existing delivery check (empty → no dupe)
      selectQueue = [[], [{ rule, obligation }], []];

      await processReminders();

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: obligation.ownerEmail }),
      );
    });

    it("records a 'sent' delivery history entry on success", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      selectQueue = [[], [{ rule, obligation }], []];

      await processReminders();

      const insertChain = insertSpy.mock.calls[0][0];
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "sent",
          recipientEmail: obligation.ownerEmail,
        }),
      );
    });
  });

  // ── 4. Reminder does NOT fire on wrong day ──────────────────────────────────
  describe("wrong-day suppression", () => {
    it("does NOT send email when today is not the reminder date", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      // Rule fires 7 days before, but dueDate is 10 days away → reminder date
      // is 3 days from now, which is NOT today.
      const obligation = makeObligation({ dueDate: dayOffset(10) });
      const rule = makeRule({ daysBefore: 7 });
      selectQueue = [[], [{ rule, obligation }]];

      await processReminders();

      expect(sendMailSpy).not.toHaveBeenCalled();
      // No delivery insert, no update to lastTriggeredAt
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  // ── 5. Deduplication ────────────────────────────────────────────────────────
  describe("deduplication", () => {
    it("skips sending when a delivery record already exists for this rule/email/day", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });

      // Existing delivery returned
      const existingDelivery = { id: 999 };
      selectQueue = [[], [{ rule, obligation }], [existingDelivery]];

      await processReminders();

      expect(sendMailSpy).not.toHaveBeenCalled();
      // No new delivery history insert
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  // ── 6. Rule already fired today ─────────────────────────────────────────────
  describe("lastTriggeredAt guard", () => {
    it("skips rule entirely when lastTriggeredAt is today", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({
        daysBefore: 7,
        lastTriggeredAt: new Date(`${TODAY}T08:00:00Z`),
      });
      selectQueue = [[], [{ rule, obligation }]];

      await processReminders();

      expect(sendMailSpy).not.toHaveBeenCalled();
      // No delivery select, no insert, no update to lastTriggeredAt
      expect(mockDb.insert).not.toHaveBeenCalled();
      // update might still be called 0 times because we never reach that code
      // (we only care that sendMail was NOT called)
    });
  });

  // ── 7. No recipients ────────────────────────────────────────────────────────
  describe("missing recipients", () => {
    it("skips sending when recipientType=owner but ownerEmail is null", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ ownerEmail: null });
      // Adjust dueDate so today IS the reminder date
      obligation.dueDate = dayOffset(7);
      const rule = makeRule({ daysBefore: 7, recipientType: "owner" });
      selectQueue = [[], [{ rule, obligation }]];

      await processReminders();

      expect(sendMailSpy).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  // ── 8. SMTP not configured ──────────────────────────────────────────────────
  describe("SMTP not configured", () => {
    it("records delivery as 'pending' and does NOT call nodemailer", async () => {
      // SMTP_HOST is not set (cleared in beforeEach)
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      selectQueue = [[], [{ rule, obligation }], []];

      await processReminders();

      expect(sendMailSpy).not.toHaveBeenCalled();

      const insertChain = insertSpy.mock.calls[0][0];
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending" }),
      );
    });

    it("includes an errorMessage explaining SMTP is not configured", async () => {
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      selectQueue = [[], [{ rule, obligation }], []];

      await processReminders();

      const insertChain = insertSpy.mock.calls[0][0];
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: expect.stringContaining("SMTP not configured"),
        }),
      );
    });
  });

  // ── 9. Email send failure ────────────────────────────────────────────────────
  describe("email send failure", () => {
    it("records delivery as 'failed' when nodemailer throws", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      sendMailSpy.mockRejectedValueOnce(new Error("connection refused"));

      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      selectQueue = [[], [{ rule, obligation }], []];

      await processReminders();

      const insertChain = insertSpy.mock.calls[0][0];
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
    });

    it("stores an error message on failed delivery", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      sendMailSpy.mockRejectedValueOnce(new Error("auth error"));

      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      selectQueue = [[], [{ rule, obligation }], []];

      await processReminders();

      const insertChain = insertSpy.mock.calls[0][0];
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "Email send failed" }),
      );
    });
  });

  // ── 10. all_members recipientType ────────────────────────────────────────────
  describe("all_members recipient type", () => {
    it("queries workspace_members and sends to each member email", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(3) });
      const rule = makeRule({
        daysBefore: 3,
        recipientType: "all_members",
      });
      const members = [
        { email: "alice@example.com" },
        { email: "bob@example.com" },
      ];

      // select 1: active obligations (none overdue)
      // select 2: rules+obligations join
      // select 3: workspace_members
      // select 4: delivery check for alice (empty)
      // select 5: delivery check for bob (empty)
      selectQueue = [[], [{ rule, obligation }], members, [], []];

      await processReminders();

      expect(sendMailSpy).toHaveBeenCalledTimes(2);
      const toAddresses = sendMailSpy.mock.calls.map((c) => c[0].to);
      expect(toAddresses).toContain("alice@example.com");
      expect(toAddresses).toContain("bob@example.com");
    });

    it("inserts a delivery history record for each member", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(3) });
      const rule = makeRule({ daysBefore: 3, recipientType: "all_members" });
      const members = [{ email: "alice@example.com" }, { email: "bob@example.com" }];
      selectQueue = [[], [{ rule, obligation }], members, [], []];

      await processReminders();

      // Two delivery inserts + one lastTriggeredAt update call
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it("deduplicates recipients from all_members when emails repeat", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(3) });
      const rule = makeRule({ daysBefore: 3, recipientType: "all_members" });
      // Same email twice → should only send once
      const members = [
        { email: "alice@example.com" },
        { email: "alice@example.com" },
      ];
      selectQueue = [[], [{ rule, obligation }], members, []];

      await processReminders();

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── General robustness ────────────────────────────────────────────────────────
  describe("robustness", () => {
    it("does not throw even if db.select rejects (error is caught internally)", async () => {
      mockDb.select.mockImplementationOnce(() => {
        throw new Error("db connection lost");
      });

      // processReminders catches all errors internally
      await expect(processReminders()).resolves.toBeUndefined();
    });

    it("updates lastTriggeredAt for the rule after a successful send", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      selectQueue = [[], [{ rule, obligation }], []];

      await processReminders();

      // update should be called once to set lastTriggeredAt
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      const updateChain = updateSpy.mock.calls[0][0];
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ lastTriggeredAt: expect.any(Date) }),
      );
    });
  });
});
