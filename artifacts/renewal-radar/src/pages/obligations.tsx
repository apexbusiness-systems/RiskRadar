import { useState, useCallback } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { Plus, Search, Download, Trash2, CheckCircle2, ChevronRight, ClipboardList, Upload } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const CATEGORIES = ["All", "Licensing", "Insurance", "Contracts", "Software", "HR & Compliance", "Real Estate", "Other"];
const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Licensing: "bg-blue-500",
  Insurance: "bg-purple-500",
  Contracts: "bg-indigo-500",
  Software: "bg-sky-500",
  "HR & Compliance": "bg-emerald-500",
  "Real Estate": "bg-orange-500",
  Other: "bg-slate-400",
};

export default function ObligationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("All");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { workspaceId } = useWorkspace();

  const params = {
    ...(workspaceId ? { workspaceId } : {}),
    ...(search ? { search } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(category !== "All" ? { category } : {}),
  } as Parameters<typeof useListObligations>[0];

  const obligationsQuery = useListObligations(params, {
    query: {
      queryKey: getListObligationsQueryKey(params),
      enabled: !!workspaceId,
    },
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
        { obligationId: id, data: {} },
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
    if (!workspaceId) {
      toast({ title: "Workspace not loaded yet", variant: "destructive" });
      return;
    }
    try {
      const qs = new URLSearchParams({ workspaceId: String(workspaceId) });
      if (search) qs.set("search", search);
      if (status !== "all") qs.set("status", status);
      if (category !== "All") qs.set("category", category);

      const r = await fetch(`/api/obligations/export/csv?${qs}`, { credentials: "include" });
      if (!r.ok) throw new Error("Export failed");
      const text = await r.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "obligations.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "CSV exported" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  }, [workspaceId, search, status, category, toast]);

  const isFiltered = search || status !== "all" || category !== "All";

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Obligations</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {!workspaceId
                ? "Loading..."
                : obligationsQuery.isLoading
                ? "Loading obligations..."
                : `${obligations.length} obligation${obligations.length !== 1 ? "s" : ""} found`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-xl"
              onClick={handleExport}
              disabled={!workspaceId}
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Link href="/import">
              <Button variant="outline" size="sm" className="gap-2 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-xl" data-testid="link-import-csv">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
            </Link>
            <Link href="/obligations/new">
              <Button size="sm" className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm" data-testid="button-new-obligation">
                <Plus className="w-4 h-4" />
                New
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2.5 mb-5">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search obligations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-slate-300 h-9"
              data-testid="input-search"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40 rounded-xl border-slate-200 bg-white shadow-sm h-9" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44 rounded-xl border-slate-200 bg-white shadow-sm h-9" data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {!workspaceId || obligationsQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : obligations.length === 0 ? (
            <div className="py-20 px-6 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-bold text-slate-700 text-lg mb-1">No obligations found</p>
              <p className="text-slate-400 text-sm mb-6">
                {isFiltered
                  ? "Try adjusting your filters."
                  : "Add your first obligation to get started."}
              </p>
              {!isFiltered && (
                <div className="flex items-center justify-center gap-3">
                  <Link href="/obligations/new">
                    <Button size="sm" className="bg-slate-900 hover:bg-slate-800 rounded-xl gap-2" data-testid="button-create-first">
                      <Plus className="w-4 h-4" /> Add obligation
                    </Button>
                  </Link>
                  <Link href="/import">
                    <Button variant="outline" size="sm" className="rounded-xl gap-2 border-slate-200">
                      <Upload className="w-4 h-4" /> Import CSV
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Obligation</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Owner</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {obligations.map((o, idx) => (
                    <tr
                      key={o.id}
                      className={cn("hover:bg-slate-50/80 transition-colors group", idx < obligations.length - 1 ? "border-b border-slate-100" : "")}
                      data-testid={`row-obligation-${o.id}`}
                    >
                      <td className="px-6 py-4">
                        <Link href={`/obligations/${o.id}`}>
                          <div className="cursor-pointer flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", CATEGORY_COLORS[o.category] ?? "bg-slate-400")} />
                            <div>
                              <p className="font-semibold text-slate-800 group-hover:text-slate-900 truncate max-w-52">{o.title}</p>
                              <div className="mt-0.5">
                                <DueDateBadge dueDate={o.dueDate} status={o.status} />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-500">{o.category}</span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600 font-medium">{format(parseISO(o.dueDate), "MMM d, yyyy")}</span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {o.ownerEmail ? (
                          <span className="text-sm text-slate-600 truncate max-w-36 block">{o.ownerEmail}</span>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">No owner</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {o.status === "active" && (
                            <button
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
                              onClick={() => handleComplete(o.id)}
                              data-testid={`button-complete-${o.id}`}
                              title="Mark complete"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <Link href={`/obligations/${o.id}`}>
                            <button
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              data-testid={`button-view-${o.id}`}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </Link>
                          <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                            onClick={() => handleDelete(o.id, o.title)}
                            data-testid={`button-delete-${o.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
