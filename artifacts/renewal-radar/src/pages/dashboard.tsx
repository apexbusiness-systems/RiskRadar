import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetDashboardMetrics,
  getGetDashboardMetricsQueryKey,
  useGetUpcomingObligations,
  getGetUpcomingObligationsQueryKey,
} from "@workspace/api-client-react";
import { StatusBadge, DueDateBadge } from "@/components/ObligationBadge";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Bell,
  Plus,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  isLoading,
}: {
  title: string;
  value?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  isLoading?: boolean;
}) {
  return (
    <Card data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{value ?? 0}</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const [workspaceId, setWorkspaceId] = useState<number | undefined>();
  const [seeded, setSeeded] = useState(false);

  // Seed demo data on first load
  useEffect(() => {
    if (!user || seeded) return;
    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) return;
    setSeeded(true);
    fetch("/api/me/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email,
        name: user.firstName
          ? `${user.firstName} ${user.lastName ?? ""}`.trim()
          : undefined,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.workspaceId) setWorkspaceId(data.workspaceId);
      })
      .catch(() => {});
  }, [user, seeded]);

  const metricsQuery = useGetDashboardMetrics(
    workspaceId !== undefined ? { workspaceId } : {},
    {
      query: {
        queryKey: getGetDashboardMetricsQueryKey(
          workspaceId !== undefined ? { workspaceId } : {},
        ),
        enabled: true,
      },
    },
  );

  const upcomingQuery = useGetUpcomingObligations(
    workspaceId !== undefined ? { workspaceId, days: 30 } : { days: 30 },
    {
      query: {
        queryKey: getGetUpcomingObligationsQueryKey(
          workspaceId !== undefined ? { workspaceId, days: 30 } : { days: 30 },
        ),
        enabled: true,
      },
    },
  );

  const metrics = metricsQuery.data;
  const upcoming = upcomingQuery.data ?? [];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {user?.firstName ? `Welcome back, ${user.firstName}.` : "Welcome back."} Here's what needs attention.
            </p>
          </div>
          <Link href="/obligations/new">
            <Button className="gap-2" data-testid="button-new-obligation">
              <Plus className="w-4 h-4" />
              New Obligation
            </Button>
          </Link>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <MetricCard
            title="Total Active"
            value={metrics?.totalActive}
            icon={Clock}
            color="bg-blue-100 text-blue-700"
            isLoading={metricsQuery.isLoading}
          />
          <MetricCard
            title="Overdue"
            value={metrics?.overdue}
            icon={AlertTriangle}
            color="bg-red-100 text-red-700"
            isLoading={metricsQuery.isLoading}
          />
          <MetricCard
            title="Due Soon"
            value={metrics?.dueSoon}
            icon={Clock}
            color="bg-amber-100 text-amber-700"
            isLoading={metricsQuery.isLoading}
          />
          <MetricCard
            title="Completed"
            value={metrics?.completed}
            icon={CheckCircle2}
            color="bg-green-100 text-green-700"
            isLoading={metricsQuery.isLoading}
          />
          <MetricCard
            title="Expired"
            value={metrics?.expired}
            icon={XCircle}
            color="bg-slate-100 text-slate-600"
            isLoading={metricsQuery.isLoading}
          />
          <MetricCard
            title="Reminders Sent (30d)"
            value={metrics?.remindersSentLast30Days}
            icon={Bell}
            color="bg-purple-100 text-purple-700"
            isLoading={metricsQuery.isLoading}
          />
        </div>

        {/* Upcoming obligations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Upcoming (Next 30 Days)</CardTitle>
            <Link href="/obligations?status=active">
              <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="link-view-all-obligations">
                View all <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingQuery.isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No upcoming obligations in the next 30 days.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {upcoming.map((o) => (
                  <Link key={o.id} href={`/obligations/${o.id}`}>
                    <div
                      className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`row-obligation-${o.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{o.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {o.category} {o.ownerEmail ? `· ${o.ownerEmail}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <DueDateBadge dueDate={o.dueDate} status={o.status} />
                        <StatusBadge status={o.status} />
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(o.dueDate), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By category */}
        {metrics?.byCategory && metrics.byCategory.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {metrics.byCategory.map((item) => (
                  <Link
                    key={item.category}
                    href={`/obligations?category=${encodeURIComponent(item.category)}`}
                  >
                    <div
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      data-testid={`card-category-${item.category}`}
                    >
                      <span className="text-sm font-medium truncate">{item.category}</span>
                      <span className="text-sm font-bold ml-2">{item.count}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
