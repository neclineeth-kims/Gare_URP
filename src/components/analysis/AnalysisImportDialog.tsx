"use client";

/**
 * Analysis import dialog — reads a 2-sheet Excel file:
 *   Sheet 1 "Analyses"  : Code | Name | Unit | Base Quantity
 *   Sheet 2 "Resources" : Analysis Code | Type | Resource Code | Quantity
 *
 * Conflict handling:
 *   - Existing codes default to unchecked (amber) — tick to overwrite via PUT.
 *   - New codes default to checked (green) — untick to skip.
 */

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileDown, AlertCircle, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { parseAnalysisFile, type AnalysisImportData } from "@/lib/excel";

type Props = {
  projectId: string;
  onDone: () => void;
  onDownloadTemplate: () => void;
};

type RowState = {
  checked: boolean;
  existingId: string | null;
};

export function AnalysisImportDialog({ projectId, onDone, onDownloadTemplate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AnalysisImportData | null>(null);
  const [rowStates, setRowStates] = useState<RowState[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; skipped: number; overwritten: number } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseAnalysisFile(file);

      // Fetch existing analysis codes
      const res = await fetch(`/api/v1/projects/${projectId}/analysis`);
      const json = await res.json();
      const existingMap: Record<string, string> = {};
      (json.data ?? []).forEach((a: { code: string; id: string }) => {
        existingMap[a.code.toUpperCase()] = a.id;
      });

      const states: RowState[] = parsed.analyses.map((a) => {
        const existingId = existingMap[a.code.toUpperCase()] ?? null;
        return { checked: !a._error && existingId === null, existingId };
      });

      setData(parsed);
      setRowStates(states);
      setResult(null);
      setOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file.");
    }
    e.target.value = "";
  };

  const toggleRow = (i: number) =>
    setRowStates((prev) => prev.map((s, idx) => (idx === i ? { ...s, checked: !s.checked } : s)));

  const toggleAll = (checked: boolean) =>
    setRowStates((prev) =>
      prev.map((s, i) => (data?.analyses[i]._error ? s : { ...s, checked }))
    );

  const handleImport = async () => {
    if (!data) return;
    setImporting(true);

    // Fetch resource code→id maps for labor, material, equipment
    const [laborRes, matRes, eqRes] = await Promise.all([
      fetch(`/api/v1/projects/${projectId}/labor`).then((r) => r.json()),
      fetch(`/api/v1/projects/${projectId}/materials`).then((r) => r.json()),
      fetch(`/api/v1/projects/${projectId}/equipment`).then((r) => r.json()),
    ]);
    const laborMap: Record<string, string> = {};
    const matMap: Record<string, string> = {};
    const eqMap: Record<string, string> = {};
    (laborRes.data ?? []).forEach((l: { code: string; id: string }) => { laborMap[l.code.toUpperCase()] = l.id; });
    (matRes.data ?? []).forEach((m: { code: string; id: string }) => { matMap[m.code.toUpperCase()] = m.id; });
    (eqRes.data ?? []).forEach((eq: { code: string; id: string }) => { eqMap[eq.code.toUpperCase()] = eq.id; });

    let ok = 0, skipped = 0, overwritten = 0;

    for (let i = 0; i < data.analyses.length; i++) {
      const analysis = data.analyses[i];
      const state = rowStates[i];
      if (!state.checked || analysis._error) { skipped++; continue; }

      // Build resolved resource list
      const resources = data.resources
        .filter((r) => r.analysisCode.toUpperCase() === analysis.code.toUpperCase() && !r._error)
        .map((r) => {
          const idMap = r.resourceType === "labor" ? laborMap : r.resourceType === "material" ? matMap : eqMap;
          const resourceId = idMap[r.resourceCode.toUpperCase()];
          return resourceId ? { resourceType: r.resourceType, resourceId, quantity: r.quantity } : null;
        })
        .filter(Boolean);

      const body = JSON.stringify({
        code: analysis.code,
        name: analysis.name,
        unit: analysis.unit,
        base_quantity: analysis.baseQuantity,
        resources,
      });

      let res: Response;
      if (state.existingId) {
        res = await fetch(`/api/v1/projects/${projectId}/analysis/${state.existingId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body,
        });
        if (res.ok) overwritten++; else skipped++;
      } else {
        res = await fetch(`/api/v1/projects/${projectId}/analysis`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body,
        });
        if (res.ok) ok++; else skipped++;
      }
    }

    setImporting(false);
    setResult({ ok, skipped, overwritten });
    if (ok > 0 || overwritten > 0) onDone();
  };

  const handleClose = () => { setOpen(false); setData(null); setRowStates([]); setResult(null); };

  const checkedCount = rowStates.filter((s) => s.checked).length;
  const allChecked = data !== null && checkedCount === data.analyses.filter((a) => !a._error).length;
  const newCount = rowStates.filter((s, i) => s.checked && !s.existingId && !data?.analyses[i]._error).length;
  const overwriteCount = rowStates.filter((s, i) => s.checked && s.existingId !== null && !data?.analyses[i]._error).length;

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onDownloadTemplate} title="Download 2-sheet import template">
          <FileDown className="mr-2 h-4 w-4" />
          Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Analysis</DialogTitle>
            <DialogDescription>
              {result ? (
                `Import complete: ${result.ok} created, ${result.overwritten} overwritten, ${result.skipped} skipped.`
              ) : (
                <>
                  {data?.analyses.length} row(s) parsed.{" "}
                  <span className="text-green-600">
                    {rowStates.filter((s, i) => !s.existingId && !data?.analyses[i]._error).length} new
                  </span>
                  {" · "}
                  <span className="text-amber-600">
                    {rowStates.filter((s, i) => s.existingId !== null && !data?.analyses[i]._error).length} already exist
                  </span>
                  {" — check rows to include them."}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-auto flex-1 min-h-0 rounded border text-sm">
            <table className="w-full">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-2 w-8">
                    {!result && (
                      <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
                    )}
                  </th>
                  <th className="p-2 text-left">Code</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Unit</th>
                  <th className="p-2 text-right">Base Qty</th>
                  <th className="p-2 text-left">Resources</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.analyses ?? []).map((analysis, i) => {
                  const state = rowStates[i];
                  const res = data?.resources.filter(
                    (r) => r.analysisCode.toUpperCase() === analysis.code.toUpperCase()
                  ) ?? [];
                  const isExisting = state?.existingId !== null;
                  return (
                    <tr
                      key={i}
                      className={
                        analysis._error
                          ? "bg-destructive/10"
                          : state?.checked
                          ? isExisting
                            ? "bg-amber-50 dark:bg-amber-950/20"
                            : "bg-green-50 dark:bg-green-950/20"
                          : "opacity-50"
                      }
                    >
                      <td className="p-2">
                        {!result && !analysis._error && (
                          <input type="checkbox" checked={state?.checked ?? false} onChange={() => toggleRow(i)} />
                        )}
                      </td>
                      <td className="p-2 font-mono">{analysis.code}</td>
                      <td className="p-2">{analysis.name}</td>
                      <td className="p-2">{analysis.unit}</td>
                      <td className="p-2 text-right font-mono">{analysis.baseQuantity}</td>
                      <td className="p-2 text-muted-foreground text-xs">
                        {res.length === 0 ? "—" : res.map((r, j) => (
                          <span key={j} className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3" />
                            {r.resourceType} {r.resourceCode} ×{r.quantity}
                            {r._error && <span className="text-destructive">({r._error})</span>}
                          </span>
                        ))}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {analysis._error ? (
                          <span className="flex items-center gap-1 text-destructive text-xs">
                            <AlertCircle className="h-3 w-3" /> {analysis._error}
                          </span>
                        ) : isExisting ? (
                          <span className="flex items-center gap-1 text-amber-600 text-xs">
                            <RefreshCw className="h-3 w-3" /> Exists{state?.checked ? " (overwrite)" : " (skip)"}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> New
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? "Close" : "Cancel"}
            </Button>
            {!result && (
              <Button onClick={handleImport} disabled={importing || checkedCount === 0}>
                {importing
                  ? "Importing…"
                  : `Import ${newCount > 0 ? `${newCount} new` : ""}${newCount > 0 && overwriteCount > 0 ? " + " : ""}${overwriteCount > 0 ? `overwrite ${overwriteCount}` : ""}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
