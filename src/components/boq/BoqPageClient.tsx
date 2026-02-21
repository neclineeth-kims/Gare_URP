"use client";

import { useState, useMemo, useCallback } from "react";
import { useBoqManager } from "@/hooks/useBoqManager";
import BoqTable from "./BoqTable";
import BoqDetail from "./BoqDetail";
import type { BoqItemWithCosts } from "@/types/boq";
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

type BoqPageClientProps = {
  projectId: string;
  initialBoqItems: BoqItemWithCosts[];
};

export default function BoqPageClient({
  projectId,
  initialBoqItems,
}: BoqPageClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"code" | "name">("code");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boqToDelete, setBoqToDelete] = useState<string | null>(null);

  const {
    boqItems,
    isLoading,
    isPending,
    fetchBoqItems,
    createBoqItem,
    updateBoqItem,
    deleteBoqItem,
  } = useBoqManager(projectId, initialBoqItems);

  const selectedBoqItem = useMemo(() => {
    if (isCreatingNew) {
      return null;
    }
    return boqItems.find((b) => b.id === selectedId) || null;
  }, [boqItems, selectedId, isCreatingNew]);

  const handleSearch = useCallback(
    (search: string) => {
      setSearchTerm(search);
      fetchBoqItems(search || undefined, sortBy);
    },
    [fetchBoqItems, sortBy]
  );

  const handleSortChange = useCallback(
    (sort: "code" | "name") => {
      setSortBy(sort);
      fetchBoqItems(searchTerm || undefined, sort);
    },
    [fetchBoqItems, searchTerm]
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
      quantity: number;
      analyses?: { analysisId: string; coefficient: number }[];
    }) => {
      try {
        if (data.id) {
          const { id, ...updateData } = data;
          const updated = await updateBoqItem(id, updateData);
          setSelectedId(updated.id);
        } else {
          const created = await createBoqItem({
            code: data.code,
            name: data.name,
            unit: data.unit,
            quantity: data.quantity,
            analyses: data.analyses,
          });
          setSelectedId(created.id);
          setIsCreatingNew(false);
        }
      } catch {
        // Error already handled in hook
      }
    },
    [createBoqItem, updateBoqItem]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setBoqToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (boqToDelete) {
      try {
        await deleteBoqItem(boqToDelete);
        if (selectedId === boqToDelete) {
          setSelectedId(null);
        }
        setDeleteDialogOpen(false);
        setBoqToDelete(null);
      } catch {
        // Error already handled in hook
      }
    }
  }, [deleteBoqItem, selectedId, boqToDelete]);

  const handleCancel = useCallback(() => {
    setIsCreatingNew(false);
    setSelectedId(null);
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-6 md:flex-row">
      <Card className="flex-[3] flex min-h-[320px] flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Bill of Quantities</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden">
          <BoqTable
            data={boqItems}
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
            <AlertDialogTitle>Delete BoQ Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this BoQ item? This action cannot
              be undone and will remove all linked analyses.
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

      <Card className="flex-[2] flex min-h-[280px] flex-col overflow-hidden md:max-h-[calc(100vh-8rem)]">
        <CardHeader className="flex-shrink-0">
          <CardTitle>BoQ Details</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          <BoqDetail
            projectId={projectId}
            boqItem={selectedBoqItem}
            isCreatingNew={isCreatingNew}
            isSaving={isPending}
            onSave={handleSave}
            onCancel={handleCancel}
            onDeleteClick={handleDeleteClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}
