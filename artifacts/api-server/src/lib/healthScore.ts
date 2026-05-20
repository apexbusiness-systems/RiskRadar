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

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${input.dueDate}T00:00:00.000Z`);
  const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const factors: HealthFactor[] = [
    { key: "overdue", deduction: 40, triggered: input.status === "active" && daysUntilDue < 0 },
    { key: "due_critical", deduction: 25, triggered: input.status === "active" && daysUntilDue >= 0 && daysUntilDue <= 7 },
    { key: "due_soon", deduction: 10, triggered: input.status === "active" && daysUntilDue > 7 && daysUntilDue <= 30 },
    { key: "no_reminder", deduction: 20, triggered: input.status === "active" && input.activeReminderRuleCount === 0 },
    { key: "no_owner", deduction: 10, triggered: input.status === "active" && !input.ownerEmail },
    { key: "no_backup", deduction: 5, triggered: input.status === "active" && !input.backupOwnerEmail },
  ];

  if (input.status !== "active") return { score: 100, factors: factors.map((f) => ({ ...f, triggered: false })) };

  const deduction = factors.reduce((sum, f) => sum + (f.triggered ? f.deduction : 0), 0);
  return { score: Math.max(0, 100 - deduction), factors };
}
