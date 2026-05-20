import type React from "react";
import { AlertTriangle, Clock, Calendar, Bell, UserX, Users } from "lucide-react";

export const HEALTH_FACTOR_CONFIG: Record<
  string,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  overdue: { label: "Obligation is overdue", Icon: AlertTriangle },
  due_critical: { label: "Due within 7 days", Icon: Clock },
  due_soon: { label: "Due within 30 days", Icon: Calendar },
  no_reminder: { label: "No active reminder rules", Icon: Bell },
  no_owner: { label: "No owner assigned", Icon: UserX },
  no_backup: { label: "No backup owner assigned", Icon: Users },
};
