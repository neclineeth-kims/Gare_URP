"use client";

/**
 * Generic Excel/CSV import dialog with conflict detection.
 *
 * Conflict handling:
 *   - Pass `fetchExisting` to enable pre-check: fetches existing records by code.
 *   - New rows default to checked (green), existing rows default to unchecked (amber).
 *   - Checked existing rows are passed to `onUpdateRow` (PUT); new checked rows go to `onImportRow` (POST).
 *   - Unchecked rows are skipped.
 *   - Without `fetchExisting`, behaviour is identical to the original (all valid rows imported).
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
import { Upload, FileDown, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { parseExcelFile, type ImportRow } from "@/lib/excel";

type Column = { key: string; label: string };

type RowState = {
  checked: boolean;
  existingId: string | null;
};

type Props<T extends { code: string; _error?: string }> = {
  /** Button label, e.g. "Import" */
  label: string;
  /** Columns to show in the preview table */
  columns: Column[];
  /** Called with raw rows from the file; must return validated rows with optional _error field */
  validate: (rows: ImportRow[]) => T[];
  /** Called for each new (non-existing) checked row; POST to API; return true on success */
  onImportRow: (row: T) => Promise<boolean>;
  /** Called for each existing checked row; PUT to API; return true on success */
  onUpdateRow?: (row: T, existingId: string) => Promise<boolean>;
  /**
   * Optional: fetches existing records so conflicts can be detected.
   * Returns an array of { code, id } objects.
   */
  fetchExisting?: () => Promise<{ code: string; id: string }[]>;
  /** Called after import finishes to refresh the parent list */
  onDone: () => void;
  /** Optional: callback to download an import template */
  onDownloadTemplate?: () => void;
};

export function ImportDialog<T extends { code: string; _error?: string }>({
  label,
  columns,
  validate,
  onImportRow,
  onUpdateRow,
  fetchExisting,
  onDone,
  onDownloadTemplate,
}: Props<T>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<T[]>([]);
  const [rowStates, setRowStates] = useState<RowState[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; overwritten: number; skipped: number } | null>(null);

  const conflictMode = !!fetchExisting;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await parseExcelFile(file);
      if (raw.length === 0) {
        toast.error("The file is empty or has no readable rows.");
        return;
      }
      const validated = validate(raw);

      let existingMap: Record<string, string> = {};
      if (fetchExisting) {
        const existing = await fetchExisting();
        existing.forEach(({ code, id }) => {
          existingMap[code.toUpperCase()] = id;
        });
      }

      const states: RowState[] = validated.map((row) => {
        const existingId = existingMap[row.code.toUpperCase()] ?? null;
        return {
          checked: !row._error && existingId === null,
          existingId,
        };
      });

      setRows(validated);
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
      prev.map((s, i) => (rows[i]._error ? s : { ...s, checked }))
    );
  };

  const handleImport = async () => {
    setImporting(true);
    let ok = 0;
    let overwritten = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const state = rowStates[i];

      if (!state.checked || row._error) {
        skipped++;
        continue;
      }

      if (state.existingId && onUpdateRow) {
        const success = await onUpdateRow(row, state.existingId);
        if (success) overwritten++;
        else skipped++;
      } else {
        const success = await onImportRow(row);
        if (success) ok++;
        else skipped++;
      }
    }

    setImporting(false);
    setResult({ ok, overwritten, skipped });
    if (ok > 0 || overwritten > 0) onDone();
  };

  const handleClose = () => {
    setOpen(false);
    setRows([]);
    setRowStates([]);
    setResult(null);
  };

  const checkedCount = rowStates.filter((s) => s.checked).length;
  const validCount = rows.filter((r) => !r._error).length;
  const allChecked = validCount > 0 && checkedCount === validCount;
  const newCount = rowStates.filter((s, i) => s.checked && !s.existingId && !rows[i]._error).length;
  const overwriteCount = rowStates.filter((s, i) => s.checked && s.existingId !== null && !rows[i]._error).length;
  const existingTotal = rowStates.filter((s, i) => s.existingId !== null && !rows[i]._error).length;

  const importButtonLabel = (() => {
    if (importing) return "Importing…";
    if (!conflictMode) return `Import ${checkedCount} row${checkedCount !== 1 ? "s" : ""}`;
    const parts: string[] = [];
    if (newCount > 0) parts.push(`${newCount} new`);
    if (overwriteCount > 0) parts.push(`overwrite ${overwriteCount}`);
    return parts.length > 0 ? `Import ${parts.join(" + ")}` : "Import";
  })();

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
        {onDownloadTemplate && (
          <Button variant="outline" size="sm" onClick={onDownloadTemplate} title="Download import template">
            <FileDown className="mr-2 h-4 w-4" />
            Template
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              {result ? (
                `Import complete: ${result.ok} created, ${result.overwritten} overwritten, ${result.skipped} skipped.`
              ) : conflictMode ? (
                <>
                  {rows.length} row(s) parsed.{" "}
                  <span className="text-green-600">{validCount - existingTotal} new</span>
                  {" · "}
                  <span className="text-amber-600">{existingTotal} already exist</span>
                  {" — check rows to include them."}
                </>
              ) : (
                `${validCount} valid row(s) ready to import${rows.length - validCount > 0 ? `, ${rows.length - validCount} row(s) with errors will be skipped` : ""}.`
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-auto flex-1 min-h-0 rounded border text-sm">
            <table className="w-full">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-2 w-8">
                    {!result && conflictMode && (
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(e) => toggleAll(e.target.checked)}
                        title="Select / deselect all valid rows"
                      />
                    )}
                    {!result && !conflictMode && <span className="text-muted-foreground">#</span>}
                  </th>
                  {columns.map((c) => (
                    <th key={c.key} className="p-2 text-left">{c.label}</th>
                  ))}
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const state = rowStates[i];
                  const isExisting = state?.existingId !== null;
                  const rowBg = row._error
                    ? "bg-destructive/10"
                    : conflictMode
                    ? state?.checked
                      ? isExisting
                        ? "bg-amber-50 dark:bg-amber-950/20"
                        : "bg-green-50 dark:bg-green-950/20"
                      : "opacity-50"
                    : "";

                  return (
                    <tr key={i} className={rowBg}>
                      <td className="p-2">
                        {conflictMode && !result && !row._error ? (
                          <input
                            type="checkbox"
                            checked={state?.checked ?? false}
                            onChange={() => toggleRow(i)}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">{i + 1}</span>
                        )}
                      </td>
                      {columns.map((c) => (
                        <td key={c.key} className="p-2 font-mono">
                          {String((row as Record<string, unknown>)[c.key] ?? "")}
                        </td>
                      ))}
                      <td className="p-2 whitespace-nowrap">
                        {row._error ? (
                          <span className="flex items-center gap-1 text-destructive text-xs">
                            <AlertCircle className="h-3 w-3" />
                            {row._error}
                          </span>
                        ) : isExisting ? (
                          <span className="flex items-center gap-1 text-amber-600 text-xs">
                            <RefreshCw className="h-3 w-3" />
                            Exists{state?.checked ? " (overwrite)" : " (skip)"}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            {conflictMode ? "New" : "OK"}
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
                {importButtonLabel}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
