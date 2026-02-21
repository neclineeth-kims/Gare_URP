"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { AnalysisWithCostsClient } from "@/types/analysis";

export function useAnalysisManager(projectId: string, initialAnalyses: AnalysisWithCostsClient[]) {
  const [analyses, setAnalyses] = useState<AnalysisWithCostsClient[]>(initialAnalyses);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchAnalyses = useCallback(
    async (search?: string, sort?: "code" | "name") => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (sort) params.set("sort", sort);
        const url = `/api/v1/projects/${projectId}/analysis${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url);
        const json = await res.json();
        if (res.ok && json.data) {
          // Transform API response to match AnalysisWithCostsClient type
          const transformed: AnalysisWithCostsClient[] = json.data.map((a: {
            id: string;
            code: string;
            name: string;
            unit: string;
            baseQuantity: string | number;
            createdAt: string;
            updatedAt: string;
            costs?: {
              directCost: number;
              depreciation: number;
              totalCost: number;
              unitRateDC: number;
              unitRateDP: number;
              unitRateTC: number;
            };
            resources?: Array<{
              id: string;
              resourceType: string;
              quantity: string | number;
              createdAt: string;
              labor?: { rate: string | number; createdAt: string; updatedAt: string } | null;
              material?: { rate: string | number; createdAt: string; updatedAt: string } | null;
              equipment?: {
                totalValue: string | number;
                depreciationTotal: string | number;
                createdAt: string;
                updatedAt: string;
                subResources?: Array<{
                  quantity: string | number;
                  createdAt: string;
                  labor?: { rate: string | number; createdAt: string; updatedAt: string } | null;
                  material?: { rate: string | number; createdAt: string; updatedAt: string } | null;
                }>;
              } | null;
            }>;
          }) => ({
            ...a,
            baseQuantity: typeof a.baseQuantity === "string" ? parseFloat(a.baseQuantity) : a.baseQuantity,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
            costs: a.costs || {
              directCost: 0,
              depreciation: 0,
              totalCost: 0,
              unitRateDC: 0,
              unitRateDP: 0,
              unitRateTC: 0,
            },
            resources: (a.resources || []).map((r) => ({
              ...r,
              quantity: typeof r.quantity === "string" ? parseFloat(r.quantity) : r.quantity,
              createdAt: r.createdAt,
              labor: r.labor
                ? {
                    ...r.labor,
                    rate: typeof r.labor.rate === "string" ? parseFloat(r.labor.rate) : r.labor.rate,
                    createdAt: r.labor.createdAt,
                    updatedAt: r.labor.updatedAt,
                  }
                : null,
              material: r.material
                ? {
                    ...r.material,
                    rate: typeof r.material.rate === "string" ? parseFloat(r.material.rate) : r.material.rate,
                    createdAt: r.material.createdAt,
                    updatedAt: r.material.updatedAt,
                  }
                : null,
              equipment: r.equipment
                ? {
                    ...r.equipment,
                    totalValue: typeof r.equipment.totalValue === "string" ? parseFloat(r.equipment.totalValue) : r.equipment.totalValue,
                    depreciationTotal: typeof r.equipment.depreciationTotal === "string" ? parseFloat(r.equipment.depreciationTotal) : r.equipment.depreciationTotal,
                    createdAt: r.equipment.createdAt,
                    updatedAt: r.equipment.updatedAt,
                    subResources: (r.equipment.subResources || []).map((sr) => ({
                      ...sr,
                      quantity: typeof sr.quantity === "string" ? parseFloat(sr.quantity) : sr.quantity,
                      createdAt: sr.createdAt,
                      labor: sr.labor
                        ? {
                            ...sr.labor,
                            rate: typeof sr.labor.rate === "string" ? parseFloat(sr.labor.rate) : sr.labor.rate,
                            createdAt: sr.labor.createdAt,
                            updatedAt: sr.labor.updatedAt,
                          }
                        : null,
                      material: sr.material
                        ? {
                            ...sr.material,
                            rate: typeof sr.material.rate === "string" ? parseFloat(sr.material.rate) : sr.material.rate,
                            createdAt: sr.material.createdAt,
                            updatedAt: sr.material.updatedAt,
                          }
                        : null,
                    })),
                  }
                : null,
            })),
          }));
          setAnalyses(transformed);
        } else {
          console.error("Failed to fetch analyses:", json.error);
          toast.error("Failed to fetch analyses");
        }
      } catch (error) {
        console.error("Error fetching analyses:", error);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  const createAnalysis = useCallback(
    async (data: {
      code: string;
      name: string;
      unit: string;
      base_quantity: number;
      resources?: Array<{
        resourceType: "labor" | "material" | "equipment";
        resourceId: string;
        quantity: number;
      }>;
    }): Promise<AnalysisWithCostsClient> => {
      return new Promise((resolve, reject) => {
        startTransition(async () => {
          try {
            const res = await fetch(`/api/v1/projects/${projectId}/analysis`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const json = await res.json();
            if (res.ok && json.data) {
              const transformed: AnalysisWithCostsClient = {
                ...json.data,
                baseQuantity: typeof json.data.baseQuantity === "string" ? parseFloat(json.data.baseQuantity) : json.data.baseQuantity,
                createdAt: json.data.createdAt,
                updatedAt: json.data.updatedAt,
                costs: json.data.costs || {
                  directCost: 0,
                  depreciation: 0,
                  totalCost: 0,
                  unitRateDC: 0,
                  unitRateDP: 0,
                  unitRateTC: 0,
                },
                resources: (json.data.resources || []).map((r: {
                  quantity: string | number;
                  createdAt: string;
                  labor?: { rate: string | number; createdAt: string; updatedAt: string } | null;
                  material?: { rate: string | number; createdAt: string; updatedAt: string } | null;
                  equipment?: {
                    totalValue: string | number;
                    depreciationTotal: string | number;
                    createdAt: string;
                    updatedAt: string;
                    subResources?: Array<{
                      quantity: string | number;
                      createdAt: string;
                      labor?: { rate: string | number; createdAt: string; updatedAt: string } | null;
                      material?: { rate: string | number; createdAt: string; updatedAt: string } | null;
                    }>;
                  } | null;
                }) => ({
                  ...r,
                  quantity: typeof r.quantity === "string" ? parseFloat(r.quantity) : r.quantity,
                  createdAt: r.createdAt,
                  labor: r.labor
                    ? {
                        ...r.labor,
                        rate: typeof r.labor.rate === "string" ? parseFloat(r.labor.rate) : r.labor.rate,
                        createdAt: r.labor.createdAt,
                        updatedAt: r.labor.updatedAt,
                      }
                    : null,
                  material: r.material
                    ? {
                        ...r.material,
                        rate: typeof r.material.rate === "string" ? parseFloat(r.material.rate) : r.material.rate,
                        createdAt: r.material.createdAt,
                        updatedAt: r.material.updatedAt,
                      }
                    : null,
                  equipment: r.equipment
                    ? {
                        ...r.equipment,
                        totalValue: typeof r.equipment.totalValue === "string" ? parseFloat(r.equipment.totalValue) : r.equipment.totalValue,
                        depreciationTotal: typeof r.equipment.depreciationTotal === "string" ? parseFloat(r.equipment.depreciationTotal) : r.equipment.depreciationTotal,
                        createdAt: r.equipment.createdAt,
                        updatedAt: r.equipment.updatedAt,
                        subResources: (r.equipment.subResources || []).map((sr) => ({
                          ...sr,
                          quantity: typeof sr.quantity === "string" ? parseFloat(sr.quantity) : sr.quantity,
                          createdAt: sr.createdAt,
                          labor: sr.labor
                            ? {
                                ...sr.labor,
                                rate: typeof sr.labor.rate === "string" ? parseFloat(sr.labor.rate) : sr.labor.rate,
                                createdAt: sr.labor.createdAt,
                                updatedAt: sr.labor.updatedAt,
                              }
                            : null,
                          material: sr.material
                            ? {
                                ...sr.material,
                                rate: typeof sr.material.rate === "string" ? parseFloat(sr.material.rate) : sr.material.rate,
                                createdAt: sr.material.createdAt,
                                updatedAt: sr.material.updatedAt,
                              }
                            : null,
                        })),
                      }
                    : null,
                })),
              };
              setAnalyses((prev) => [...prev, transformed]);
              toast.success("Analysis saved");
              resolve(transformed);
            } else {
              const errorMsg = json.error || "Failed to create analysis";
              console.error("Failed to create analysis:", errorMsg);
              toast.error(errorMsg);
              reject(new Error(errorMsg));
            }
          } catch (error) {
            console.error("Error creating analysis:", error);
            toast.error("Something went wrong. Please try again.");
            reject(error);
          }
        });
      });
    },
    [projectId]
  );

  const updateAnalysis = useCallback(
    async (
      id: string,
      data: {
        code?: string;
        name?: string;
        unit?: string;
        base_quantity?: number;
        resources?: Array<{
          resourceType: "labor" | "material" | "equipment";
          resourceId: string;
          quantity: number;
        }>;
      }
    ): Promise<AnalysisWithCostsClient> => {
      return new Promise((resolve, reject) => {
        startTransition(async () => {
          try {
            const res = await fetch(`/api/v1/projects/${projectId}/analysis/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const json = await res.json();
            if (res.ok && json.data) {
              const transformed: AnalysisWithCostsClient = {
                ...json.data,
                baseQuantity: typeof json.data.baseQuantity === "string" ? parseFloat(json.data.baseQuantity) : json.data.baseQuantity,
                createdAt: json.data.createdAt,
                updatedAt: json.data.updatedAt,
                costs: json.data.costs || {
                  directCost: 0,
                  depreciation: 0,
                  totalCost: 0,
                  unitRateDC: 0,
                  unitRateDP: 0,
                  unitRateTC: 0,
                },
                resources: (json.data.resources || []).map((r: {
                  quantity: string | number;
                  createdAt: string;
                  labor?: { rate: string | number; createdAt: string; updatedAt: string } | null;
                  material?: { rate: string | number; createdAt: string; updatedAt: string } | null;
                  equipment?: {
                    totalValue: string | number;
                    depreciationTotal: string | number;
                    createdAt: string;
                    updatedAt: string;
                    subResources?: Array<{
                      quantity: string | number;
                      createdAt: string;
                      labor?: { rate: string | number; createdAt: string; updatedAt: string } | null;
                      material?: { rate: string | number; createdAt: string; updatedAt: string } | null;
                    }>;
                  } | null;
                }) => ({
                  ...r,
                  quantity: typeof r.quantity === "string" ? parseFloat(r.quantity) : r.quantity,
                  createdAt: r.createdAt,
                  labor: r.labor
                    ? {
                        ...r.labor,
                        rate: typeof r.labor.rate === "string" ? parseFloat(r.labor.rate) : r.labor.rate,
                        createdAt: r.labor.createdAt,
                        updatedAt: r.labor.updatedAt,
                      }
                    : null,
                  material: r.material
                    ? {
                        ...r.material,
                        rate: typeof r.material.rate === "string" ? parseFloat(r.material.rate) : r.material.rate,
                        createdAt: r.material.createdAt,
                        updatedAt: r.material.updatedAt,
                      }
                    : null,
                  equipment: r.equipment
                    ? {
                        ...r.equipment,
                        totalValue: typeof r.equipment.totalValue === "string" ? parseFloat(r.equipment.totalValue) : r.equipment.totalValue,
                        depreciationTotal: typeof r.equipment.depreciationTotal === "string" ? parseFloat(r.equipment.depreciationTotal) : r.equipment.depreciationTotal,
                        createdAt: r.equipment.createdAt,
                        updatedAt: r.equipment.updatedAt,
                        subResources: (r.equipment.subResources || []).map((sr) => ({
                          ...sr,
                          quantity: typeof sr.quantity === "string" ? parseFloat(sr.quantity) : sr.quantity,
                          createdAt: sr.createdAt,
                          labor: sr.labor
                            ? {
                                ...sr.labor,
                                rate: typeof sr.labor.rate === "string" ? parseFloat(sr.labor.rate) : sr.labor.rate,
                                createdAt: sr.labor.createdAt,
                                updatedAt: sr.labor.updatedAt,
                              }
                            : null,
                          material: sr.material
                            ? {
                                ...sr.material,
                                rate: typeof sr.material.rate === "string" ? parseFloat(sr.material.rate) : sr.material.rate,
                                createdAt: sr.material.createdAt,
                                updatedAt: sr.material.updatedAt,
                              }
                            : null,
                        })),
                      }
                    : null,
                })),
              };
              setAnalyses((prev) => prev.map((a) => (a.id === id ? transformed : a)));
              toast.success("Analysis saved");
              resolve(transformed);
            } else {
              const errorMsg = json.error || "Failed to update analysis";
              console.error("Failed to update analysis:", errorMsg);
              toast.error(errorMsg);
              reject(new Error(errorMsg));
            }
          } catch (error) {
            console.error("Error updating analysis:", error);
            toast.error("Something went wrong. Please try again.");
            reject(error);
          }
        });
      });
    },
    [projectId]
  );

  const deleteAnalysis = useCallback(
    async (id: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        startTransition(async () => {
          try {
            const res = await fetch(`/api/v1/projects/${projectId}/analysis/${id}`, {
              method: "DELETE",
            });
            if (res.ok) {
              setAnalyses((prev) => prev.filter((a) => a.id !== id));
              toast.success("Analysis deleted");
              resolve();
            } else {
              const json = await res.json();
              const errorMsg = json.error || "Failed to delete analysis";
              console.error("Failed to delete analysis:", errorMsg);
              toast.error(errorMsg);
              reject(new Error(errorMsg));
            }
          } catch (error) {
            console.error("Error deleting analysis:", error);
            toast.error("Something went wrong. Please try again.");
            reject(error);
          }
        });
      });
    },
    [projectId]
  );

  return {
    analyses,
    isLoading,
    isPending,
    fetchAnalyses,
    createAnalysis,
    updateAnalysis,
    deleteAnalysis,
  };
}
