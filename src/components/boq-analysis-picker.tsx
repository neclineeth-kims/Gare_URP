"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AnalysisItem = {
  id: string;
  code: string;
  name: string;
  unit: string;
  baseQuantity: string;
  costs: {
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
  };
};

type BoqAnalysisPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingAnalysisIds: string[];
  onSelect: (analysis: AnalysisItem, coefficient: number) => void;
};

export function BoqAnalysisPicker({
  open,
  onOpenChange,
  projectId,
  existingAnalysisIds,
  onSelect,
}: BoqAnalysisPickerProps) {
  const [analysis, setAnalysis] = useState<AnalysisItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [coefficient, setCoefficient] = useState("0.5");

  useEffect(() => {
    if (open && projectId) {
      fetch(`/api/v1/projects/${projectId}/analysis`)
        .then((r) => r.json())
        .then((json) => {
          if (json.data) setAnalysis(json.data);
        });
      setSearch("");
      setSelectedId(null);
      setCoefficient("0.5");
    }
  }, [open, projectId]);

  const filtered = analysis.filter(
    (a) =>
      !existingAnalysisIds.includes(a.id) &&
      (search === "" ||
        a.code.toLowerCase().includes(search.toLowerCase()) ||
        a.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = () => {
    const item = analysis.find((a) => a.id === selectedId);
    if (item && coefficient && Number(coefficient) > 0) {
      onSelect(item, Number(coefficient));
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Analysis</DialogTitle>
          <DialogDescription>
            Link an analysis item with a coefficient (e.g. 0.5 for 50%). BoQ unit rate = Σ(coefficient × analysis unit rate).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Input
            placeholder="Search analysis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto rounded-md border">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {existingAnalysisIds.length > 0 && search === ""
                  ? "All analysis items already linked."
                  : "No analysis items found."}
              </p>
            ) : (
              <div className="divide-y">
                {filtered.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-accent ${
                      selectedId === a.id ? "bg-accent" : ""
                    }`}
                  >
                    <span>
                      <span className="font-mono font-medium">{a.code}</span> — {a.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ATC: {a.costs.unitRateTC.toFixed(3)}/{a.unit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div>
              <Label className="text-sm font-medium">Coefficient</Label>
              <Input
                type="number"
                step="0.01"
                min="0.001"
                value={coefficient}
                onChange={(e) => setCoefficient(e.target.value)}
                className="mt-1"
                placeholder="e.g. 0.5"
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!selectedId || !coefficient || Number(coefficient) <= 0}
              className="mt-6"
            >
              Add Analysis
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
