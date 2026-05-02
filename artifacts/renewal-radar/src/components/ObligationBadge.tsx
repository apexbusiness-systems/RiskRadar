import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

type ObligationStatus = "active" | "expired" | "completed" | "paused";

const STATUS_STYLES: Record<ObligationStatus, string> = {
  active: "bg-blue-100 text-blue-800 border-blue-200",
  expired: "bg-red-100 text-red-800 border-red-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  paused: "bg-gray-100 text-gray-600 border-gray-200",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as ObligationStatus;
  return (
    <Badge
      variant="outline"
      className={cn("capitalize text-xs font-medium", STATUS_STYLES[s] ?? "bg-gray-100 text-gray-600")}
    >
      {status}
    </Badge>
  );
}

export function DueDateBadge({ dueDate, status }: { dueDate: string; status: string }) {
  if (status !== "active") return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseISO(dueDate);
  const days = differenceInDays(due, today);

  if (days < 0) {
    return (
      <span className="text-xs font-medium text-red-600">
        Overdue {Math.abs(days)}d
      </span>
    );
  }
  if (days === 0) {
    return <span className="text-xs font-medium text-amber-600">Due today</span>;
  }
  if (days <= 7) {
    return <span className="text-xs font-medium text-amber-500">Due in {days}d</span>;
  }
  return <span className="text-xs text-muted-foreground">Due in {days}d</span>;
}
