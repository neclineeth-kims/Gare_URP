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
  const [description, setDescription] = useState("");
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
      setDescription(boqItem.description || "");
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
      setDescription("");
      setUnit("cum");
      setQuantity("1000000");
      setAnalysisRows([]);
      if (isCreatingNew && codeInputRef.current) {
        setTimeout(() => codeInputRef.current?.focus(), 100);
      }
    }
  }, [boqItem, isCreatingNew]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!code.trim()) newErrors.code = "Code is required";
    if (!name.trim()) newErrors.name = "Name is required";
    if (!unit.trim()) newErrors.unit = "Unit is required";
    const baseQuantityNum = parseFloat(quantity);
    if (isNaN(baseQuantityNum) || baseQuantityNum <= 0) {
      newErrors.quantity = "Quantity must be a positive number";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave({
      id: boqItem?.id,
      code: code.trim(),
      name: name.trim(),
      unit: unit.trim(),
      quantity: baseQuantityNum,
      analyses: analysisRows.map((r) => ({
        analysisId: r.analysisId,
        coefficient: r.coefficient,
      })),
    });
  };

  const handleSelectAnalysis = (
    analysis: { id: string; code: string; name: string; unit: string; costs: { unitRateDC: number; unitRateDP: number; unitRateTC: number } },
    coefficient: number
  ) => {
    const newRow: AnalysisRow = {
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
    };
    setAnalysisRows((prev) => [...prev, newRow]);
    setPickerOpen(false);
  };

  const handleRemoveAnalysis = (id: string) => {
    setAnalysisRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateCoefficient = (id: string, coefficient: number) => {
    setAnalysisRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, coefficient } : r))
    );
  };

  const existingAnalysisIds = analysisRows.map((r) => r.analysisId);

  const analysesForCost = analysisRows.map((r) => ({
    coefficient: r.coefficient,
    analysis: {
      unitRateDC: r.analysis.unitRateDC,
      unitRateDP: r.analysis.unitRateDP,
      unitRateTC: r.analysis.unitRateTC,
    },
  }));

  const quantityNum = parseFloat(quantity) || 0;

  return (
    <div className="space-y-6">
      {boqItem === null && !isCreatingNew ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Select a BoQ item or click Add BoQ Item to create a new one.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">BoQ Item Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="boq-code">Code</Label>
                  <Input
                    id="boq-code"
                    ref={codeInputRef}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (errors.code) setErrors((p) => ({ ...p, code: "" }));
                    }}
                    placeholder="e.g. 9001"
                    aria-invalid={!!errors.code}
                    aria-describedby={errors.code ? "boq-code-error" : undefined}
                  />
                  {errors.code && (
                    <p
                      id="boq-code-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {errors.code}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boq-name">Name</Label>
                  <Input
                    id="boq-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                    }}
                    placeholder="e.g. Excavation in Bulk"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "boq-name-error" : undefined}
                  />
                  {errors.name && (
                    <p
                      id="boq-name-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="boq-description">Description (optional)</Label>
                <Input
                  id="boq-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="boq-quantity">Quantity</Label>
                  <Input
                    id="boq-quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      if (errors.quantity) setErrors((p) => ({ ...p, quantity: "" }));
                    }}
                    placeholder="e.g. 1000000"
                    aria-invalid={!!errors.quantity}
                    aria-describedby={errors.quantity ? "boq-quantity-error" : undefined}
                  />
                  {errors.quantity && (
                    <p
                      id="boq-quantity-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {errors.quantity}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boq-unit">Unit</Label>
                  <Input
                    id="boq-unit"
                    value={unit}
                    onChange={(e) => {
                      setUnit(e.target.value);
                      if (errors.unit) setErrors((p) => ({ ...p, unit: "" }));
                    }}
                    placeholder="e.g. cum"
                    aria-invalid={!!errors.unit}
                    aria-describedby={errors.unit ? "boq-unit-error" : undefined}
                  />
                  {errors.unit && (
                    <p
                      id="boq-unit-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {errors.unit}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Analyses Included</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPickerOpen(true)}
                aria-label="Add analysis"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Analysis
              </Button>
            </CardHeader>
            <CardContent>
              {analysisRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No analyses linked. Add analysis items with coefficients to
                  compute BoQ unit rates.
                </p>
              ) : (
                <div className="space-y-3">
                  {analysisRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[2fr_1fr_auto] md:items-center"
                    >
                      <div>
                        <span className="font-mono font-medium">
                          {row.analysis.code}
                        </span>{" "}
                        — {row.analysis.name}
                        <p className="text-xs text-muted-foreground mt-1">
                          Unit rate: {row.analysis.unitRateTC.toFixed(3)}/
                          {row.analysis.unit} (DC: {row.analysis.unitRateDC.toFixed(3)}, DP:{" "}
                          {row.analysis.unitRateDP.toFixed(3)})
                        </p>
                      </div>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={row.coefficient}
                        onChange={(e) =>
                          handleUpdateCoefficient(
                            row.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-9 text-right font-mono"
                        aria-label={`Coefficient for ${row.analysis.code}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAnalysis(row.id)}
                        className="text-destructive hover:text-destructive h-9 w-9 shrink-0"
                        aria-label={`Remove ${row.analysis.code}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <BoqCostSummary quantity={quantityNum} analyses={analysesForCost} />

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            {boqItem && onDeleteClick && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDeleteClick(boqItem.id)}
                disabled={isSaving}
                className="ml-auto"
              >
                Delete
              </Button>
            )}
          </div>
        </form>
      )}

      <BoqAnalysisPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        existingAnalysisIds={existingAnalysisIds}
        onSelect={handleSelectAnalysis}
      />
    </div>
  );
}
