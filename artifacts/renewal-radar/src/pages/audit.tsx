import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useListAuditLogs, getListAuditLogsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { BookOpen } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "obligation.created": "Created",
  "obligation.updated": "Updated",
  "obligation.deleted": "Deleted",
  "obligation.completed": "Completed",
  "obligation.expired": "Expired",
  "obligation.imported": "Imported from CSV",
  "reminder_rule.created": "Reminder rule added",
  "member.removed": "Member removed",
};

const ACTION_COLORS: Record<string, string> = {
  "obligation.created": "text-blue-600",
  "obligation.updated": "text-amber-600",
  "obligation.deleted": "text-red-600",
  "obligation.completed": "text-green-600",
  "obligation.expired": "text-slate-500",
  "obligation.imported": "text-indigo-600",
  "reminder_rule.created": "text-purple-600",
  "member.removed": "text-orange-600",
};

export default function AuditPage() {
  const auditQuery = useListAuditLogs(
    { limit: 100 },
    { query: { queryKey: getListAuditLogsQueryKey({ limit: 100 }) } },
  );

  const logs = auditQuery.data ?? [];

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Audit Log
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Full history of all changes across your obligations.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Activity History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {auditQuery.isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No activity recorded yet. Actions on obligations will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Obligation</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Actor</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-audit-${log.id}`}>
                        <td className="px-6 py-3.5">
                          <span className={`font-medium text-sm ${ACTION_COLORS[log.action] ?? "text-foreground"}`}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground truncate max-w-48">
                          {log.obligationTitle ?? (log.obligationId ? `#${log.obligationId}` : "—")}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs">
                          {log.actorName ?? log.actorClerkId ?? "System"}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs">
                          {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
