"use client";

import { useState, useMemo, useCallback } from "react";
import { useAnalysisManager } from "@/hooks/useAnalysisManager";
import AnalysisTable from "./AnalysisTable";
import AnalysisDetail from "./AnalysisDetail";
import type { AnalysisWithCostsClient } from "@/types/analysis";
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

type AnalysisPageClientProps = {
  projectId: string;
  initialAnalyses: AnalysisWithCostsClient[];
};

export default function AnalysisPageClient({
  projectId,
  initialAnalyses,
}: AnalysisPageClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"code" | "name">("code");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<string | null>(null);

  const { analyses, isLoading, isPending, fetchAnalyses, createAnalysis, updateAnalysis, deleteAnalysis } =
    useAnalysisManager(projectId, initialAnalyses);

  const selectedAnalysis = useMemo(() => {
    if (isCreatingNew) return null;
    return analyses.find((a) => a.id === selectedId) || null;
  }, [analyses, selectedId, isCreatingNew]);

  // Prev / Next navigation
  const currentIndex = useMemo(
    () => (selectedId ? analyses.findIndex((a) => a.id === selectedId) : -1),
    [analyses, selectedId]
  );
  const prevAnalysisId = currentIndex > 0 ? analyses[currentIndex - 1].id : null;
  const nextAnalysisId = currentIndex >= 0 && currentIndex < analyses.length - 1 ? analyses[currentIndex + 1].id : null;

  const handleSearch = useCallback(
    (search: string) => {
      setSearchTerm(search);
      fetchAnalyses(search || undefined, sortBy);
    },
    [fetchAnalyses, sortBy]
  );

  const handleSortChange = useCallback(
    (sort: "code" | "name") => {
      setSortBy(sort);
      fetchAnalyses(searchTerm || undefined, sort);
    },
    [fetchAnalyses, searchTerm]
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
      base_quantity: number;
      resources?: Array<{
        resourceType: "labor" | "material" | "equipment";
        resourceId: string;
        quantity: number;
      }>;
    }) => {
      try {
        if (data.id) {
          const { id, ...updateData } = data;
          const updated = await updateAnalysis(id, updateData);
          setSelectedId(updated.id);
        } else {
          const created = await createAnalysis(data);
          setSelectedId(created.id);
          setIsCreatingNew(false);
        }
      } catch {
        // Error already handled in hook
      }
    },
    [createAnalysis, updateAnalysis]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setAnalysisToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (analysisToDelete) {
      try {
        await deleteAnalysis(analysisToDelete);
        if (selectedId === analysisToDelete) {
          setSelectedId(null);
          setIsCreatingNew(false);
        }
        setDeleteDialogOpen(false);
        setAnalysisToDelete(null);
      } catch {
        // Error already handled in hook
      }
    }
  }, [deleteAnalysis, selectedId, analysisToDelete]);

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
            <CardTitle>Analysis</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden min-h-0">
            <AnalysisTable
              data={analyses}
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
              Analysis
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-sm truncate">
              {isCreatingNew
                ? "New Analysis"
                : `${selectedAnalysis?.code ?? ""} — ${selectedAnalysis?.name ?? ""}`}
            </span>

            {!isCreatingNew && (
              <div className="ml-auto flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => prevAnalysisId && handleSelect(prevAnalysisId)}
                  disabled={prevAnalysisId === null}
                  aria-label="Previous analysis"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => nextAnalysisId && handleSelect(nextAnalysisId)}
                  disabled={nextAnalysisId === null}
                  aria-label="Next analysis"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Detail panel - fills remaining height */}
          <div className="flex-1 min-h-0">
            <AnalysisDetail
              projectId={projectId}
              analysis={selectedAnalysis}
              isCreatingNew={isCreatingNew}
              isSaving={isPending}
              onSave={handleSave}
              onCancel={handleCancel}
              onDeleteClick={selectedAnalysis ? handleDeleteClick : undefined}
            />
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this analysis? This action cannot be undone and will remove all associated resources.
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
