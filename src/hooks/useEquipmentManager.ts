"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { EquipmentWithCostsClient } from "@/types/equipment";

export function useEquipmentManager(projectId: string, initialEquipment: EquipmentWithCostsClient[]) {
  const [equipment, setEquipment] = useState<EquipmentWithCostsClient[]>(initialEquipment);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchEquipment = useCallback(
    async (search?: string, sort?: "code" | "name") => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (sort) params.set("sort", sort);
        const url = `/api/v1/projects/${projectId}/equipment${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url);
        const json = await res.json();
        if (res.ok && json.data) {
          // Transform API response to match EquipmentWithCostsClient type
          const transformed: EquipmentWithCostsClient[] = json.data.map((eq: {
            id: string;
            code: string;
            name: string;
            unit: string;
            totalValue: string | number;
            depreciationTotal: string | number;
            createdAt: string;
            updatedAt: string;
            costs?: { edc: number; edp: number; etc: number };
            edc?: string | number;
            edp?: string | number;
            etc?: string | number;
            subResources?: Array<{
              id: string;
              quantity: string | number;
              createdAt: string;
              labor?: { rate: string | number; createdAt: string; updatedAt: string } | null;
              material?: { rate: string | number; createdAt: string; updatedAt: string } | null;
            }>;
          }) => ({
            ...eq,
            totalValue: typeof eq.totalValue === "string" ? parseFloat(eq.totalValue) : eq.totalValue,
            depreciationTotal:
              typeof eq.depreciationTotal === "string"
                ? parseFloat(eq.depreciationTotal)
                : eq.depreciationTotal,
            createdAt: eq.createdAt || new Date().toISOString(),
            updatedAt: eq.updatedAt || new Date().toISOString(),
            costs: eq.costs || { 
              edc: typeof eq.edc === "string" ? parseFloat(eq.edc) : (typeof eq.edc === "number" ? eq.edc : 0),
              edp: typeof eq.edp === "string" ? parseFloat(eq.edp) : (typeof eq.edp === "number" ? eq.edp : 0),
              etc: typeof eq.etc === "string" ? parseFloat(eq.etc) : (typeof eq.etc === "number" ? eq.etc : 0),
            },
            subResources: (eq.subResources || []).map((sr) => ({
              ...sr,
              quantity: typeof sr.quantity === "string" ? parseFloat(sr.quantity) : sr.quantity,
              createdAt: sr.createdAt || new Date().toISOString(),
              labor: sr.labor ? {
                ...sr.labor,
                rate: typeof sr.labor.rate === "string" ? parseFloat(sr.labor.rate) : sr.labor.rate,
                createdAt: sr.labor.createdAt || new Date().toISOString(),
                updatedAt: sr.labor.updatedAt || new Date().toISOString(),
              } : null,
              material: sr.material ? {
                ...sr.material,
                rate: typeof sr.material.rate === "string" ? parseFloat(sr.material.rate) : sr.material.rate,
                createdAt: sr.material.createdAt || new Date().toISOString(),
                updatedAt: sr.material.updatedAt || new Date().toISOString(),
              } : null,
            })),
          }));
          setEquipment(transformed);
        } else {
          const errorMessage = json.error || "Failed to fetch equipment";
          console.error("Error fetching equipment:", errorMessage, json);
          toast.error(errorMessage);
        }
      } catch (error) {
        console.error("Error fetching equipment:", error);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  const createEquipment = useCallback(
    async (data: {
      code: string;
      name: string;
      unit: string;
      total_value: number;
      depreciation_total: number;
      laborSubResources?: Array<{ resourceId: string; quantity: number }>;
      materialSubResources?: Array<{ resourceId: string; quantity: number }>;
    }) => {
      return new Promise<EquipmentWithCostsClient>((resolve, reject) => {
        startTransition(async () => {
          try {
            const res = await fetch(`/api/v1/projects/${projectId}/equipment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const json = await res.json();
            if (res.ok && json.data) {
              toast.success("Equipment saved");
              await fetchEquipment();
              const transformed: EquipmentWithCostsClient = {
                ...json.data,
                totalValue: typeof json.data.totalValue === "string" ? parseFloat(json.data.totalValue) : json.data.totalValue,
                depreciationTotal:
                  typeof json.data.depreciationTotal === "string"
                    ? parseFloat(json.data.depreciationTotal)
                    : json.data.depreciationTotal,
                createdAt: json.data.createdAt || new Date().toISOString(),
                updatedAt: json.data.updatedAt || new Date().toISOString(),
                costs: json.data.costs || { edc: 0, edp: 0, etc: 0 },
                subResources: (json.data.subResources || []).map((sr: {
                  id: string;
                  equipmentId: string;
                  resourceType: string;
                  laborId: string | null;
                  materialId: string | null;
                  quantity: string | number;
                  createdAt: string;
                  labor?: { id: string; code: string; name: string; unit: string; rate: string | number; createdAt: string; updatedAt: string } | null;
                  material?: { id: string; code: string; name: string; unit: string; rate: string | number; createdAt: string; updatedAt: string } | null;
                }) => ({
                  ...sr,
                  quantity: typeof sr.quantity === "string" ? parseFloat(sr.quantity) : sr.quantity,
                  createdAt: sr.createdAt || new Date().toISOString(),
                  labor: sr.labor ? {
                    ...sr.labor,
                    rate: typeof sr.labor.rate === "string" ? parseFloat(sr.labor.rate) : sr.labor.rate,
                    createdAt: sr.labor.createdAt || new Date().toISOString(),
                    updatedAt: sr.labor.updatedAt || new Date().toISOString(),
                  } : null,
                  material: sr.material ? {
                    ...sr.material,
                    rate: typeof sr.material.rate === "string" ? parseFloat(sr.material.rate) : sr.material.rate,
                    createdAt: sr.material.createdAt || new Date().toISOString(),
                    updatedAt: sr.material.updatedAt || new Date().toISOString(),
                  } : null,
                })),
              };
              resolve(transformed);
            } else {
              const errorMessage = json.error || "Failed to create equipment";
              console.error("Error creating equipment:", errorMessage, json);
              toast.error(errorMessage);
              reject(new Error(errorMessage));
            }
          } catch (error) {
            console.error("Error creating equipment:", error);
            toast.error("Something went wrong. Please try again.");
            reject(error);
          }
        });
      });
    },
    [projectId, fetchEquipment]
  );

  const updateEquipment = useCallback(
    async (
      id: string,
      data: {
        code?: string;
        name?: string;
        unit?: string;
        total_value?: number;
        depreciation_total?: number;
        laborSubResources?: Array<{ resourceId: string; quantity: number }>;
        materialSubResources?: Array<{ resourceId: string; quantity: number }>;
      }
    ) => {
      return new Promise<EquipmentWithCostsClient>((resolve, reject) => {
        startTransition(async () => {
          try {
            const res = await fetch(`/api/v1/projects/${projectId}/equipment/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const json = await res.json();
            if (res.ok && json.data) {
              toast.success("Equipment saved");
              await fetchEquipment();
              const transformed: EquipmentWithCostsClient = {
                ...json.data,
                totalValue: typeof json.data.totalValue === "string" ? parseFloat(json.data.totalValue) : json.data.totalValue,
                depreciationTotal:
                  typeof json.data.depreciationTotal === "string"
                    ? parseFloat(json.data.depreciationTotal)
                    : json.data.depreciationTotal,
                createdAt: json.data.createdAt || new Date().toISOString(),
                updatedAt: json.data.updatedAt || new Date().toISOString(),
                costs: json.data.costs || { edc: 0, edp: 0, etc: 0 },
                subResources: (json.data.subResources || []).map((sr: {
                  id: string;
                  equipmentId: string;
                  resourceType: string;
                  laborId: string | null;
                  materialId: string | null;
                  quantity: string | number;
                  createdAt: string;
                  labor?: { id: string; code: string; name: string; unit: string; rate: string | number; createdAt: string; updatedAt: string } | null;
                  material?: { id: string; code: string; name: string; unit: string; rate: string | number; createdAt: string; updatedAt: string } | null;
                }) => ({
                  ...sr,
                  quantity: typeof sr.quantity === "string" ? parseFloat(sr.quantity) : sr.quantity,
                  createdAt: sr.createdAt || new Date().toISOString(),
                  labor: sr.labor ? {
                    ...sr.labor,
                    rate: typeof sr.labor.rate === "string" ? parseFloat(sr.labor.rate) : sr.labor.rate,
                    createdAt: sr.labor.createdAt || new Date().toISOString(),
                    updatedAt: sr.labor.updatedAt || new Date().toISOString(),
                  } : null,
                  material: sr.material ? {
                    ...sr.material,
                    rate: typeof sr.material.rate === "string" ? parseFloat(sr.material.rate) : sr.material.rate,
                    createdAt: sr.material.createdAt || new Date().toISOString(),
                    updatedAt: sr.material.updatedAt || new Date().toISOString(),
                  } : null,
                })),
              };
              resolve(transformed);
            } else {
              const errorMessage = json.error || "Failed to update equipment";
              console.error("Error updating equipment:", errorMessage, json);
              toast.error(errorMessage);
              reject(new Error(errorMessage));
            }
          } catch (error) {
            console.error("Error updating equipment:", error);
            toast.error("Something went wrong. Please try again.");
            reject(error);
          }
        });
      });
    },
    [projectId, fetchEquipment]
  );

  const deleteEquipment = useCallback(
    async (id: string) => {
      return new Promise<void>((resolve, reject) => {
        startTransition(async () => {
          try {
            const res = await fetch(`/api/v1/projects/${projectId}/equipment/${id}`, {
              method: "DELETE",
            });
            if (res.ok || res.status === 204) {
              toast.success("Equipment deleted");
              await fetchEquipment();
              resolve();
            } else {
              const json = await res.json();
              const errorMessage = json.error || "Failed to delete equipment";
              console.error("Error deleting equipment:", errorMessage, json);
              toast.error(errorMessage);
              reject(new Error(errorMessage));
            }
          } catch (error) {
            console.error("Error deleting equipment:", error);
            toast.error("Something went wrong. Please try again.");
            reject(error);
          }
        });
      });
    },
    [projectId, fetchEquipment]
  );

  return {
    equipment,
    isLoading,
    isPending,
    fetchEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
  };
}
