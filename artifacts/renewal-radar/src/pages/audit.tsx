import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useListAuditLogs, getListAuditLogsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { BookOpen, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, Upload, Bell, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  "obligation.created":   { label: "Created",          color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",    icon: Plus },
  "obligation.updated":   { label: "Updated",          color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",  icon: Edit2 },
  "obligation.deleted":   { label: "Deleted",          color: "text-red-700",     bg: "bg-red-50 border-red-200",      icon: Trash2 },
  "obligation.completed": { label: "Completed",        color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  "obligation.expired":   { label: "Expired",          color: "text-slate-600",   bg: "bg-slate-100 border-slate-200", icon: AlertTriangle },
  "obligation.imported":  { label: "Imported via CSV", color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200", icon: Upload },
  "reminder_rule.created":{ label: "Reminder added",   color: "text-purple-700",  bg: "bg-purple-50 border-purple-200", icon: Bell },
  "member.removed":       { label: "Member removed",   color: "text-orange-700",  bg: "bg-orange-50 border-orange-200", icon: UserMinus },
};

const FALLBACK = { label: "Action", color: "text-slate-600", bg: "bg-slate-100 border-slate-200", icon: BookOpen };

export default function AuditPage() {
  const { workspaceId } = useWorkspace();
  const auditQuery = useListAuditLogs(
    { workspaceId: workspaceId ?? 0, limit: 100 },
    {
      query: {
        queryKey: getListAuditLogsQueryKey({ workspaceId: workspaceId ?? 0, limit: 100 }),
        enabled: !!workspaceId,
      },
    },
  );
  const logs = auditQuery.data ?? [];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5 text-slate-600" />
            </div>
            Audit Log
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Immutable record of every action taken on obligations and workspace members.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {auditQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center px-6">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-bold text-slate-700 text-lg mb-1">No activity yet</p>
              <p className="text-sm text-slate-400">
                All changes to obligations will be recorded here automatically.
              </p>
            </div>
          ) : (
            <div>
              {/* Column headers */}
              <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50/80 px-6 py-3.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Obligation</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actor</span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">When</span>
              </div>
              {logs.map((log, idx) => {
                const config = ACTION_CONFIG[log.action] ?? FALLBACK;
                const Icon = config.icon;
                return (
                  <div
                    key={log.id}
                    className={cn(
                      "grid grid-cols-4 items-center px-6 py-4 hover:bg-slate-50/80 transition-colors",
                      idx < logs.length - 1 ? "border-b border-slate-100" : "",
                    )}
                    data-testid={`row-audit-${log.id}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0", config.bg)}>
                        <Icon className={cn("w-3.5 h-3.5", config.color)} />
                      </div>
                      <span className={cn("text-sm font-semibold", config.color)}>
                        {config.label}
                      </span>
                    </div>
                    <div className="pr-4">
                      <span className="text-sm text-slate-700 font-medium truncate block max-w-40">
                        {log.obligationTitle ?? (log.obligationId ? `#${log.obligationId}` : "—")}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500 truncate block max-w-36">
                        {log.actorName ?? log.actorClerkId ?? "System"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-medium">
                        {format(new Date(log.createdAt), "MMM d, yyyy · HH:mm")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
