import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ── Hoisted state ─────────────────────────────────────────────────────────────
// vi.hoisted() executes BEFORE vi.mock() factories are called, making these
// refs safe to reference inside the factory closures below.

const hoisted = vi.hoisted(() => {
  const _selectQueue: unknown[][] = [];

  const _spies = {
    sendMail: vi.fn().mockResolvedValue({}),
    insert: vi.fn(),
    update: vi.fn(),
  };

  function makeChain(value: unknown = []) {
    const chain: Record<string, unknown> = {};
    const returnSelf = () => chain;
    chain.from = vi.fn(returnSelf);
    chain.where = vi.fn(returnSelf);
    chain.innerJoin = vi.fn(returnSelf);
    chain.limit = vi.fn(returnSelf);
    chain.set = vi.fn(returnSelf);
    chain.values = vi.fn().mockResolvedValue(undefined);
    chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(value).then(resolve, reject);
    return chain;
  }

  const _db = {
    select: vi.fn((_fields?: unknown) => {
      const result = _selectQueue.shift() ?? [];
      return makeChain(result);
    }),
    insert: vi.fn((_table: unknown) => {
      const chain = makeChain(undefined);
      _spies.insert(chain);
      return chain;
    }),
    update: vi.fn((_table: unknown) => {
      const chain = makeChain(undefined);
      _spies.update(chain);
      return chain;
    }),
  };

  return { db: _db, spies: _spies, selectQueue: _selectQueue, makeChain };
});

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@workspace/db", () => ({
  db: hoisted.db,
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

// nodemailer is dynamically imported inside sendEmail(); mock it so
// `await import("nodemailer")` resolves to this stub in every test.
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: (...args: unknown[]) => hoisted.spies.sendMail(...args),
    })),
  },
}));

// ── SUT ───────────────────────────────────────────────────────────────────────
import { processReminders } from "../lib/reminderProcessor";

// ── Helpers ───────────────────────────────────────────────────────────────────

function dayOffset(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split("T")[0];
}

const TODAY = dayOffset(0);

function makeObligation(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    workspaceId: 10,
    title: "Test Obligation",
    category: "Legal",
    dueDate: dayOffset(7),
    status: "active",
    ownerEmail: "owner@example.com" as string | null,
    backupOwnerEmail: null as string | null,
    notes: null as string | null,
    completedAt: null as Date | null,
    ...overrides,
  };
}

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    obligationId: 1,
    daysBefore: 7,
    channel: "email",
    recipientType: "owner",
    customEmail: null as string | null,
    isActive: true,
    lastTriggeredAt: null as Date | null,
    ...overrides,
  };
}

function queueSelects(...rows: unknown[][]) {
  for (const r of rows) hoisted.selectQueue.push(r);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("processReminders", () => {
  beforeEach(() => {
    hoisted.selectQueue.length = 0;
    vi.clearAllMocks();

    // Replace spy refs with fresh functions each test
    hoisted.spies.sendMail = vi.fn().mockResolvedValue({});
    hoisted.spies.insert = vi.fn();
    hoisted.spies.update = vi.fn();

    // Restore db implementations (clearAllMocks removes them)
    hoisted.db.select.mockImplementation((_fields?: unknown) => {
      const result = hoisted.selectQueue.shift() ?? [];
      return hoisted.makeChain(result);
    });
    hoisted.db.insert.mockImplementation((_table: unknown) => {
      const chain = hoisted.makeChain(undefined);
      hoisted.spies.insert(chain);
      return chain;
    });
    hoisted.db.update.mockImplementation((_table: unknown) => {
      const chain = hoisted.makeChain(undefined);
      hoisted.spies.update(chain);
      return chain;
    });

    delete process.env.SMTP_HOST;
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
  });

  // ── 1. Overdue marking ──────────────────────────────────────────────────────
  describe("overdue obligation marking", () => {
    it("marks an obligation expired when dueDate is in the past", async () => {
      const obligation = makeObligation({ dueDate: dayOffset(-1) });
      queueSelects([obligation], []);

      await processReminders();

      expect(hoisted.db.update).toHaveBeenCalledTimes(1);
      expect(hoisted.db.insert).toHaveBeenCalledTimes(1);

      const updateChain = hoisted.spies.update.mock.calls[0][0] as Record<string, ReturnType<typeof vi.fn>>;
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "expired" }),
      );
    });

    it("inserts an audit log entry when an obligation expires", async () => {
      const obligation = makeObligation({ dueDate: dayOffset(-2) });
      queueSelects([obligation], []);

      await processReminders();

      const insertChain = hoisted.spies.insert.mock.calls[0][0] as Record<string, ReturnType<typeof vi.fn>>;
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "obligation.expired",
          actorName: "System",
          obligationId: obligation.id,
        }),
      );
    });
  });

  // ── 2. Skip non-overdue ─────────────────────────────────────────────────────
  describe("non-overdue obligations", () => {
    it("does NOT update obligations with a future dueDate", async () => {
      const obligation = makeObligation({ dueDate: dayOffset(5) });
      queueSelects([obligation], []);

      await processReminders();

      expect(hoisted.db.update).not.toHaveBeenCalled();
      expect(hoisted.db.insert).not.toHaveBeenCalled();
    });

    it("does NOT update obligations due exactly today (strict < comparison)", async () => {
      const obligation = makeObligation({ dueDate: TODAY });
      queueSelects([obligation], []);

      await processReminders();

      expect(hoisted.db.update).not.toHaveBeenCalled();
    });
  });

  // ── 3. Reminder fires on correct day ────────────────────────────────────────
  describe("reminder rule firing", () => {
    it("sends an email when today equals dueDate minus daysBefore", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      queueSelects([], [{ rule, obligation }], []);

      await processReminders();

      expect(hoisted.spies.sendMail).toHaveBeenCalledTimes(1);
      expect(hoisted.spies.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: obligation.ownerEmail }),
      );
    });

    it("records a sent delivery history entry on success", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      queueSelects([], [{ rule, obligation }], []);

      await processReminders();

      const insertChain = hoisted.spies.insert.mock.calls[0][0] as Record<string, ReturnType<typeof vi.fn>>;
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ status: "sent", recipientEmail: obligation.ownerEmail }),
      );
    });
  });

  // ── 4. Reminder does NOT fire on wrong day ──────────────────────────────────
  describe("wrong-day suppression", () => {
    it("does NOT send email when today is not the reminder date", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      // dueDate +10 with daysBefore=7 → reminder fires on day +3, not today
      const obligation = makeObligation({ dueDate: dayOffset(10) });
      const rule = makeRule({ daysBefore: 7 });
      queueSelects([], [{ rule, obligation }]);

      await processReminders();

      expect(hoisted.spies.sendMail).not.toHaveBeenCalled();
      expect(hoisted.db.insert).not.toHaveBeenCalled();
    });
  });

  // ── 5. Deduplication ────────────────────────────────────────────────────────
  describe("deduplication", () => {
    it("skips sending when a delivery record already exists for rule/email/day", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      queueSelects([], [{ rule, obligation }], [{ id: 999 }]);

      await processReminders();

      expect(hoisted.spies.sendMail).not.toHaveBeenCalled();
      expect(hoisted.db.insert).not.toHaveBeenCalled();
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
      queueSelects([], [{ rule, obligation }]);

      await processReminders();

      expect(hoisted.spies.sendMail).not.toHaveBeenCalled();
      expect(hoisted.db.insert).not.toHaveBeenCalled();
    });

    it("does NOT skip rule when lastTriggeredAt was yesterday", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({
        daysBefore: 7,
        lastTriggeredAt: new Date(`${dayOffset(-1)}T08:00:00Z`),
      });
      queueSelects([], [{ rule, obligation }], []);

      await processReminders();

      expect(hoisted.spies.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  // ── 7. No recipients ────────────────────────────────────────────────────────
  describe("missing recipients", () => {
    it("skips sending when recipientType=owner but ownerEmail is null", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(7), ownerEmail: null });
      const rule = makeRule({ daysBefore: 7, recipientType: "owner" });
      queueSelects([], [{ rule, obligation }]);

      await processReminders();

      expect(hoisted.spies.sendMail).not.toHaveBeenCalled();
      expect(hoisted.db.insert).not.toHaveBeenCalled();
    });

    it("skips sending when recipientType=custom_email but customEmail is null", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(5) });
      const rule = makeRule({ daysBefore: 5, recipientType: "custom_email", customEmail: null });
      queueSelects([], [{ rule, obligation }]);

      await processReminders();

      expect(hoisted.spies.sendMail).not.toHaveBeenCalled();
    });
  });

  // ── 8. SMTP not configured ──────────────────────────────────────────────────
  describe("SMTP not configured", () => {
    it("records delivery as pending and does NOT call nodemailer", async () => {
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      queueSelects([], [{ rule, obligation }], []);

      await processReminders();

      expect(hoisted.spies.sendMail).not.toHaveBeenCalled();

      const insertChain = hoisted.spies.insert.mock.calls[0][0] as Record<string, ReturnType<typeof vi.fn>>;
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending" }),
      );
    });

    it("includes an errorMessage explaining SMTP is not configured", async () => {
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      queueSelects([], [{ rule, obligation }], []);

      await processReminders();

      const insertChain = hoisted.spies.insert.mock.calls[0][0] as Record<string, ReturnType<typeof vi.fn>>;
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: expect.stringContaining("SMTP not configured") }),
      );
    });
  });

  // ── 9. Email send failure ────────────────────────────────────────────────────
  describe("email send failure", () => {
    it("records delivery as failed when nodemailer throws", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      hoisted.spies.sendMail.mockRejectedValueOnce(new Error("connection refused"));

      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      queueSelects([], [{ rule, obligation }], []);

      await processReminders();

      const insertChain = hoisted.spies.insert.mock.calls[0][0] as Record<string, ReturnType<typeof vi.fn>>;
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
    });

    it("stores an errorMessage on failed delivery", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      hoisted.spies.sendMail.mockRejectedValueOnce(new Error("auth error"));

      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      queueSelects([], [{ rule, obligation }], []);

      await processReminders();

      const insertChain = hoisted.spies.insert.mock.calls[0][0] as Record<string, ReturnType<typeof vi.fn>>;
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ errorMessage: "Email send failed" }),
      );
    });
  });

  // ── 10. all_members recipientType ────────────────────────────────────────────
  describe("all_members recipient type", () => {
    it("queries workspace_members and sends to each member", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(3) });
      const rule = makeRule({ daysBefore: 3, recipientType: "all_members" });
      const members = [{ email: "alice@example.com" }, { email: "bob@example.com" }];
      queueSelects([], [{ rule, obligation }], members, [], []);

      await processReminders();

      expect(hoisted.spies.sendMail).toHaveBeenCalledTimes(2);
      const toAddresses = hoisted.spies.sendMail.mock.calls.map(
        (c: unknown[]) => (c[0] as { to: string }).to,
      );
      expect(toAddresses).toContain("alice@example.com");
      expect(toAddresses).toContain("bob@example.com");
    });

    it("inserts a delivery history record for each member", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(3) });
      const rule = makeRule({ daysBefore: 3, recipientType: "all_members" });
      const members = [{ email: "alice@example.com" }, { email: "bob@example.com" }];
      queueSelects([], [{ rule, obligation }], members, [], []);

      await processReminders();

      expect(hoisted.db.insert).toHaveBeenCalledTimes(2);
    });

    it("deduplicates when the same email appears multiple times in members", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(3) });
      const rule = makeRule({ daysBefore: 3, recipientType: "all_members" });
      const members = [{ email: "alice@example.com" }, { email: "alice@example.com" }];
      queueSelects([], [{ rule, obligation }], members, []);

      await processReminders();

      expect(hoisted.spies.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  // ── Robustness ────────────────────────────────────────────────────────────────
  describe("robustness", () => {
    it("resolves without throwing when db.select throws (caught internally)", async () => {
      hoisted.db.select.mockImplementationOnce(() => {
        throw new Error("db connection lost");
      });

      await expect(processReminders()).resolves.toBeUndefined();
    });

    it("updates lastTriggeredAt on the rule after a successful send", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      const obligation = makeObligation({ dueDate: dayOffset(7) });
      const rule = makeRule({ daysBefore: 7 });
      queueSelects([], [{ rule, obligation }], []);

      await processReminders();

      // One update call: lastTriggeredAt (obligation not updated since dueDate is future)
      expect(hoisted.db.update).toHaveBeenCalledTimes(1);
      const updateChain = hoisted.spies.update.mock.calls[0][0] as Record<string, ReturnType<typeof vi.fn>>;
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ lastTriggeredAt: expect.any(Date) }),
      );
    });
  });
});
