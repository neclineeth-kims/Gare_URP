"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { BoqItemWithCosts } from "@/types/boq";

function mapApiBoqToClient(item: {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity: string | number;
  costs: { unitRateDC: number; unitRateDP: number; unitRateTC: number; totalDC: number; totalDP: number; totalTC: number };
  boqAnalyses?: Array<{
    id: string;
    analysisId: string;
    coefficient: string | number;
    analysis: {
      id: string;
      code: string;
      name: string;
      unit: string;
      unitRateDC?: number;
      unitRateDP?: number;
      unitRateTC?: number;
      unitRates?: { unitRateDC: number; unitRateDP: number; unitRateTC: number };
    };
  }>;
}): BoqItemWithCosts {
  const qty = typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity;
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: null,
    unit: item.unit,
    quantity: qty,
    costs: item.costs,
    boqAnalyses: (item.boqAnalyses || []).map((ba) => {
      const coeff = typeof ba.coefficient === "string" ? parseFloat(ba.coefficient) : ba.coefficient;
      const a = ba.analysis as {
        unitRates?: { unitRateDC: number; unitRateDP: number; unitRateTC: number };
        unitRateDC?: number;
        unitRateDP?: number;
        unitRateTC?: number;
      };
      const rates = a.unitRates ?? {
        unitRateDC: a.unitRateDC ?? 0,
        unitRateDP: a.unitRateDP ?? 0,
        unitRateTC: a.unitRateTC ?? 0,
      };
      return {
        id: ba.id,
        analysisId: ba.analysisId,
        coefficient: coeff,
        analysis: {
          id: ba.analysis.id,
          code: ba.analysis.code,
          name: ba.analysis.name,
          unit: ba.analysis.unit,
          unitRateDC: rates.unitRateDC,
          unitRateDP: rates.unitRateDP,
          unitRateTC: rates.unitRateTC,
        },
      };
    }),
  };
}

export function useBoqManager(projectId: string, initialBoqItems: BoqItemWithCosts[]) {
  const [boqItems, setBoqItems] = useState<BoqItemWithCosts[]>(initialBoqItems);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchBoqItems = useCallback(
    async (search?: string, sort?: "code" | "name") => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (sort) params.set("sort", sort);
        const url = `/api/v1/projects/${projectId}/boq${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url);
        const json = await res.json();
        if (res.ok && json.data) {
          setBoqItems(json.data.map(mapApiBoqToClient));
        } else {
          toast.error(json.error || "Failed to fetch BoQ items");
        }
      } catch {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  const createBoqItem = useCallback(
    async (data: {
      code: string;
      name: string;
      unit: string;
      quantity: number;
      analyses?: { analysisId: string; coefficient: number }[];
    }): Promise<BoqItemWithCosts> => {
      return new Promise((resolve, reject) => {
        startTransition(async () => {
          try {
            const res = await fetch(`/api/v1/projects/${projectId}/boq`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const json = await res.json();
            if (res.ok && json.data) {
              const item = mapApiBoqToClient(json.data);
              setBoqItems((prev) => [...prev, item]);
              toast.success("BoQ item saved");
              resolve(item);
            } else {
              const errorMsg = json.error || "Failed to create BoQ item";
              toast.error(errorMsg);
              reject(new Error(errorMsg));
            }
          } catch (error) {
            toast.error("Something went wrong. Please try again.");
            reject(error);
          }
        });
      });
    },
    [projectId]
  );

  const updateBoqItem = useCallback(
    async (
      id: string,
      data: {
        code?: string;
        name?: string;
        unit?: string;
        quantity?: number;
        analyses?: { analysisId: string; coefficient: number }[];
      }
    ): Promise<BoqItemWithCosts> => {
      return new Promise((resolve, reject) => {
        startTransition(async () => {
          try {
            const res = await fetch(`/api/v1/projects/${projectId}/boq/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const json = await res.json();
            if (res.ok && json.data) {
              const item = mapApiBoqToClient(json.data);
              setBoqItems((prev) => prev.map((b) => (b.id === id ? item : b)));
              toast.success("BoQ item saved");
              resolve(item);
            } else {
              const errorMsg = json.error || "Failed to update BoQ item";
              toast.error(errorMsg);
              reject(new Error(errorMsg));
            }
          } catch (error) {
            toast.error("Something went wrong. Please try again.");
            reject(error);
          }
        });
      });
    },
    [projectId]
  );

  const deleteBoqItem = useCallback(
    async (id: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        startTransition(async () => {
          try {
            const res = await fetch(`/api/v1/projects/${projectId}/boq/${id}`, {
              method: "DELETE",
            });
            if (res.ok) {
              setBoqItems((prev) => prev.filter((b) => b.id !== id));
              toast.success("BoQ item deleted");
              resolve();
            } else {
              const json = await res.json();
              const errorMsg = json.error || "Failed to delete BoQ item";
              toast.error(errorMsg);
              reject(new Error(errorMsg));
            }
          } catch (error) {
            toast.error("Something went wrong. Please try again.");
            reject(error);
          }
        });
      });
    },
    [projectId]
  );

  return {
    boqItems,
    isLoading,
    isPending,
    fetchBoqItems,
    createBoqItem,
    updateBoqItem,
    deleteBoqItem,
  };
}
