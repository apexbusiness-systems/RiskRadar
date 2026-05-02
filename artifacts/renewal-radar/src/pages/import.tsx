import { useState, useCallback } from "react";
import { useUser } from "@clerk/react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

const OBLIGATION_FIELDS = [
  { value: "title", label: "Title *" },
  { value: "category", label: "Category *" },
  { value: "dueDate", label: "Due Date *" },
  { value: "description", label: "Description" },
  { value: "ownerEmail", label: "Owner Email" },
  { value: "backupOwnerEmail", label: "Backup Owner Email" },
  { value: "notes", label: "Notes" },
  { value: "renewalFrequency", label: "Renewal Frequency" },
];

type Step = "upload" | "map" | "preview" | "done";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [csvContent, setCsvContent] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);

  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const previewMutation = usePreviewCsvImport();
  const importMutation = useImportObligationsCsv();

  // Get workspace ID
  const ensureWorkspace = useCallback(async (): Promise<number> => {
    if (workspaceId) return workspaceId;
    const email = user?.emailAddresses[0]?.emailAddress ?? "";
    const r = await fetch("/api/me/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    const data = await r.json();
    const id = data.workspaceId as number;
    setWorkspaceId(id);
    return id;
  }, [workspaceId, user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      const firstLine = text.split("\n")[0];
      const cols = firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      setHeaders(cols);
      // Auto-map exact matches
      const autoMap: Record<string, string> = {};
      for (const col of cols) {
        const lower = col.toLowerCase().replace(/[\s_-]/g, "");
        for (const field of OBLIGATION_FIELDS) {
          if (field.value.toLowerCase() === lower) {
            autoMap[field.value] = col;
          }
        }
      }
      setColumnMapping(autoMap);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    const wsId = await ensureWorkspace();
    previewMutation.mutate(
      { data: { csvContent, columnMapping, workspaceId: wsId } },
      {
        onSuccess: (result) => {
          setPreviewRows(result.rows as Record<string, string>[]);
          setPreviewErrors(result.errors);
          setStep("preview");
        },
        onError: () => toast({ title: "Preview failed", variant: "destructive" }),
      },
    );
  };

  const handleImport = async () => {
    const wsId = await ensureWorkspace();
    importMutation.mutate(
      { data: { csvContent, columnMapping, workspaceId: wsId } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListObligationsQueryKey() });
          setImportResult(result);
          setStep("done");
        },
        onError: () => toast({ title: "Import failed", variant: "destructive" }),
      },
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">CSV Import</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Import obligations from a spreadsheet in 4 steps.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["upload", "map", "preview", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["upload", "map", "preview", "done"].indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {["upload", "map", "preview", "done"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              <span className="text-xs font-medium capitalize hidden sm:block">{s}</span>
              {i < 3 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-file"
                  data-testid="input-csv-file"
                />
                <label htmlFor="csv-file" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Click to upload a CSV file</p>
                  <p className="text-xs text-muted-foreground">or paste CSV content below</p>
                </label>
              </div>
              <Textarea
                placeholder="Or paste CSV content here..."
                rows={8}
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value);
                  const firstLine = e.target.value.split("\n")[0];
                  if (firstLine) {
                    const cols = firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
                    setHeaders(cols);
                  }
                }}
                className="font-mono text-xs"
                data-testid="textarea-csv"
              />
              <p className="text-xs text-muted-foreground">
                Required columns: title, category, dueDate. Optional: description, ownerEmail, notes.
              </p>
              <Button
                onClick={() => setStep("map")}
                disabled={!csvContent.trim() || headers.length === 0}
                className="gap-2"
                data-testid="button-next-map"
              >
                Next: Map Columns <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Map */}
        {step === "map" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Map Columns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Match your CSV columns to obligation fields. Detected {headers.length} columns.
              </p>
              <div className="space-y-3">
                {OBLIGATION_FIELDS.map((field) => (
                  <div key={field.value} className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium w-40 flex-shrink-0">{field.label}</span>
                    <Select
                      value={columnMapping[field.value] ?? "__none__"}
                      onValueChange={(val) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [field.value]: val === "__none__" ? "" : val,
                        }))
                      }
                    >
                      <SelectTrigger className="flex-1" data-testid={`select-map-${field.value}`}>
                        <SelectValue placeholder="-- Not mapped --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Not mapped --</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("upload")} className="gap-2" data-testid="button-back-upload">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={handlePreview}
                  disabled={previewMutation.isPending}
                  className="gap-2"
                  data-testid="button-preview"
                >
                  {previewMutation.isPending ? "Previewing..." : "Preview Import"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> {previewErrors.length} warning(s)
                  </p>
                  {previewErrors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs text-amber-700">{e}</p>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                First 10 rows (preview). Mapped fields shown below.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {OBLIGATION_FIELDS.filter((f) => columnMapping[f.value]).map((f) => (
                        <th key={f.value} className="text-left px-3 py-2 font-medium">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        {OBLIGATION_FIELDS.filter((f) => columnMapping[f.value]).map((f) => (
                          <td key={f.value} className="px-3 py-2 truncate max-w-32">
                            {row[columnMapping[f.value]] ?? row[f.value] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("map")} className="gap-2" data-testid="button-back-map">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={handleImport} disabled={importMutation.isPending} className="gap-2" data-testid="button-confirm-import">
                  {importMutation.isPending ? "Importing..." : "Confirm Import"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Done */}
        {step === "done" && importResult && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Import Complete</h2>
              <div className="flex items-center justify-center gap-8 mb-6">
                <div>
                  <p className="text-3xl font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-500">{importResult.skipped}</p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-left">
                  {importResult.errors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs text-amber-700">{e}</p>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => setLocation("/obligations")} data-testid="button-view-obligations">
                  View Obligations
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCsvContent("");
                    setHeaders([]);
                    setColumnMapping({});
                    setPreviewRows([]);
                    setPreviewErrors([]);
                    setImportResult(null);
                    setStep("upload");
                  }}
                  data-testid="button-import-another"
                >
                  Import Another
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
