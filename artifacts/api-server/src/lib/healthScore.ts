export interface HealthScoreInput {
  status: "active" | "expired" | "completed" | "paused";
  dueDate: string;
  ownerEmail: string | null;
  backupOwnerEmail: string | null;
  activeReminderRuleCount: number;
}

export interface HealthFactor {
  key: string;
  deduction: number;
  triggered: boolean;
}

export interface HealthScoreResult {
  score: number;
  factors: HealthFactor[];
}

function parseIsoDateOnly(dateIso: string): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function differenceInCalendarDaysUtc(left: Date, right: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const leftUtc = Date.UTC(left.getUTCFullYear(), left.getUTCMonth(), left.getUTCDate());
  const rightUtc = Date.UTC(right.getUTCFullYear(), right.getUTCMonth(), right.getUTCDate());
  return Math.floor((leftUtc - rightUtc) / msPerDay);
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const isActive = input.status === "active";
  const daysUntilDue = differenceInCalendarDaysUtc(parseIsoDateOnly(input.dueDate), new Date());

  const factors: HealthFactor[] = [
    { key: "overdue", deduction: 40, triggered: isActive && daysUntilDue < 0 },
    { key: "due_critical", deduction: 25, triggered: isActive && daysUntilDue >= 0 && daysUntilDue <= 7 },
    { key: "due_soon", deduction: 10, triggered: isActive && daysUntilDue >= 8 && daysUntilDue <= 30 },
    { key: "no_reminder", deduction: 20, triggered: isActive && input.activeReminderRuleCount === 0 },
    { key: "no_owner", deduction: 10, triggered: isActive && !input.ownerEmail },
    { key: "no_backup", deduction: 5, triggered: isActive && !input.backupOwnerEmail },
  ];

  if (!isActive) {
    return {
      score: 100,
      factors: factors.map((factor) => ({ ...factor, triggered: false })),
    };
  }

  const score = Math.max(
    0,
    100 - factors.reduce((acc, factor) => (factor.triggered ? acc + factor.deduction : acc), 0),
  );

  return { score, factors };
}
