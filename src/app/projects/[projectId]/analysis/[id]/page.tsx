"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnalysisResourcePicker } from "@/components/analysis-resource-picker";
import { ArrowLeft, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type SubResource = {
  quantity: string;
  laborId?: string | null;
  materialId?: string | null;
  labor?: { rate: string } | null;
  material?: { rate: string } | null;
};

function getEquipmentCosts(
  totalValue: number,
  depreciationTotal: number,
  subResources: SubResource[]
): { edc: number; edp: number } {
  let edc = 0;
  for (const sr of subResources) {
    if (sr.laborId && sr.labor?.rate) {
      edc += Number(sr.quantity) * Number(sr.labor.rate);
    }
    if (sr.materialId && sr.material?.rate) {
      edc += Number(sr.quantity) * Number(sr.material.rate);
    }
  }
  const edp = totalValue / depreciationTotal;
  return { edc, edp };
}

type Resource = {
  id: string;
  resourceType: string;
  quantity: string;
  labor: { id: string; code: string; name: string; unit: string; rate: string } | null;
  material: { id: string; code: string; name: string; unit: string; rate: string } | null;
  equipment: {
    id: string;
    code: string;
    name: string;
    unit: string;
    totalValue: string;
    depreciationTotal: string;
    subResources: SubResource[];
  } | null;
};

type AnalysisDetail = {
  id: string;
  code: string;
  name: string;
  unit: string;
  baseQuantity: string;
  resources: Resource[];
  costs: {
    directCost: number;
    depreciation: number;
    totalCost: number;
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
  };
};

function getUnitCost(r: Resource): string {
  if (r.resourceType === "labor" && r.labor) {
    return `${r.labor.rate}/${r.labor.unit}`;
  }
  if (r.resourceType === "material" && r.material) {
    return `${r.material.rate}/${r.material.unit}`;
  }
  if (r.resourceType === "equipment" && r.equipment) {
    const { edc } = getEquipmentCosts(
      Number(r.equipment.totalValue),
      Number(r.equipment.depreciationTotal),
      r.equipment.subResources
    );
    return `EDC: ${edc.toFixed(2)}/${r.equipment.unit}`;
  }
  return "-";
}

function getTotalCost(r: Resource): number {
  if (r.resourceType === "labor" && r.labor) {
    return Number(r.quantity) * Number(r.labor.rate);
  }
  if (r.resourceType === "material" && r.material) {
    return Number(r.quantity) * Number(r.material.rate);
  }
  if (r.resourceType === "equipment" && r.equipment) {
    const { edc } = getEquipmentCosts(
      Number(r.equipment.totalValue),
      Number(r.equipment.depreciationTotal),
      r.equipment.subResources
    );
    return Number(r.quantity) * edc;
  }
  return 0;
}

function getDepreciation(r: Resource): number {
  if (r.resourceType === "equipment" && r.equipment) {
    const { edp } = getEquipmentCosts(
      Number(r.equipment.totalValue),
      Number(r.equipment.depreciationTotal),
      r.equipment.subResources
    );
    return Number(r.quantity) * edp;
  }
  return 0;
}

export default function AnalysisDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const analysisId = params.id as string;

  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editResourceId, setEditResourceId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");

  const fetchAnalysis = async () => {
    const res = await fetch(`/api/v1/projects/${projectId}/analysis/${analysisId}`);
    const json = await res.json();
    if (res.ok && json.data) {
      setAnalysis(json.data);
    } else {
      toast.error("Analysis not found");
    }
  };

  useEffect(() => {
    fetchAnalysis().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, analysisId]);

  const existingLaborIds = (analysis?.resources ?? [])
    .filter((r) => r.resourceType === "labor" && r.labor)
    .map((r) => r.labor!.id);
  const existingMaterialIds = (analysis?.resources ?? [])
    .filter((r) => r.resourceType === "material" && r.material)
    .map((r) => r.material!.id);
  const existingEquipmentIds = (analysis?.resources ?? [])
    .filter((r) => r.resourceType === "equipment" && r.equipment)
    .map((r) => r.equipment!.id);

  const handleAddLabor = async (labor: { id: string }, quantity: number) => {
    const res = await fetch(
      `/api/v1/projects/${projectId}/analysis/${analysisId}/resources`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_type: "labor",
          labor_id: labor.id,
          quantity,
        }),
      }
    );
    const json = await res.json();
    if (res.ok) {
      toast.success("Labor added");
      fetchAnalysis();
    } else {
      toast.error(json.error || "Failed to add");
    }
  };

  const handleAddMaterial = async (material: { id: string }, quantity: number) => {
    const res = await fetch(
      `/api/v1/projects/${projectId}/analysis/${analysisId}/resources`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_type: "material",
          material_id: material.id,
          quantity,
        }),
      }
    );
    const json = await res.json();
    if (res.ok) {
      toast.success("Material added");
      fetchAnalysis();
    } else {
      toast.error(json.error || "Failed to add");
    }
  };

  const handleAddEquipment = async (equipment: { id: string }, quantity: number) => {
    const res = await fetch(
      `/api/v1/projects/${projectId}/analysis/${analysisId}/resources`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_type: "equipment",
          equipment_id: equipment.id,
          quantity,
        }),
      }
    );
    const json = await res.json();
    if (res.ok) {
      toast.success("Equipment added");
      fetchAnalysis();
    } else {
      toast.error(json.error || "Failed to add");
    }
  };

  const handleEditQuantity = (r: Resource) => {
    setEditResourceId(r.id);
    setEditQuantity(r.quantity);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editResourceId || !editQuantity || Number(editQuantity) <= 0) return;
    const res = await fetch(
      `/api/v1/projects/${projectId}/analysis/${analysisId}/resources/${editResourceId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: Number(editQuantity) }),
      }
    );
    const json = await res.json();
    if (res.ok) {
      toast.success("Quantity updated");
      setEditDialogOpen(false);
      setEditResourceId(null);
      fetchAnalysis();
    } else {
      toast.error(json.error || "Failed to update");
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm("Remove this resource?")) return;
    const res = await fetch(
      `/api/v1/projects/${projectId}/analysis/${analysisId}/resources/${resourceId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success("Removed");
      fetchAnalysis();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to remove");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (!analysis) {
    return (
      <div className="space-y-4">
        <Link href={`/projects/${projectId}/analysis`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Analysis
          </Button>
        </Link>
        <p className="text-muted-foreground">Analysis not found.</p>
      </div>
    );
  }

  const unitLabel = analysis.unit ? `/${analysis.unit}` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}/analysis`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">
            {analysis.code} — {analysis.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Base quantity: {Number(analysis.baseQuantity).toLocaleString()} {analysis.unit}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown (real-time)</CardTitle>
          <CardDescription>
            ADC = direct cost (labor + material + equipment EDC). ADP = equipment depreciation.
            Unit rates = total / base quantity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">ADC {unitLabel}</p>
              <p className="text-2xl font-bold font-mono">
                {analysis.costs.unitRateDC.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total: {analysis.costs.directCost.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">ADP {unitLabel}</p>
              <p className="text-2xl font-bold font-mono">
                {analysis.costs.unitRateDP.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total: {analysis.costs.depreciation.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border bg-primary/10 p-4">
              <p className="text-sm font-medium text-muted-foreground">ATC {unitLabel}</p>
              <p className="text-2xl font-bold font-mono">
                {analysis.costs.unitRateTC.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total: {analysis.costs.totalCost.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Resources</CardTitle>
            <CardDescription>
              Labor, materials, and equipment. Quantities are for the base quantity.
            </CardDescription>
          </div>
          <Button onClick={() => setPickerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Resource
          </Button>
        </CardHeader>
        <CardContent>
          {analysis.resources.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No resources. Add labor, materials, or equipment to compute costs.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Depreciation</TableHead>
                    <TableHead className="w-[70px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.resources.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="capitalize">{r.resourceType}</TableCell>
                      <TableCell>
                        {r.labor ? (
                          <span><span className="font-mono">{r.labor.code}</span> {r.labor.name}</span>
                        ) : r.material ? (
                          <span><span className="font-mono">{r.material.code}</span> {r.material.name}</span>
                        ) : r.equipment ? (
                          <span><span className="font-mono">{r.equipment.code}</span> {r.equipment.name}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{r.quantity}</TableCell>
                      <TableCell className="font-mono text-sm">{getUnitCost(r)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {getTotalCost(r).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {r.resourceType === "equipment" ? getDepreciation(r).toFixed(2) : "0"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditQuantity(r)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Quantity
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(r.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AnalysisResourcePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        existingLaborIds={existingLaborIds}
        existingMaterialIds={existingMaterialIds}
        existingEquipmentIds={existingEquipmentIds}
        onSelectLabor={handleAddLabor}
        onSelectMaterial={handleAddMaterial}
        onSelectEquipment={handleAddEquipment}
      />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quantity</DialogTitle>
            <DialogDescription>Quantity used for base quantity.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="qty" className="text-right">Quantity</Label>
              <Input
                id="qty"
                type="number"
                step="0.01"
                min="0.001"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editQuantity || Number(editQuantity) <= 0}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
