import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListDeliveryHistory,
  getListDeliveryHistoryQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Bell, CheckCircle2, XCircle, Clock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; icon: React.ComponentType<{ className?: string }> }> = {
  sent:    { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", icon: CheckCircle2 },
  failed:  { bg: "bg-red-50 border-red-200",         text: "text-red-700",     dot: "bg-red-500",     icon: XCircle },
  pending: { bg: "bg-amber-50 border-amber-200",     text: "text-amber-700",   dot: "bg-amber-400",   icon: Clock },
};

export default function DeliveryPage() {
  const { workspaceId } = useWorkspace();
  const deliveryQuery = useListDeliveryHistory(
    { workspaceId: workspaceId ?? 0, limit: 100 },
    {
      query: {
        queryKey: getListDeliveryHistoryQueryKey({ workspaceId: workspaceId ?? 0, limit: 100 }),
        enabled: !!workspaceId,
      },
    },
  );
  const records = deliveryQuery.data ?? [];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
              <Bell className="w-4.5 h-4.5 text-violet-600" />
            </div>
            Delivery History
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">
            All reminder notifications sent by the system, including email and in-app alerts.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Sent", val: records.filter(r => r.status === "sent").length, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Failed", val: records.filter(r => r.status === "failed").length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
            { label: "Pending", val: records.filter(r => r.status === "pending").length, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-2xl border ${s.bg.split(" ")[1]} p-4`}>
              <p className="text-xs text-slate-500 font-medium mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {deliveryQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="py-20 text-center px-6">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-bold text-slate-700 text-lg mb-1">No deliveries yet</p>
              <p className="text-sm text-slate-400">
                Reminders will appear here once the scheduler runs. The processor checks every hour.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Obligation</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recipient</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Channel</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => {
                    const s = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
                    const StatusIcon = s.icon;
                    return (
                      <tr
                        key={r.id}
                        className={cn("hover:bg-slate-50/80 transition-colors", idx < records.length - 1 ? "border-b border-slate-100" : "")}
                        data-testid={`row-delivery-${r.id}`}
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800 text-sm truncate max-w-52">
                            {r.obligationTitle ?? `Obligation #${r.obligationId}`}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-500 truncate max-w-44 block">{r.recipientEmail}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-500 capitalize">{r.channel.replace("_", " ")}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", s.bg, s.text)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-slate-400 font-medium">
                            {format(new Date(r.sentAt), "MMM d, yyyy · HH:mm")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
