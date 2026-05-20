import { cn } from "@/lib/utils";

export function HealthScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
  const tone = score >= 70
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : score >= 40
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        tone,
      )}
    >
      {score}
    </span>
  );
}
