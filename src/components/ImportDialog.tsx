"use client";

/**
 * Generic Excel/CSV import dialog.
 * Shows a file picker → parse → preview table → confirm import.
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
import { Upload, FileDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseExcelFile, type ImportRow } from "@/lib/excel";

type Column = { key: string; label: string };

type Props<T extends { _error?: string }> = {
  /** Button label, e.g. "Import Labor" */
  label: string;
  /** Columns to show in the preview table */
  columns: Column[];
  /** Called with raw rows from the file; must return validated rows with optional _error field */
  validate: (rows: ImportRow[]) => T[];
  /** Called for each valid row; should POST to the API and return true on success */
  onImportRow: (row: T) => Promise<boolean>;
  /** Called after import finishes to refresh the parent list */
  onDone: () => void;
  /** Optional: callback to download an import template */
  onDownloadTemplate?: () => void;
};

export function ImportDialog<T extends { _error?: string }>({
  label,
  columns,
  validate,
  onImportRow,
  onDone,
  onDownloadTemplate,
}: Props<T>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<T[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; skipped: number } | null>(null);

  const validRows = rows.filter((r) => !r._error);
  const invalidRows = rows.filter((r) => r._error);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await parseExcelFile(file);
      if (raw.length === 0) {
        toast.error("The file is empty or has no readable rows.");
        return;
      }
      setRows(validate(raw));
      setResult(null);
      setOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file.");
    }
    // reset so same file can be re-picked
    e.target.value = "";
  };

  const handleImport = async () => {
    setImporting(true);
    let ok = 0;
    let skipped = 0;
    for (const row of validRows) {
      const success = await onImportRow(row);
      if (success) ok++;
      else skipped++;
    }
    setImporting(false);
    setResult({ ok, skipped });
    if (ok > 0) onDone();
  };

  const handleClose = () => {
    setOpen(false);
    setRows([]);
    setResult(null);
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />

      {/* Trigger buttons */}
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

      {/* Preview dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              {result
                ? `Import complete: ${result.ok} imported, ${result.skipped} failed.`
                : `${validRows.length} valid row(s) ready to import${invalidRows.length > 0 ? `, ${invalidRows.length} row(s) with errors will be skipped` : ""}.`}
            </DialogDescription>
          </DialogHeader>

          {/* Preview table */}
          <div className="overflow-auto flex-1 min-h-0 rounded border text-sm">
            <table className="w-full">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-2 text-left w-8">#</th>
                  {columns.map((c) => (
                    <th key={c.key} className="p-2 text-left">{c.label}</th>
                  ))}
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={row._error ? "bg-destructive/10" : ""}>
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    {columns.map((c) => (
                      <td key={c.key} className="p-2 font-mono">
                        {String((row as Record<string, unknown>)[c.key] ?? "")}
                      </td>
                    ))}
                    <td className="p-2">
                      {row._error ? (
                        <span className="flex items-center gap-1 text-destructive text-xs">
                          <AlertCircle className="h-3 w-3" />
                          {row._error}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
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
                disabled={importing || validRows.length === 0}
              >
                {importing
                  ? "Importing…"
                  : `Import ${validRows.length} row${validRows.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
