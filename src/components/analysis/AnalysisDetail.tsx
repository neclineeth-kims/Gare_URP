"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import type { AnalysisWithCostsClient } from "@/types/analysis";
import AnalysisCostSummary from "./AnalysisCostSummary";
import { AnalysisResourcePicker } from "@/components/analysis-resource-picker";
import { cn } from "@/lib/utils";

type Labor = { id: string; code: string; name: string; unit: string; rate: number };
type Material = { id: string; code: string; name: string; unit: string; rate: number };
type SubResourceForCost = { quantity: number; labor?: { rate: number } | null; material?: { rate: number } | null };
type Equipment = {
  id: string;
  code: string;
  name: string;
  unit: string;
  totalValue: number;
  depreciationTotal: number;
  subResources?: SubResourceForCost[];
};

type ResourceRow = {
  id: string;
  resourceType: "labor" | "material" | "equipment";
  resourceId: string;
  resourceName: string;
  quantity: number;
  rate?: number;
  labor?: Labor | null;
  material?: Material | null;
  equipment?: Equipment | null;
};

type AnalysisDetailProps = {
  projectId: string;
  analysis: AnalysisWithCostsClient | null;
  isCreatingNew?: boolean;
  isSaving: boolean;
  onSave: (data: {
    id?: string;
    code: string;
    name: string;
    unit: string;
    base_quantity: number;
    resources?: Array<{
      resourceType: "labor" | "material" | "equipment";
      resourceId: string;
      quantity: number;
    }>;
  }) => void;
  onCancel: () => void;
  onDeleteClick?: (id: string) => void;
};

export default function AnalysisDetail({
  projectId,
  analysis,
  isCreatingNew = false,
  isSaving,
  onSave,
  onCancel,
  onDeleteClick,
}: AnalysisDetailProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("cum");
  const [baseQuantity, setBaseQuantity] = useState("");
  const [laborResources, setLaborResources] = useState<ResourceRow[]>([]);
  const [materialResources, setMaterialResources] = useState<ResourceRow[]>([]);
  const [equipmentResources, setEquipmentResources] = useState<ResourceRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<{
    code?: string;
    name?: string;
    unit?: string;
    baseQuantity?: string;
  }>({});
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setErrors({});
    if (analysis) {
      setCode(analysis.code);
      setName(analysis.name);
      setUnit(analysis.unit || "cum");
      setBaseQuantity(analysis.baseQuantity.toString());

      setLaborResources(
        analysis.resources
          .filter((r) => r.resourceType === "labor" && r.labor)
          .map((r) => ({
            id: r.id,
            resourceType: "labor" as const,
            resourceId: r.labor!.id,
            resourceName: `${r.labor!.code} - ${r.labor!.name}`,
            quantity: r.quantity,
            rate: r.labor!.rate,
            labor: { id: r.labor!.id, code: r.labor!.code, name: r.labor!.name, unit: r.labor!.unit, rate: r.labor!.rate },
            material: null,
            equipment: null,
          }))
      );

      setMaterialResources(
        analysis.resources
          .filter((r) => r.resourceType === "material" && r.material)
          .map((r) => ({
            id: r.id,
            resourceType: "material" as const,
            resourceId: r.material!.id,
            resourceName: `${r.material!.code} - ${r.material!.name}`,
            quantity: r.quantity,
            rate: r.material!.rate,
            labor: null,
            material: { id: r.material!.id, code: r.material!.code, name: r.material!.name, unit: r.material!.unit, rate: r.material!.rate },
            equipment: null,
          }))
      );

      setEquipmentResources(
        analysis.resources
          .filter((r) => r.resourceType === "equipment" && r.equipment)
          .map((r) => ({
            id: r.id,
            resourceType: "equipment" as const,
            resourceId: r.equipment!.id,
            resourceName: `${r.equipment!.code} - ${r.equipment!.name}`,
            quantity: r.quantity,
            labor: null,
            material: null,
            equipment: {
              id: r.equipment!.id,
              code: r.equipment!.code,
              name: r.equipment!.name,
              unit: r.equipment!.unit,
              totalValue: r.equipment!.totalValue,
              depreciationTotal: r.equipment!.depreciationTotal,
              subResources: (r.equipment!.subResources ?? []).map((sr) => ({
                quantity: typeof sr.quantity === "number" ? sr.quantity : parseFloat(String(sr.quantity)),
                labor: sr.labor ? { rate: typeof sr.labor.rate === "number" ? sr.labor.rate : parseFloat(String(sr.labor.rate)) } : null,
                material: sr.material ? { rate: typeof sr.material.rate === "number" ? sr.material.rate : parseFloat(String(sr.material.rate)) } : null,
              })),
            },
          }))
      );
    } else {
      setCode("");
      setName("");
      setUnit("cum");
      setBaseQuantity("1000");
      setLaborResources([]);
      setMaterialResources([]);
      setEquipmentResources([]);
      if (isCreatingNew && codeInputRef.current) {
        setTimeout(() => codeInputRef.current?.focus(), 100);
      }
    }
  }, [analysis, isCreatingNew]);

  const handleSelectLabor = (labor: { id: string; code: string; name: string; unit: string; rate: string | number }, quantity: number) => {
    const rateNum = typeof labor.rate === "string" ? Number(labor.rate) : labor.rate;
    setLaborResources((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        resourceType: "labor",
        resourceId: labor.id,
        resourceName: `${labor.code} - ${labor.name}`,
        quantity,
        rate: rateNum,
        labor: { ...labor, rate: rateNum },
        material: null,
        equipment: null,
      },
    ]);
    setPickerOpen(false);
  };

  const handleSelectMaterial = (material: { id: string; code: string; name: string; unit: string; rate: string | number }, quantity: number) => {
    const rateNum = typeof material.rate === "string" ? Number(material.rate) : material.rate;
    setMaterialResources((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        resourceType: "material",
        resourceId: material.id,
        resourceName: `${material.code} - ${material.name}`,
        quantity,
        rate: rateNum,
        labor: null,
        material: { ...material, rate: rateNum },
        equipment: null,
      },
    ]);
    setPickerOpen(false);
  };

  const handleSelectEquipment = (equipment: { id: string; code: string; name: string; unit: string; etc: string }, quantity: number) => {
    fetch(`/api/v1/projects/${projectId}/equipment/${equipment.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const eq = json.data;
          const subResources: SubResourceForCost[] = (eq.subResources ?? []).map(
            (sr: { quantity: number | string; labor?: { rate: number | string } | null; material?: { rate: number | string } | null }) => ({
              quantity: typeof sr.quantity === "number" ? sr.quantity : parseFloat(String(sr.quantity)),
              labor: sr.labor ? { rate: typeof sr.labor.rate === "number" ? sr.labor.rate : parseFloat(String(sr.labor.rate)) } : null,
              material: sr.material ? { rate: typeof sr.material.rate === "number" ? sr.material.rate : parseFloat(String(sr.material.rate)) } : null,
            })
          );
          setEquipmentResources((prev) => [
            ...prev,
            {
              id: `temp-${Date.now()}-${Math.random()}`,
              resourceType: "equipment",
              resourceId: equipment.id,
              resourceName: `${eq.code} - ${eq.name}`,
              quantity,
              labor: null,
              material: null,
              equipment: {
                id: eq.id,
                code: eq.code,
                name: eq.name,
                unit: eq.unit,
                totalValue: typeof eq.totalValue === "string" ? parseFloat(eq.totalValue) : eq.totalValue,
                depreciationTotal: typeof eq.depreciationTotal === "string" ? parseFloat(eq.depreciationTotal) : eq.depreciationTotal,
                subResources,
              },
            },
          ]);
          setPickerOpen(false);
        }
      })
      .catch((err) => console.error("Failed to fetch equipment details:", err));
  };

  const handleRemoveResource = (id: string, type: "labor" | "material" | "equipment") => {
    if (type === "labor") setLaborResources((p) => p.filter((r) => r.id !== id));
    else if (type === "material") setMaterialResources((p) => p.filter((r) => r.id !== id));
    else setEquipmentResources((p) => p.filter((r) => r.id !== id));
  };

  const handleUpdateQuantity = (id: string, quantity: number, type: "labor" | "material" | "equipment") => {
    if (type === "labor") setLaborResources((p) => p.map((r) => (r.id === id ? { ...r, quantity } : r)));
    else if (type === "material") setMaterialResources((p) => p.map((r) => (r.id === id ? { ...r, quantity } : r)));
    else setEquipmentResources((p) => p.map((r) => (r.id === id ? { ...r, quantity } : r)));
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!code.trim()) newErrors.code = "Code is required";
    if (!name.trim()) newErrors.name = "Name is required";
    if (!unit.trim()) newErrors.unit = "Unit is required";
    if (!baseQuantity) {
      newErrors.baseQuantity = "Base quantity is required";
    } else {
      const n = parseFloat(baseQuantity);
      if (isNaN(n) || n <= 0) newErrors.baseQuantity = "Base quantity must be a positive number";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    onSave({
      id: analysis?.id,
      code: code.trim(),
      name: name.trim(),
      unit: unit.trim(),
      base_quantity: parseFloat(baseQuantity),
      resources: [
        ...laborResources.map((r) => ({ resourceType: "labor" as const, resourceId: r.resourceId, quantity: r.quantity })),
        ...materialResources.map((r) => ({ resourceType: "material" as const, resourceId: r.resourceId, quantity: r.quantity })),
        ...equipmentResources.map((r) => ({ resourceType: "equipment" as const, resourceId: r.resourceId, quantity: r.quantity })),
      ],
    });
  };

  const baseQuantityNum = parseFloat(baseQuantity) || 1000;
  const allResourcesForCost = [
    ...laborResources.map((r) => ({ resourceType: "labor" as const, quantity: r.quantity, labor: r.labor ? { rate: r.labor.rate } : null, material: null, equipment: null })),
    ...materialResources.map((r) => ({ resourceType: "material" as const, quantity: r.quantity, labor: null, material: r.material ? { rate: r.material.rate } : null, equipment: null })),
    ...equipmentResources.map((r) => ({
      resourceType: "equipment" as const,
      quantity: r.quantity,
      labor: null,
      material: null,
      equipment: r.equipment ? { totalValue: r.equipment.totalValue, depreciationTotal: r.equipment.depreciationTotal, subResources: r.equipment.subResources ?? [] } : null,
    })),
  ];

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      {/* ── LEFT COLUMN: Info + Cost Summary + Actions ── */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Analysis Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code *</Label>
              <Input
                ref={codeInputRef}
                id="code"
                value={code}
                onChange={(e) => { setCode(e.target.value); if (errors.code) setErrors((p) => ({ ...p, code: undefined })); }}
                placeholder="AN001"
                maxLength={6}
                className={errors.code ? "border-destructive" : ""}
              />
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Analysis Name"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit *</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => { setUnit(e.target.value); if (errors.unit) setErrors((p) => ({ ...p, unit: undefined })); }}
                  placeholder="cum"
                  className={errors.unit ? "border-destructive" : ""}
                />
                {errors.unit && <p className="text-xs text-destructive">{errors.unit}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="baseQuantity">Base Qty *</Label>
                <Input
                  id="baseQuantity"
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={baseQuantity}
                  onChange={(e) => { setBaseQuantity(e.target.value); if (errors.baseQuantity) setErrors((p) => ({ ...p, baseQuantity: undefined })); }}
                  placeholder="1000"
                  className={errors.baseQuantity ? "border-destructive" : ""}
                />
                {errors.baseQuantity && <p className="text-xs text-destructive">{errors.baseQuantity}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <AnalysisCostSummary baseQuantity={baseQuantityNum} resources={allResourcesForCost} />

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <><svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Saving...</>
            ) : analysis ? "Update Analysis" : "Create Analysis"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSaving} className="w-full">
            Cancel
          </Button>
          {analysis && onDeleteClick && (
            <Button
              variant="destructive"
              onClick={() => onDeleteClick(analysis.id)}
              disabled={isSaving}
              className="w-full mt-2"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Analysis
            </Button>
          )}
        </div>
      </div>

      {/* ── RIGHT COLUMN: Resource Tables ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto pb-6">
        {/* Labor Resources */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Labor Resources</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} aria-label="Add labor resource">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Labor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResourceTable
              resources={laborResources}
              type="labor"
              onRemove={(id) => handleRemoveResource(id, "labor")}
              onUpdateQuantity={(id, qty) => handleUpdateQuantity(id, qty, "labor")}
            />
          </CardContent>
        </Card>

        {/* Material Resources */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Material Resources</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} aria-label="Add material resource">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Material
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResourceTable
              resources={materialResources}
              type="material"
              onRemove={(id) => handleRemoveResource(id, "material")}
              onUpdateQuantity={(id, qty) => handleUpdateQuantity(id, qty, "material")}
            />
          </CardContent>
        </Card>

        {/* Equipment Resources */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Equipment Resources</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} aria-label="Add equipment resource">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Equipment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResourceTable
              resources={equipmentResources}
              type="equipment"
              onRemove={(id) => handleRemoveResource(id, "equipment")}
              onUpdateQuantity={(id, qty) => handleUpdateQuantity(id, qty, "equipment")}
            />
          </CardContent>
        </Card>
      </div>

      <AnalysisResourcePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        existingLaborIds={laborResources.map((r) => r.resourceId)}
        existingMaterialIds={materialResources.map((r) => r.resourceId)}
        existingEquipmentIds={equipmentResources.map((r) => r.resourceId)}
        onSelectLabor={handleSelectLabor}
        onSelectMaterial={handleSelectMaterial}
        onSelectEquipment={handleSelectEquipment}
      />
    </div>
  );
}

// ─── ResourceTable sub-component ─────────────────────────────────────────────
function ResourceTable({
  resources,
  type,
  onRemove,
  onUpdateQuantity,
}: {
  resources: ResourceRow[];
  type: "labor" | "material" | "equipment";
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}) {
  const [editQuantityId, setEditQuantityId] = useState<string | null>(null);
  const [editQuantityValue, setEditQuantityValue] = useState("");

  const handleEditQuantity = (row: ResourceRow) => {
    setEditQuantityId(row.id);
    setEditQuantityValue(row.quantity.toString());
  };

  const handleSaveQuantity = () => {
    if (editQuantityId && editQuantityValue) {
      const qty = parseFloat(editQuantityValue);
      if (!isNaN(qty) && qty > 0) {
        onUpdateQuantity(editQuantityId, qty);
        setEditQuantityId(null);
        setEditQuantityValue("");
      }
    }
  };

  if (resources.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          No {type} resources. Click &quot;Add {type.charAt(0).toUpperCase() + type.slice(1)}&quot; to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2.5 font-medium">Resource</th>
              <th className="text-right p-2.5 font-medium w-[110px]">Quantity</th>
              {type !== "equipment" && (
                <>
                  <th className="text-right p-2.5 font-medium w-[90px]">Rate</th>
                  <th className="text-right p-2.5 font-medium w-[90px]">Cost</th>
                </>
              )}
              {type === "equipment" && (
                <th className="text-right p-2.5 font-medium w-[180px]">Depr. / Value</th>
              )}
              <th className="w-[50px] p-2.5" />
            </tr>
          </thead>
          <tbody>
            {resources.map((row, index) => (
              <tr
                key={row.id}
                className={cn("border-b transition-colors", index % 2 === 0 && "bg-muted/20", "hover:bg-muted/40")}
              >
                <td className="p-2.5 font-medium">{row.resourceName}</td>
                <td className="p-2.5 text-right">
                  {editQuantityId === row.id ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editQuantityValue}
                      onChange={(e) => setEditQuantityValue(e.target.value)}
                      onBlur={handleSaveQuantity}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveQuantity();
                        if (e.key === "Escape") { setEditQuantityId(null); setEditQuantityValue(""); }
                      }}
                      className="w-20 text-right text-sm h-7 ml-auto"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="cursor-pointer hover:underline font-mono"
                      onClick={() => handleEditQuantity(row)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleEditQuantity(row); } }}
                    >
                      {row.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  )}
                </td>
                {type !== "equipment" && row.rate !== undefined && (
                  <>
                    <td className="p-2.5 text-right font-mono">{Number(row.rate).toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono font-medium">{(Number(row.quantity) * Number(row.rate)).toFixed(2)}</td>
                  </>
                )}
                {type === "equipment" && row.equipment && (
                  <td className="p-2.5 text-right text-xs text-muted-foreground">
                    <div className="flex flex-col items-end gap-0.5">
                      <span>Depr: {row.equipment.depreciationTotal.toLocaleString()}</span>
                      <span>Val: {row.equipment.totalValue.toLocaleString()}</span>
                    </div>
                  </td>
                )}
                <td className="p-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(row.id)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Remove ${row.resourceName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
