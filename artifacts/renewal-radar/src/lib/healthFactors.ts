import { AlertTriangle, BellOff, CalendarClock, CalendarX2, ShieldAlert, UserX } from "lucide-react";

export const HEALTH_FACTOR_CONFIG = {
  overdue: { label: "Overdue", Icon: CalendarX2 },
  due_critical: { label: "Due in 7 days", Icon: AlertTriangle },
  due_soon: { label: "Due in 30 days", Icon: CalendarClock },
  no_reminder: { label: "No active reminder", Icon: BellOff },
  no_owner: { label: "Missing owner", Icon: UserX },
  no_backup: { label: "Missing backup owner", Icon: ShieldAlert },
} as const;
