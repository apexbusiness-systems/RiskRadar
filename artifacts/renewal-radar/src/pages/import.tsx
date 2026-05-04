import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePreviewCsvImport, useImportObligationsCsv, getListObligationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, FileSpreadsheet, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const OBLIGATION_FIELDS = [
  { value: "title", label: "Title", required: true },
  { value: "category", label: "Category", required: true },
  { value: "dueDate", label: "Due Date", required: true },
  { value: "description", label: "Description", required: false },
  { value: "ownerEmail", label: "Owner Email", required: false },
  { value: "backupOwnerEmail", label: "Backup Owner Email", required: false },
  { value: "notes", label: "Notes", required: false },
  { value: "renewalFrequency", label: "Renewal Frequency", required: false },
];

type Step = "upload" | "map" | "preview" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Map Columns" },
  { id: "preview", label: "Preview" },
  { id: "done", label: "Done" },
];

function parseCSVHeaders(text: string): string[] {
  const firstLine = text.split("\n")[0];
  if (!firstLine) return [];

  const headers: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i++) {
    const c = firstLine[i];
    if (c === '"') {
      if (inQuotes && firstLine[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      headers.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  headers.push(current.trim());
  return headers;
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [csvContent, setCsvContent] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const previewMutation = usePreviewCsvImport();
  const importMutation = useImportObligationsCsv();

  const parseCsvLocally = (text: string) => {
    const cols = parseCSVHeaders(text);
    setHeaders(cols);
    const autoMap: Record<string, string> = {};
    for (const col of cols) {
      const lower = col.toLowerCase().replace(/[\s_-]/g, "");
      for (const field of OBLIGATION_FIELDS) {
        if (field.value.toLowerCase() === lower) autoMap[field.value] = col;
      }
    }
    setColumnMapping(autoMap);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);
      parseCsvLocally(text);
    };
    reader.readAsText(file);
  };

  const handlePreview = useCallback(() => {
    if (!workspaceId) {
      toast({ title: "Workspace not loaded", variant: "destructive" });
      return;
    }
    previewMutation.mutate(
      { data: { csvContent, columnMapping, workspaceId } },
      {
        onSuccess: (result) => {
          setPreviewRows(result.rows as Record<string, string>[]);
          setPreviewErrors(result.errors);
          setStep("preview");
        },
        onError: () => toast({ title: "Preview failed", variant: "destructive" }),
      },
    );
  }, [workspaceId, csvContent, columnMapping, previewMutation, toast]);

  const handleImport = useCallback(() => {
    if (!workspaceId) {
      toast({ title: "Workspace not loaded", variant: "destructive" });
      return;
    }
    importMutation.mutate(
      { data: { csvContent, columnMapping, workspaceId } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListObligationsQueryKey() });
          setImportResult(result);
          setStep("done");
        },
        onError: () => toast({ title: "Import failed", variant: "destructive" }),
      },
    );
  }, [workspaceId, csvContent, columnMapping, importMutation, queryClient, toast]);

  const currentStepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">CSV Import</h1>
          <p className="text-slate-500 text-sm mt-1">
            Import obligations from a spreadsheet in four guided steps.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                    currentStepIdx > i
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : currentStepIdx === i
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-300 text-slate-400",
                  )}
                >
                  {currentStepIdx > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn("text-xs mt-1.5 font-medium hidden sm:block", currentStepIdx === i ? "text-slate-900" : currentStepIdx > i ? "text-emerald-600" : "text-slate-400")}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("w-20 h-0.5 mt-[-12px] mx-1", currentStepIdx > i ? "bg-emerald-400" : "bg-slate-200")} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700">Upload your CSV</h2>
            </div>
            <div className="p-6 space-y-5">
              <label htmlFor="csv-file" className="cursor-pointer block">
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-slate-300 hover:bg-slate-50/50 transition-all group">
                  <div className="w-12 h-12 bg-slate-100 group-hover:bg-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
                    <FileSpreadsheet className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Click to upload a CSV file</p>
                  <p className="text-xs text-slate-400">or paste your CSV content in the field below</p>
                  <p className="text-xs text-slate-400 mt-2">Required columns: <span className="font-medium text-slate-600">title, category, dueDate</span> (YYYY-MM-DD format)</p>
                </div>
                <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" id="csv-file" data-testid="input-csv-file" />
              </label>

              <div className="relative">
                <div className="absolute inset-x-0 top-0 flex items-center justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400 font-medium -mt-2.5">or paste CSV</span>
                </div>
                <Textarea
                  placeholder="title,category,dueDate,ownerEmail&#10;Business License,Licensing,2026-06-30,owner@co.com"
                  rows={6}
                  value={csvContent}
                  onChange={(e) => {
                    setCsvContent(e.target.value);
                    parseCsvLocally(e.target.value);
                  }}
                  className="font-mono text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white resize-none pt-4"
                  data-testid="textarea-csv"
                />
              </div>

              {headers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-slate-500 mr-1">Detected columns:</span>
                  {headers.map((h) => (
                    <span key={h} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-medium">{h}</span>
                  ))}
                </div>
              )}

              <Button
                onClick={() => setStep("map")}
                disabled={!csvContent.trim() || headers.length === 0}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-2 h-11 w-full"
                data-testid="button-next-map"
              >
                Next: Map Columns <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Map */}
        {step === "map" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-700">Map Columns</h2>
              <p className="text-xs text-slate-400 mt-0.5">Match your CSV columns to obligation fields. Fields marked <span className="text-red-500">*</span> are required.</p>
            </div>
            <div className="p-6">
              <div className="space-y-3 mb-6">
                {OBLIGATION_FIELDS.map((field) => (
                  <div key={field.value} className="flex items-center gap-4">
                    <div className="w-44 flex-shrink-0 flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">{field.label}</span>
                      {field.required && <span className="text-red-500 text-xs">*</span>}
                    </div>
                    <Select
                      value={columnMapping[field.value] ?? "__none__"}
                      onValueChange={(val) =>
                        setColumnMapping((prev) => ({ ...prev, [field.value]: val === "__none__" ? "" : val }))
                      }
                    >
                      <SelectTrigger className="flex-1 rounded-xl border-slate-200 bg-slate-50 h-9" data-testid={`select-map-${field.value}`}>
                        <SelectValue placeholder="— Not mapped —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Not mapped —</SelectItem>
                        {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("upload")} className="gap-2 rounded-xl border-slate-200 h-11" data-testid="button-back-upload">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={handlePreview}
                  disabled={previewMutation.isPending || !workspaceId}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-2 h-11"
                  data-testid="button-preview"
                >
                  {previewMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Previewing...</>
                  ) : (
                    <><span>Preview Import</span> <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-700">Preview Import</h2>
              <p className="text-xs text-slate-400 mt-0.5">First {previewRows.length} rows shown. Check for issues before confirming.</p>
            </div>
            <div className="p-6 space-y-4">
              {previewErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 mb-1">{previewErrors.length} warning{previewErrors.length !== 1 ? "s" : ""} found</p>
                    {previewErrors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-amber-700">{e}</p>)}
                    {previewErrors.length > 5 && <p className="text-xs text-amber-600 mt-1">+{previewErrors.length - 5} more</p>}
                  </div>
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {OBLIGATION_FIELDS.filter((f) => columnMapping[f.value]).map((f) => (
                        <th key={f.value} className="text-left px-3 py-2.5 font-semibold text-slate-600">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className={cn("hover:bg-slate-50", i < previewRows.length - 1 ? "border-b border-slate-100" : "")}>
                        {OBLIGATION_FIELDS.filter((f) => columnMapping[f.value]).map((f) => (
                          <td key={f.value} className="px-3 py-2 text-slate-600 truncate max-w-32">
                            {row[columnMapping[f.value]] ?? row[f.value] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("map")} className="gap-2 rounded-xl border-slate-200 h-11" data-testid="button-back-map">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importMutation.isPending || !workspaceId}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-2 h-11"
                  data-testid="button-confirm-import"
                >
                  {importMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                  ) : (
                    <><span>Confirm Import</span> <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && importResult && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">Import complete</h2>
              <p className="text-slate-500 text-sm mb-8">Your obligations have been added to the workspace.</p>

              <div className="flex items-center justify-center gap-8 mb-8">
                <div className="text-center">
                  <p className="text-4xl font-black text-emerald-600">{importResult.imported}</p>
                  <p className="text-sm text-slate-500 mt-1">Imported</p>
                </div>
                <div className="w-px h-12 bg-slate-200" />
                <div className="text-center">
                  <p className="text-4xl font-black text-amber-500">{importResult.skipped}</p>
                  <p className="text-sm text-slate-500 mt-1">Skipped</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                  {importResult.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-amber-700">{e}</p>
                  ))}
                  {importResult.errors.length > 5 && (
                    <p className="text-xs text-amber-600 mt-1">+{importResult.errors.length - 5} more issues</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => setLocation("/obligations")} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 px-6" data-testid="button-view-obligations">
                  View Obligations
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl h-11 px-6 border-slate-200"
                  onClick={() => {
                    setCsvContent(""); setHeaders([]); setColumnMapping({});
                    setPreviewRows([]); setPreviewErrors([]); setImportResult(null);
                    setStep("upload");
                  }}
                  data-testid="button-import-another"
                >
                  Import Another
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
