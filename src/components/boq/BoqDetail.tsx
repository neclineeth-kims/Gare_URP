"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { BoqAnalysisPicker } from "@/components/boq-analysis-picker";
import BoqCostSummary from "./BoqCostSummary";
import type { BoqItemWithCosts } from "@/types/boq";

type AnalysisRow = {
  id: string;
  analysisId: string;
  coefficient: number;
  analysis: {
    id: string;
    code: string;
    name: string;
    unit: string;
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
  };
};

type BoqDetailProps = {
  projectId: string;
  boqItem: BoqItemWithCosts | null;
  isCreatingNew?: boolean;
  isSaving: boolean;
  onSave: (data: {
    id?: string;
    code: string;
    name: string;
    unit: string;
    quantity: number;
    analyses?: { analysisId: string; coefficient: number }[];
  }) => void;
  onCancel: () => void;
  onDeleteClick?: (id: string) => void;
};

export default function BoqDetail({
  projectId,
  boqItem,
  isCreatingNew = false,
  isSaving,
  onSave,
  onCancel,
  onDeleteClick,
}: BoqDetailProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("cum");
  const [quantity, setQuantity] = useState("");
  const [analysisRows, setAnalysisRows] = useState<AnalysisRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setErrors({});
    if (boqItem) {
      setCode(boqItem.code);
      setName(boqItem.name);
      setUnit(boqItem.unit || "cum");
      setQuantity(boqItem.quantity.toString());
      setAnalysisRows(
        boqItem.boqAnalyses.map((ba) => ({
          id: ba.id,
          analysisId: ba.analysisId,
          coefficient: ba.coefficient,
          analysis: {
            id: ba.analysis.id,
            code: ba.analysis.code,
            name: ba.analysis.name,
            unit: ba.analysis.unit,
            unitRateDC: ba.analysis.unitRateDC,
            unitRateDP: ba.analysis.unitRateDP,
            unitRateTC: ba.analysis.unitRateTC,
          },
        }))
      );
    } else {
      setCode("");
      setName("");
      setUnit("cum");
      setQuantity("1000000");
      setAnalysisRows([]);
      if (isCreatingNew && codeInputRef.current) {
        setTimeout(() => codeInputRef.current?.focus(), 100);
      }
    }
  }, [boqItem, isCreatingNew]);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!code.trim()) newErrors.code = "Code is required";
    if (!name.trim()) newErrors.name = "Name is required";
    if (!unit.trim()) newErrors.unit = "Unit is required";
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) newErrors.quantity = "Quantity must be a positive number";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSave({
      id: boqItem?.id,
      code: code.trim(),
      name: name.trim(),
      unit: unit.trim(),
      quantity: qty,
      analyses: analysisRows.map((r) => ({ analysisId: r.analysisId, coefficient: r.coefficient })),
    });
  };

  const handleSelectAnalysis = (
    analysis: { id: string; code: string; name: string; unit: string; costs: { unitRateDC: number; unitRateDP: number; unitRateTC: number } },
    coefficient: number
  ) => {
    setAnalysisRows((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        analysisId: analysis.id,
        coefficient,
        analysis: {
          id: analysis.id,
          code: analysis.code,
          name: analysis.name,
          unit: analysis.unit,
          unitRateDC: analysis.costs.unitRateDC,
          unitRateDP: analysis.costs.unitRateDP,
          unitRateTC: analysis.costs.unitRateTC,
        },
      },
    ]);
    setPickerOpen(false);
  };

  const handleRemoveAnalysis = (id: string) => {
    setAnalysisRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateCoefficient = (id: string, coefficient: number) => {
    setAnalysisRows((prev) => prev.map((r) => (r.id === id ? { ...r, coefficient } : r)));
  };

  const existingAnalysisIds = analysisRows.map((r) => r.analysisId);
  const analysesForCost = analysisRows.map((r) => ({
    coefficient: r.coefficient,
    analysis: { unitRateDC: r.analysis.unitRateDC, unitRateDP: r.analysis.unitRateDP, unitRateTC: r.analysis.unitRateTC },
  }));
  const quantityNum = parseFloat(quantity) || 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── MAIN CONTENT: two columns ── */}
      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
      {/* ── LEFT COLUMN: Item Info + Cost Summary ── */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">BoQ Item Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="boq-code">Code *</Label>
              <Input
                id="boq-code"
                ref={codeInputRef}
                value={code}
                onChange={(e) => { setCode(e.target.value); if (errors.code) setErrors((p) => ({ ...p, code: "" })); }}
                placeholder="e.g. BOQ001"
                maxLength={6}
                className={errors.code ? "border-destructive" : ""}
              />
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="boq-name">Name *</Label>
              <Input
                id="boq-name"
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: "" })); }}
                placeholder="e.g. Excavation in Bulk"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="boq-quantity">Quantity *</Label>
                <Input
                  id="boq-quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => { setQuantity(e.target.value); if (errors.quantity) setErrors((p) => ({ ...p, quantity: "" })); }}
                  placeholder="e.g. 1000000"
                  className={errors.quantity ? "border-destructive" : ""}
                />
                {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="boq-unit">Unit *</Label>
                <Input
                  id="boq-unit"
                  value={unit}
                  onChange={(e) => { setUnit(e.target.value); if (errors.unit) setErrors((p) => ({ ...p, unit: "" })); }}
                  placeholder="e.g. cum"
                  className={errors.unit ? "border-destructive" : ""}
                />
                {errors.unit && <p className="text-xs text-destructive">{errors.unit}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <BoqCostSummary quantity={quantityNum} analyses={analysesForCost} />

        {/* Delete button (secondary action) */}
        {boqItem && onDeleteClick && (
          <Button
            variant="outline"
            onClick={() => onDeleteClick(boqItem.id)}
            disabled={isSaving}
            className="w-full text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete BoQ Item
          </Button>
        )}
      </div>

      {/* ── RIGHT COLUMN: Analyses Linked ── */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-4">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Analyses Included</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                aria-label="Add analysis"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Analysis
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {analysisRows.length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No analyses linked. Click &quot;Add Analysis&quot; to link analysis items with coefficients.
                </p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2.5 font-medium">Code</th>
                      <th className="text-left p-2.5 font-medium">Name</th>
                      <th className="text-right p-2.5 font-medium w-[90px]">Unit Rate TC</th>
                      <th className="text-right p-2.5 font-medium w-[90px]">Coefficient</th>
                      <th className="text-right p-2.5 font-medium w-[90px]">Extended TC</th>
                      <th className="w-[50px] p-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {analysisRows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`border-b transition-colors ${index % 2 === 0 ? "bg-muted/20" : ""} hover:bg-muted/40`}
                      >
                        <td className="p-2.5 font-mono font-medium">{row.analysis.code}</td>
                        <td className="p-2.5">
                          <div>{row.analysis.name}</div>
                          <div className="text-xs text-muted-foreground">
                            DC: {row.analysis.unitRateDC.toFixed(3)} · DP: {row.analysis.unitRateDP.toFixed(3)}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono">{row.analysis.unitRateTC.toFixed(3)}</td>
                        <td className="p-2.5 text-right">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={row.coefficient}
                            onChange={(e) => handleUpdateCoefficient(row.id, parseFloat(e.target.value) || 0)}
                            className="h-7 w-20 text-right font-mono ml-auto"
                            aria-label={`Coefficient for ${row.analysis.code}`}
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-medium">
                          {(row.analysis.unitRateTC * row.coefficient).toFixed(3)}
                        </td>
                        <td className="p-2.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAnalysis(row.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label={`Remove ${row.analysis.code}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {analysisRows.length > 0 && (
                    <tfoot>
                      <tr className="border-t bg-muted/30 font-semibold">
                        <td colSpan={4} className="p-2.5 text-right text-sm">Total Unit Rate TC</td>
                        <td className="p-2.5 text-right font-mono">
                          {analysisRows.reduce((sum, r) => sum + r.analysis.unitRateTC * r.coefficient, 0).toFixed(3)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      </div>{/* end two-column row */}

      <BoqAnalysisPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        existingAnalysisIds={existingAnalysisIds}
        onSelect={handleSelectAnalysis}
      />

      {/* ── STICKY FOOTER: primary actions ── */}
      <div className="flex-shrink-0 border-t bg-card px-0 pt-3 pb-1 flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground">
          Changes are saved only when you click &quot;{boqItem ? "Update BoQ Item" : "Create BoQ Item"}&quot;
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving…" : boqItem ? "Update BoQ Item" : "Create BoQ Item"}
          </Button>
        </div>
      </div>
    </div>
  );
}
