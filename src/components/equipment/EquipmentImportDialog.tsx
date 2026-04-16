"use client";

/**
 * Equipment import dialog — reads a 2-sheet Excel file:
 *   Sheet 1 "Equipment"     : Code | Name | Unit | Total Value | Depreciation Total
 *   Sheet 2 "Sub-Resources" : Equipment Code | Type | Resource Code | Quantity
 *
 * Conflict handling:
 *   - Before showing the preview, existing equipment codes are fetched.
 *   - Rows whose code already exists are marked "Exists" (amber) and default to unchecked.
 *   - New rows are marked "New" (green) and default to checked.
 *   - Checked existing rows are overwritten via PUT; new checked rows are created via POST.
 *   - Unchecked rows are skipped entirely.
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
import { parseEquipmentFile, type EquipmentImportData } from "@/lib/excel";

type Props = {
  projectId: string;
  onDone: () => void;
  onDownloadTemplate: () => void;
};

type RowState = {
  checked: boolean;
  existingId: string | null; // null = new row
};

export function EquipmentImportDialog({ projectId, onDone, onDownloadTemplate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<EquipmentImportData | null>(null);
  const [rowStates, setRowStates] = useState<RowState[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; skipped: number; overwritten: number } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseEquipmentFile(file);
      if (parsed.equipment.length === 0) {
        toast.error("No equipment rows found in Sheet 1.");
        return;
      }

      // Fetch existing equipment codes for this project
      const res = await fetch(`/api/v1/projects/${projectId}/equipment`);
      const json = await res.json();
      const existingMap: Record<string, string> = {}; // code.toUpperCase() → id
      (json.data ?? []).forEach((eq: { code: string; id: string }) => {
        existingMap[eq.code.toUpperCase()] = eq.id;
      });

      // Build per-row state: existing rows default unchecked, new rows default checked
      const states: RowState[] = parsed.equipment.map((eq) => {
        const existingId = existingMap[eq.code.toUpperCase()] ?? null;
        return {
          checked: !eq._error && existingId === null, // new + valid → checked
          existingId,
        };
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

  const toggleRow = (i: number) => {
    setRowStates((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, checked: !s.checked } : s))
    );
  };

  const toggleAll = (checked: boolean) => {
    setRowStates((prev) =>
      prev.map((s, i) => (data?.equipment[i]._error ? s : { ...s, checked }))
    );
  };

  const handleImport = async () => {
    if (!data) return;
    setImporting(true);

    // Fetch labor + material code → id maps
    const [laborRes, matRes] = await Promise.all([
      fetch(`/api/v1/projects/${projectId}/labor`).then((r) => r.json()),
      fetch(`/api/v1/projects/${projectId}/materials`).then((r) => r.json()),
    ]);

    const laborMap: Record<string, string> = {};
    const matMap: Record<string, string> = {};
    (laborRes.data ?? []).forEach((l: { code: string; id: string }) => {
      laborMap[l.code.toUpperCase()] = l.id;
    });
    (matRes.data ?? []).forEach((m: { code: string; id: string }) => {
      matMap[m.code.toUpperCase()] = m.id;
    });

    let ok = 0;
    let skipped = 0;
    let overwritten = 0;

    for (let i = 0; i < data.equipment.length; i++) {
      const eq = data.equipment[i];
      const state = rowStates[i];

      if (!state.checked || eq._error) {
        skipped++;
        continue;
      }

      // Build sub-resources
      const subs = data.subResources.filter(
        (sr) => sr.equipmentCode.toUpperCase() === eq.code.toUpperCase() && !sr._error
      );
      const laborSubResources = subs
        .filter((sr) => sr.resourceType === "labor")
        .map((sr) => ({ resourceId: laborMap[sr.resourceCode.toUpperCase()], quantity: sr.quantity }))
        .filter((sr) => sr.resourceId);
      const materialSubResources = subs
        .filter((sr) => sr.resourceType === "material")
        .map((sr) => ({ resourceId: matMap[sr.resourceCode.toUpperCase()], quantity: sr.quantity }))
        .filter((sr) => sr.resourceId);

      const body = JSON.stringify({
        code: eq.code,
        name: eq.name,
        unit: eq.unit,
        total_value: eq.totalValue,
        depreciation_total: eq.depreciationTotal,
        laborSubResources,
        materialSubResources,
      });

      let res: Response;
      if (state.existingId) {
        // Overwrite existing via PUT
        res = await fetch(`/api/v1/projects/${projectId}/equipment/${state.existingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (res.ok) overwritten++;
        else skipped++;
      } else {
        // Create new via POST
        res = await fetch(`/api/v1/projects/${projectId}/equipment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (res.ok) ok++;
        else skipped++;
      }
    }

    setImporting(false);
    setResult({ ok, skipped, overwritten });
    if (ok > 0 || overwritten > 0) onDone();
  };

  const handleClose = () => {
    setOpen(false);
    setData(null);
    setRowStates([]);
    setResult(null);
  };

  const checkedCount = rowStates.filter((s) => s.checked).length;
  const allChecked = data !== null && checkedCount === data.equipment.filter((e) => !e._error).length;
  const newCount = rowStates.filter((s, i) => s.checked && !s.existingId && !data?.equipment[i]._error).length;
  const overwriteCount = rowStates.filter((s, i) => s.checked && s.existingId !== null && !data?.equipment[i]._error).length;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />

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
            <DialogTitle>Import Equipment</DialogTitle>
            <DialogDescription>
              {result ? (
                `Import complete: ${result.ok} created, ${result.overwritten} overwritten, ${result.skipped} skipped.`
              ) : (
                <>
                  {data?.equipment.length} row(s) parsed.{" "}
                  <span className="text-green-600">{rowStates.filter((s, i) => !rowStates[i].existingId && !data?.equipment[i]._error).length} new</span>
                  {" · "}
                  <span className="text-amber-600">{rowStates.filter((s, i) => rowStates[i].existingId !== null && !data?.equipment[i]._error).length} already exist</span>
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
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(e) => toggleAll(e.target.checked)}
                        title="Select / deselect all valid rows"
                      />
                    )}
                  </th>
                  <th className="p-2 text-left">Code</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Unit</th>
                  <th className="p-2 text-right">Total Value</th>
                  <th className="p-2 text-right">Depr. Total</th>
                  <th className="p-2 text-left">Sub-resources</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.equipment ?? []).map((eq, i) => {
                  const state = rowStates[i];
                  const subs = data?.subResources.filter(
                    (sr) => sr.equipmentCode.toUpperCase() === eq.code.toUpperCase()
                  ) ?? [];
                  const isExisting = state?.existingId !== null;
                  return (
                    <tr
                      key={i}
                      className={
                        eq._error
                          ? "bg-destructive/10"
                          : state?.checked
                          ? isExisting
                            ? "bg-amber-50 dark:bg-amber-950/20"
                            : "bg-green-50 dark:bg-green-950/20"
                          : "opacity-50"
                      }
                    >
                      <td className="p-2">
                        {!result && !eq._error && (
                          <input
                            type="checkbox"
                            checked={state?.checked ?? false}
                            onChange={() => toggleRow(i)}
                          />
                        )}
                      </td>
                      <td className="p-2 font-mono">{eq.code}</td>
                      <td className="p-2">{eq.name}</td>
                      <td className="p-2">{eq.unit}</td>
                      <td className="p-2 text-right font-mono">{eq.totalValue.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono">{eq.depreciationTotal.toLocaleString()}</td>
                      <td className="p-2 text-muted-foreground text-xs">
                        {subs.length === 0 ? "—" : subs.map((sr, j) => (
                          <span key={j} className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3" />
                            {sr.resourceType} {sr.resourceCode} ×{sr.quantity}
                            {sr._error && <span className="text-destructive">({sr._error})</span>}
                          </span>
                        ))}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {eq._error ? (
                          <span className="flex items-center gap-1 text-destructive text-xs">
                            <AlertCircle className="h-3 w-3" /> {eq._error}
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
              <Button
                onClick={handleImport}
                disabled={importing || checkedCount === 0}
              >
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
