"use client";

import { useState, useMemo, useCallback } from "react";
import { useBoqManager } from "@/hooks/useBoqManager";
import BoqTable from "./BoqTable";
import BoqDetail from "./BoqDetail";
import type { BoqItemWithCosts } from "@/types/boq";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    if (isCreatingNew) return null;
    return boqItems.find((b) => b.id === selectedId) || null;
  }, [boqItems, selectedId, isCreatingNew]);

  // Prev / Next navigation
  const currentIndex = useMemo(
    () => (selectedId ? boqItems.findIndex((b) => b.id === selectedId) : -1),
    [boqItems, selectedId]
  );
  const prevBoqId = currentIndex > 0 ? boqItems[currentIndex - 1].id : null;
  const nextBoqId = currentIndex >= 0 && currentIndex < boqItems.length - 1 ? boqItems[currentIndex + 1].id : null;

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
          setIsCreatingNew(false);
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

  const showDetail = selectedId !== null || isCreatingNew;

  return (
    <>
      {!showDetail ? (
        /* ─── LIST VIEW ─────────────────────────────────────────── */
        <Card className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 8rem)" }}>
          <CardHeader className="flex-shrink-0">
            <CardTitle>Bill of Quantities</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden min-h-0">
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
      ) : (
        /* ─── DETAIL VIEW ────────────────────────────────────────── */
        <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
          {/* Breadcrumb bar */}
          <div className="flex items-center gap-2 pb-3 mb-4 border-b flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="gap-1 pl-1 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Bill of Quantities
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-sm truncate">
              {isCreatingNew
                ? "New BoQ Item"
                : `${selectedBoqItem?.code ?? ""} — ${selectedBoqItem?.name ?? ""}`}
            </span>

            {!isCreatingNew && (
              <div className="ml-auto flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => prevBoqId && handleSelect(prevBoqId)}
                  disabled={prevBoqId === null}
                  aria-label="Previous BoQ item"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => nextBoqId && handleSelect(nextBoqId)}
                  disabled={nextBoqId === null}
                  aria-label="Next BoQ item"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Detail panel - fills remaining height */}
          <div className="flex-1 min-h-0">
            <BoqDetail
              projectId={projectId}
              boqItem={selectedBoqItem}
              isCreatingNew={isCreatingNew}
              isSaving={isPending}
              onSave={handleSave}
              onCancel={handleCancel}
              onDeleteClick={selectedBoqItem ? handleDeleteClick : undefined}
            />
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete BoQ Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this BoQ item? This action cannot be undone and will remove all linked analyses.
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
    </>
  );
}
