import { useState, useCallback } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListObligations,
  getListObligationsQueryKey,
  useDeleteObligation,
  useCompleteObligation,
} from "@workspace/api-client-react";
import { StatusBadge, DueDateBadge } from "@/components/ObligationBadge";
import { Plus, Search, Download, Trash2, CheckCircle, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "All",
  "Licensing",
  "Insurance",
  "Contracts",
  "Software",
  "HR & Compliance",
  "Real Estate",
  "Other",
];

const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
];

export default function ObligationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("All");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = {
    ...(search ? { search } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(category !== "All" ? { category } : {}),
  };

  const obligationsQuery = useListObligations(params, {
    query: { queryKey: getListObligationsQueryKey(params) },
  });

  const deleteObligation = useDeleteObligation();
  const completeObligation = useCompleteObligation();

  const obligations = obligationsQuery.data ?? [];

  const handleDelete = useCallback(
    (id: number, title: string) => {
      if (!confirm(`Delete "${title}"?`)) return;
      deleteObligation.mutate(
        { obligationId: id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListObligationsQueryKey() });
            toast({ title: "Obligation deleted" });
          },
          onError: () => toast({ title: "Delete failed", variant: "destructive" }),
        },
      );
    },
    [deleteObligation, queryClient, toast],
  );

  const handleComplete = useCallback(
    (id: number) => {
      completeObligation.mutate(
        { obligationId: id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListObligationsQueryKey() });
            toast({ title: "Marked as completed" });
          },
          onError: () => toast({ title: "Failed", variant: "destructive" }),
        },
      );
    },
    [completeObligation, queryClient, toast],
  );

  const handleExport = useCallback(async () => {
    try {
      const r = await fetch("/api/obligations/export/csv", { credentials: "include" });
      const text = await r.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "obligations.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  }, [toast]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Obligations</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {obligations.length} obligation{obligations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Link href="/import">
              <Button variant="outline" size="sm" data-testid="link-import-csv">
                Import CSV
              </Button>
            </Link>
            <Link href="/obligations/new">
              <Button size="sm" className="gap-2" data-testid="button-new-obligation">
                <Plus className="w-4 h-4" />
                New
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search obligations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44" data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {obligationsQuery.isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : obligations.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground text-sm mb-4">No obligations found.</p>
                <Link href="/obligations/new">
                  <Button size="sm" data-testid="button-create-first">
                    Create your first obligation
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Title
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Category
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Due Date
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Owner
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {obligations.map((o) => (
                      <tr
                        key={o.id}
                        className="hover:bg-muted/30 transition-colors"
                        data-testid={`row-obligation-${o.id}`}
                      >
                        <td className="px-6 py-3.5">
                          <Link href={`/obligations/${o.id}`}>
                            <div className="cursor-pointer group">
                              <p className="font-medium group-hover:text-primary transition-colors truncate max-w-xs">
                                {o.title}
                              </p>
                              <DueDateBadge dueDate={o.dueDate} status={o.status} />
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-muted-foreground">{o.category}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {format(parseISO(o.dueDate), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground truncate max-w-32">
                          {o.ownerEmail || "—"}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {o.status === "active" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleComplete(o.id)}
                                data-testid={`button-complete-${o.id}`}
                                title="Mark complete"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Link href={`/obligations/${o.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7"
                                data-testid={`button-view-${o.id}`}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(o.id, o.title)}
                              data-testid={`button-delete-${o.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
