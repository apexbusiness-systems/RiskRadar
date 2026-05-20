import { cn } from "@/lib/utils";

interface HealthScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function HealthScoreBadge({ score, size = "sm" }: HealthScoreBadgeProps) {
  const colorClass =
    score >= 70
      ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
      : score >= 40
        ? "bg-amber-50 border border-amber-200 text-amber-700"
        : "bg-red-50 border border-red-200 text-red-700";
  const dotColorClass = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-400" : "bg-red-500";

  if (size === "md") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-bold", colorClass)}>
        <span className={cn("w-2 h-2 rounded-full", dotColorClass)} />
        Health {score}/100
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", colorClass)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dotColorClass)} />
      {score}
    </span>
  );
}
