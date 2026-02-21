"use client";

import { useState, useMemo, useCallback } from "react";
import { useAnalysisManager } from "@/hooks/useAnalysisManager";
import AnalysisTable from "./AnalysisTable";
import AnalysisDetail from "./AnalysisDetail";
import type { AnalysisWithCostsClient } from "@/types/analysis";
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
    if (isCreatingNew) {
      return null; // Return null to show create form
    }
    return analyses.find((a) => a.id === selectedId) || null;
  }, [analyses, selectedId, isCreatingNew]);

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

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-6 md:flex-row">
      <Card className="flex-[3] flex flex-col overflow-hidden min-h-0">
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

      <Card className="flex-[2] flex flex-col overflow-hidden min-h-0 md:max-h-[calc(100vh-8rem)]">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Analysis Details</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto min-h-0">
          <AnalysisDetail
            projectId={projectId}
            analysis={selectedAnalysis}
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
