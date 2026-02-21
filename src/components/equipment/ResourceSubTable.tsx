"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ResourcePicker } from "@/components/resource-picker";

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

type ResourceSubTableProps = {
  projectId: string;
  type: "labor" | "material";
  resources: SubResourceRow[];
  availableLabor: Labor[];
  availableMaterials: Material[];
  onAdd: (resourceId: string, quantity: number, type: "labor" | "material") => void;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
};

export default function ResourceSubTable({
  projectId,
  type,
  resources,
  availableLabor,
  availableMaterials,
  onAdd,
  onRemove,
  onUpdateQuantity,
}: ResourceSubTableProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editQuantityId, setEditQuantityId] = useState<string | null>(null);
  const [editQuantityValue, setEditQuantityValue] = useState("");

  const existingResourceIds = resources.map((r) => r.resourceId);
  const availableResources = type === "labor" ? availableLabor : availableMaterials;

  const handleAddResource = (resourceId: string, quantity: number) => {
    onAdd(resourceId, quantity, type);
    setPickerOpen(false);
  };

  const handleEditQuantity = (row: SubResourceRow) => {
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium capitalize">{type} Sub-Resources</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPickerOpen(true)}
          disabled={availableResources.length === existingResourceIds.length}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {type === "labor" ? "Labor" : "Material"}
        </Button>
      </div>

      {resources.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No {type} sub-resources added yet. Click &quot;Add {type === "labor" ? "Labor" : "Material"}&quot; to add one.
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Resource</TableHead>
                  <TableHead className="text-right w-[120px]">Quantity</TableHead>
                  <TableHead className="text-right w-[100px]">Rate</TableHead>
                  <TableHead className="text-right w-[100px]">Cost</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      index % 2 === 0 && "bg-muted/20",
                      "hover:bg-muted/40"
                    )}
                  >
                    <TableCell className="font-medium">{row.resourceName}</TableCell>
                    <TableCell className="text-right">
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
                            if (e.key === "Escape") {
                              setEditQuantityId(null);
                              setEditQuantityValue("");
                            }
                          }}
                          className="w-20 text-right text-sm h-8"
                          autoFocus
                          aria-label="Edit quantity"
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:underline font-mono"
                          onClick={() => handleEditQuantity(row)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleEditQuantity(row);
                            }
                          }}
                        >
                          {row.quantity}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{row.rate.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {(row.quantity * row.rate).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Actions for ${row.resourceName}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditQuantity(row)}>
                            Edit Quantity
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onRemove(row.id)}
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
        </div>
      )}

      {type === "labor" ? (
        <ResourcePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          projectId={projectId}
          existingLaborIds={existingResourceIds}
          existingMaterialIds={[]}
          onSelectLabor={(labor, quantity) => handleAddResource(labor.id, quantity)}
          onSelectMaterial={() => {}}
        />
      ) : (
        <ResourcePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          projectId={projectId}
          existingLaborIds={[]}
          existingMaterialIds={existingResourceIds}
          onSelectLabor={() => {}}
          onSelectMaterial={(material, quantity) => handleAddResource(material.id, quantity)}
        />
      )}
    </div>
  );
}
