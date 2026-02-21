"use client";

import { useState, useMemo, useCallback } from "react";
import { useEquipmentManager } from "@/hooks/useEquipmentManager";
import EquipmentTable from "./EquipmentTable";
import EquipmentDetail from "./EquipmentDetail";
import type { EquipmentWithCostsClient } from "@/types/equipment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type EquipmentPageClientProps = {
  projectId: string;
  initialEquipment: EquipmentWithCostsClient[];
};

export default function EquipmentPageClient({
  projectId,
  initialEquipment,
}: EquipmentPageClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"code" | "name">("code");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);

  const { equipment, isLoading, isPending, fetchEquipment, createEquipment, updateEquipment, deleteEquipment } =
    useEquipmentManager(projectId, initialEquipment);

  const selectedEquipment = useMemo(() => {
    if (isCreatingNew) {
      return null; // Return null to show create form
    }
    return equipment.find((eq) => eq.id === selectedId) || null;
  }, [equipment, selectedId, isCreatingNew]);

  const handleSearch = useCallback(
    (search: string) => {
      setSearchTerm(search);
      fetchEquipment(search || undefined, sortBy);
    },
    [fetchEquipment, sortBy]
  );

  const handleSortChange = useCallback(
    (sort: "code" | "name") => {
      setSortBy(sort);
      fetchEquipment(searchTerm || undefined, sort);
    },
    [fetchEquipment, searchTerm]
  );

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    setIsCreatingNew(false);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedId(null);
    setIsCreatingNew(true);
  }, []);

  const handleSave = useCallback(
    async (data: {
      id?: string;
      code: string;
      name: string;
      unit: string;
      total_value: number;
      depreciation_total: number;
      laborSubResources?: Array<{ resourceId: string; quantity: number }>;
      materialSubResources?: Array<{ resourceId: string; quantity: number }>;
    }) => {
      try {
        if (data.id) {
          const { id, ...updateData } = data;
          const updated = await updateEquipment(id, updateData);
          setSelectedId(updated.id);
        } else {
          const created = await createEquipment(data);
          setSelectedId(created.id);
          setIsCreatingNew(false);
        }
        } catch {
          // Error already handled in hook
        }
    },
    [createEquipment, updateEquipment]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setEquipmentToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (equipmentToDelete) {
      try {
        await deleteEquipment(equipmentToDelete);
        if (selectedId === equipmentToDelete) {
          setSelectedId(null);
        }
        setDeleteDialogOpen(false);
        setEquipmentToDelete(null);
      } catch {
        // Error already handled in hook
      }
    }
  }, [deleteEquipment, selectedId, equipmentToDelete]);

  const handleCancel = useCallback(() => {
    setIsCreatingNew(false);
    setSelectedId(null);
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-6 md:flex-row">
      <Card className="flex-[3] flex flex-col overflow-hidden min-h-0">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Equipment</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden min-h-0">
          <EquipmentTable
            data={equipment}
            selectedId={selectedId}
            isLoading={isLoading}
            onSelect={handleSelect}
            onSearchChange={handleSearch}
            onSortChange={handleSortChange}
            onAdd={handleAdd}
            onDelete={handleDeleteClick}
          />
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this equipment? This action cannot be undone and will remove all associated sub-resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="flex-[2] flex flex-col overflow-hidden min-h-0">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Equipment Details</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto min-h-0">
          <EquipmentDetail
            projectId={projectId}
            equipment={selectedEquipment}
            isCreatingNew={isCreatingNew}
            isSaving={isPending}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
