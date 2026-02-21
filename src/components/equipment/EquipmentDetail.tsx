"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { EquipmentWithCostsClient } from "@/types/equipment";
import ResourceSubTable from "./ResourceSubTable";
import CostSummary from "./CostSummary";

type Labor = { id: string; code: string; name: string; unit: string; rate: string };
type Material = { id: string; code: string; name: string; unit: string; rate: string };

type SubResourceRow = {
  id: string;
  resourceId: string;
  resourceName: string;
  quantity: number;
  rate: number;
  type: "labor" | "material";
};

type EquipmentDetailProps = {
  projectId: string;
  equipment: EquipmentWithCostsClient | null;
  isCreatingNew?: boolean;
  isSaving: boolean;
  onSave: (data: {
    id?: string;
    code: string;
    name: string;
    unit: string;
    total_value: number;
    depreciation_total: number;
    laborSubResources?: Array<{ resourceId: string; quantity: number }>;
    materialSubResources?: Array<{ resourceId: string; quantity: number }>;
  }) => void;
  onCancel: () => void;
};

export default function EquipmentDetail({
  projectId,
  equipment,
  isCreatingNew = false,
  isSaving,
  onSave,
  onCancel,
}: EquipmentDetailProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("hr");
  const [totalValue, setTotalValue] = useState("");
  const [depreciationTotal, setDepreciationTotal] = useState("");
  const [laborSubResources, setLaborSubResources] = useState<SubResourceRow[]>([]);
  const [materialSubResources, setMaterialSubResources] = useState<SubResourceRow[]>([]);
  const [availableLabor, setAvailableLabor] = useState<Labor[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);

  // Fetch available resources
  useEffect(() => {
    if (projectId) {
      Promise.all([
        fetch(`/api/v1/projects/${projectId}/labor`).then((r) => r.json()),
        fetch(`/api/v1/projects/${projectId}/materials`).then((r) => r.json()),
      ]).then(([labRes, matRes]) => {
        setAvailableLabor(
          (labRes.data || []).map((l: Labor & { rate: unknown }) => ({
            ...l,
            rate: String(l.rate ?? ""),
          }))
        );
        setAvailableMaterials(
          (matRes.data || []).map((m: Material & { rate: unknown }) => ({
            ...m,
            rate: String(m.rate ?? ""),
          }))
        );
      });
    }
  }, [projectId]);

  // Initialize form from equipment
  useEffect(() => {
    if (equipment) {
      setCode(equipment.code);
      setName(equipment.name);
      setUnit(equipment.unit || "hr");
      setTotalValue(equipment.totalValue.toString());
      setDepreciationTotal(equipment.depreciationTotal.toString());
      
      // Transform sub-resources
      const laborRows: SubResourceRow[] = equipment.subResources
        .filter((sr) => sr.resourceType === "labor" && sr.labor)
        .map((sr) => ({
          id: sr.id,
          resourceId: sr.labor!.id,
          resourceName: `${sr.labor!.code} - ${sr.labor!.name}`,
          quantity: Number(sr.quantity),
          rate: Number(sr.labor!.rate),
          type: "labor" as const,
        }));
      
      const materialRows: SubResourceRow[] = equipment.subResources
        .filter((sr) => sr.resourceType === "material" && sr.material)
        .map((sr) => ({
          id: sr.id,
          resourceId: sr.material!.id,
          resourceName: `${sr.material!.code} - ${sr.material!.name}`,
          quantity: Number(sr.quantity),
          rate: Number(sr.material!.rate),
          type: "material" as const,
        }));
      
      setLaborSubResources(laborRows);
      setMaterialSubResources(materialRows);
    } else {
      // Reset form for new equipment
      setCode("");
      setName("");
      setUnit("hr");
      setTotalValue("");
      setDepreciationTotal("");
      setLaborSubResources([]);
      setMaterialSubResources([]);
    }
  }, [equipment]);

  const handleAddSubResource = (
    resourceId: string,
    quantity: number,
    type: "labor" | "material"
  ) => {
    const resources = type === "labor" ? availableLabor : availableMaterials;
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) return;

    const newRow: SubResourceRow = {
      id: `temp-${Date.now()}-${Math.random()}`,
      resourceId: resource.id,
      resourceName: `${resource.code} - ${resource.name}`,
      quantity,
      rate: parseFloat(resource.rate),
      type,
    };

    if (type === "labor") {
      setLaborSubResources([...laborSubResources, newRow]);
    } else {
      setMaterialSubResources([...materialSubResources, newRow]);
    }
  };

  const handleRemoveSubResource = (id: string, type: "labor" | "material") => {
    if (type === "labor") {
      setLaborSubResources(laborSubResources.filter((r) => r.id !== id));
    } else {
      setMaterialSubResources(materialSubResources.filter((r) => r.id !== id));
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number, type: "labor" | "material") => {
    if (type === "labor") {
      setLaborSubResources(
        laborSubResources.map((r) => (r.id === id ? { ...r, quantity } : r))
      );
    } else {
      setMaterialSubResources(
        materialSubResources.map((r) => (r.id === id ? { ...r, quantity } : r))
      );
    }
  };

  const handleSave = () => {
    if (!code || !name || !unit || !totalValue || !depreciationTotal) {
      alert("Please fill in all required fields");
      return;
    }

    const totalValueNum = parseFloat(totalValue);
    const depreciationTotalNum = parseFloat(depreciationTotal);

    if (isNaN(totalValueNum) || totalValueNum <= 0) {
      alert("Total Value must be a positive number");
      return;
    }

    if (isNaN(depreciationTotalNum) || depreciationTotalNum <= 0) {
      alert("Depreciation Total must be a positive number");
      return;
    }

    onSave({
      id: equipment?.id,
      code: code.trim(),
      name: name.trim(),
      unit: unit.trim(),
      total_value: totalValueNum,
      depreciation_total: depreciationTotalNum,
      laborSubResources: laborSubResources.map((r) => ({
        resourceId: r.resourceId,
        quantity: r.quantity,
      })),
      materialSubResources: materialSubResources.map((r) => ({
        resourceId: r.resourceId,
        quantity: r.quantity,
      })),
    });
  };

  const totalValueNum = parseFloat(totalValue) || 0;
  const depreciationTotalNum = parseFloat(depreciationTotal) || 0;

  return (
    <div className="space-y-6">
      {equipment === null && !isCreatingNew && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-foreground mb-1">
            No equipment selected
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Select an equipment item from the table above to view or edit details, or click &quot;Add Equipment&quot; to create a new one.
          </p>
        </div>
      )}

      {(equipment !== null || isCreatingNew) && (
        <>
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Equipment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="EQ001"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Equipment Name"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="hr"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalValue">Total Value *</Label>
                  <Input
                    id="totalValue"
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                    placeholder="0"
                    aria-required="true"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="depreciationTotal">Depreciation Total *</Label>
                  <Input
                    id="depreciationTotal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={depreciationTotal}
                    onChange={(e) => setDepreciationTotal(e.target.value)}
                    placeholder="0"
                    aria-required="true"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Labor Sub-Resources</h3>
              <ResourceSubTable
                projectId={projectId}
                type="labor"
                resources={laborSubResources}
                availableLabor={availableLabor}
                availableMaterials={[]}
                onAdd={handleAddSubResource}
                onRemove={(id) => handleRemoveSubResource(id, "labor")}
                onUpdateQuantity={(id, qty) => handleUpdateQuantity(id, qty, "labor")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Material Sub-Resources</h3>
              <ResourceSubTable
                projectId={projectId}
                type="material"
                resources={materialSubResources}
                availableLabor={[]}
                availableMaterials={availableMaterials}
                onAdd={handleAddSubResource}
                onRemove={(id) => handleRemoveSubResource(id, "material")}
                onUpdateQuantity={(id, qty) => handleUpdateQuantity(id, qty, "material")}
              />
            </CardContent>
          </Card>

          <CostSummary
            totalValue={totalValueNum}
            depreciationTotal={depreciationTotalNum}
            laborSubResources={laborSubResources}
            materialSubResources={materialSubResources}
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} aria-label={equipment ? "Update equipment" : "Create equipment"}>
              {isSaving ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : equipment ? (
                "Update Equipment"
              ) : (
                "Create Equipment"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
