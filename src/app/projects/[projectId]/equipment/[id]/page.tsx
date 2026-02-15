"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
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
import { ResourcePicker } from "@/components/resource-picker";
import { ArrowLeft, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type SubResource = {
  id: string;
  resourceType: string;
  quantity: string;
  labor: { id: string; code: string; name: string; unit: string; rate: string } | null;
  material: { id: string; code: string; name: string; unit: string; rate: string } | null;
};

type EquipmentDetail = {
  id: string;
  code: string;
  name: string;
  unit: string;
  totalValue: string;
  depreciationTotal: string;
  subResources: SubResource[];
  costs: { edc: number; edp: number; etc: number };
};

export default function EquipmentDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const equipmentId = params.id as string;

  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editResourceId, setEditResourceId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");

  const fetchEquipment = async () => {
    const res = await fetch(`/api/v1/projects/${projectId}/equipment/${equipmentId}`);
    const json = await res.json();
    if (res.ok && json.data) {
      setEquipment(json.data);
    } else {
      toast.error("Equipment not found");
    }
  };

  useEffect(() => {
    fetchEquipment().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, equipmentId]);

  const existingLaborIds = (equipment?.subResources ?? [])
    .filter((r) => r.resourceType === "labor" && r.labor)
    .map((r) => r.labor!.id);
  const existingMaterialIds = (equipment?.subResources ?? [])
    .filter((r) => r.resourceType === "material" && r.material)
    .map((r) => r.material!.id);

  const handleAddLabor = async (labor: { id: string }, quantity: number) => {
    const res = await fetch(
      `/api/v1/projects/${projectId}/equipment/${equipmentId}/resources`,
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
      fetchEquipment();
    } else {
      toast.error(json.error || "Failed to add");
    }
  };

  const handleAddMaterial = async (material: { id: string }, quantity: number) => {
    const res = await fetch(
      `/api/v1/projects/${projectId}/equipment/${equipmentId}/resources`,
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
      fetchEquipment();
    } else {
      toast.error(json.error || "Failed to add");
    }
  };

  const handleEditQuantity = (sr: SubResource) => {
    setEditResourceId(sr.id);
    setEditQuantity(sr.quantity);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editResourceId || !editQuantity || Number(editQuantity) <= 0) return;
    const res = await fetch(
      `/api/v1/projects/${projectId}/equipment/${equipmentId}/resources/${editResourceId}`,
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
      fetchEquipment();
    } else {
      toast.error(json.error || "Failed to update");
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm("Remove this sub-resource?")) return;
    const res = await fetch(
      `/api/v1/projects/${projectId}/equipment/${equipmentId}/resources/${resourceId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success("Removed");
      fetchEquipment();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to remove");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (!equipment) {
    return (
      <div className="space-y-4">
        <Link href={`/projects/${projectId}/equipment`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Equipment
          </Button>
        </Link>
        <p className="text-muted-foreground">Equipment not found.</p>
      </div>
    );
  }

  const unitLabel = equipment.unit ? `/${equipment.unit}` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}/equipment`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">
            {equipment.code} — {equipment.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Total value: {Number(equipment.totalValue).toLocaleString()} • Depreciation total:{" "}
            {Number(equipment.depreciationTotal).toLocaleString()} {equipment.unit}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown (per {equipment.unit})</CardTitle>
          <CardDescription>
            EDC = operator labor + fuel. EDP = depreciation. ETC = EDC + EDP. Per .cursorrules Rule #1,
            EDC is included in Labor+Material totals; only EDP is added separately at project level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">EDC {unitLabel}</p>
              <p className="text-2xl font-bold font-mono">
                {equipment.costs.edc.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Direct cost (labor + fuel)</p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">EDP {unitLabel}</p>
              <p className="text-2xl font-bold font-mono">
                {equipment.costs.edp.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Depreciation</p>
            </div>
            <div className="rounded-lg border bg-primary/10 p-4">
              <p className="text-sm font-medium text-muted-foreground">ETC {unitLabel}</p>
              <p className="text-2xl font-bold font-mono">
                {equipment.costs.etc.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Total cost</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sub-Resources</CardTitle>
            <CardDescription>
              Labor and materials consumed per equipment unit. EDC = sum of (qty × rate).
            </CardDescription>
          </div>
          <Button onClick={() => setPickerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Resource
          </Button>
        </CardHeader>
        <CardContent>
          {equipment.subResources.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No sub-resources. Add operator labor and fuel to compute EDC.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Cost {unitLabel}</TableHead>
                    <TableHead className="w-[70px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.subResources.map((sr) => {
                    const resource = sr.labor ?? sr.material;
                    const rate = resource ? Number(resource.rate) : 0;
                    const qty = Number(sr.quantity);
                    const cost = qty * rate;
                    return (
                      <TableRow key={sr.id}>
                        <TableCell className="capitalize">{sr.resourceType}</TableCell>
                        <TableCell>
                          {resource ? (
                            <span>
                              <span className="font-mono">{resource.code}</span> {resource.name}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{sr.quantity}</TableCell>
                        <TableCell className="text-right font-mono">
                          {resource ? `${resource.rate}/${resource.unit}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {cost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditQuantity(sr)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Quantity
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(sr.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ResourcePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        existingLaborIds={existingLaborIds}
        existingMaterialIds={existingMaterialIds}
        onSelectLabor={handleAddLabor}
        onSelectMaterial={handleAddMaterial}
      />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quantity</DialogTitle>
            <DialogDescription>Quantity consumed per equipment unit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="qty" className="text-right">
                Quantity
              </Label>
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
