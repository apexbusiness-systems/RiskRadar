import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListDeliveryHistory,
  getListDeliveryHistoryQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Bell, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { class: string; icon: React.ComponentType<{ className?: string }> }> = {
  sent: { class: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  failed: { class: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  pending: { class: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
};

export default function DeliveryPage() {
  const deliveryQuery = useListDeliveryHistory(
    { limit: 100 },
    { query: { queryKey: getListDeliveryHistoryQueryKey({ limit: 100 }) } },
  );

  const records = deliveryQuery.data ?? [];

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Delivery History
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Log of all reminder notifications sent by the system.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Deliveries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {deliveryQuery.isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No delivery records yet. Reminders will appear here once the scheduler runs.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Obligation</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Recipient</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Channel</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {records.map((r) => {
                      const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.pending;
                      const StatusIcon = s.icon;
                      return (
                        <tr key={r.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-delivery-${r.id}`}>
                          <td className="px-6 py-3.5 font-medium truncate max-w-48">
                            {r.obligationTitle ?? `Obligation #${r.obligationId}`}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground truncate max-w-40">{r.recipientEmail}</td>
                          <td className="px-4 py-3.5 capitalize text-muted-foreground">{r.channel.replace("_", " ")}</td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className={cn("gap-1 capitalize text-xs", s.class)}>
                              <StatusIcon className="w-3 h-3" />
                              {r.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground text-xs">
                            {format(new Date(r.sentAt), "MMM d, yyyy HH:mm")}
                          </td>
                        </tr>
                      );
                    })}
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
