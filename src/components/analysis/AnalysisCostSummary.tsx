"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

type ResourceRow = {
  resourceType: "labor" | "material" | "equipment";
  quantity: number;
  labor?: { rate: number } | null;
  material?: { rate: number } | null;
  equipment?: {
    totalValue: number;
    depreciationTotal: number;
    subResources: Array<{
      quantity: number;
      labor?: { rate: number } | null;
      material?: { rate: number } | null;
    }>;
  } | null;
};

type AnalysisCostSummaryProps = {
  baseQuantity: number;
  resources: ResourceRow[];
};

// Client-safe calculation function (doesn't use Prisma Decimal)
function computeAnalysisCostsClient(
  baseQuantity: number,
  resources: ResourceRow[]
): {
  directCost: number;
  depreciation: number;
  totalCost: number;
  unitRateDC: number;
  unitRateDP: number;
  unitRateTC: number;
} {
  let directCost = 0;
  let depreciation = 0;

  for (const res of resources) {
    switch (res.resourceType) {
      case "labor":
        if (res.labor?.rate) {
          directCost += res.quantity * res.labor.rate;
        }
        break;
      case "material":
        if (res.material?.rate) {
          directCost += res.quantity * res.material.rate;
        }
        break;
      case "equipment":
        if (res.equipment) {
          // Calculate equipment EDC from sub-resources
          let edc = 0;
          for (const sr of res.equipment.subResources) {
            if (sr.labor?.rate) {
              edc += sr.quantity * sr.labor.rate;
            }
            if (sr.material?.rate) {
              edc += sr.quantity * sr.material.rate;
            }
          }
          // Calculate equipment EDP
          const edp = res.equipment.depreciationTotal > 0
            ? res.equipment.totalValue / res.equipment.depreciationTotal
            : 0;
          
          const qty = res.quantity;
          directCost += qty * edc;
          depreciation += qty * edp;
        }
        break;
    }
  }

  const totalCost = directCost + depreciation;
  const base = baseQuantity || 1;
  return {
    directCost,
    depreciation,
    totalCost,
    unitRateDC: directCost / base,
    unitRateDP: depreciation / base,
    unitRateTC: totalCost / base,
  };
}

export default function AnalysisCostSummary({
  baseQuantity,
  resources,
}: AnalysisCostSummaryProps) {
  const costs = useMemo(() => {
    return computeAnalysisCostsClient(baseQuantity, resources);
  }, [baseQuantity, resources]);

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20">
      <CardHeader>
        <CardTitle className="text-lg">Cost Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="rounded-lg border bg-background/50 p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Direct Cost (ADC)</div>
            <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
              {costs.directCost.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">total</div>
            <div className="text-xs text-muted-foreground mt-2">
              Labor + Material + Equipment EDC
            </div>
          </div>
          <div className="rounded-lg border bg-background/50 p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Depreciation (ADP)</div>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {costs.depreciation.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">total</div>
            <div className="text-xs text-muted-foreground mt-2">
              Equipment depreciation
            </div>
          </div>
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Cost (ATC)</div>
            <div className="text-2xl font-bold font-mono text-primary">
              {costs.totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">total</div>
            <div className="text-xs text-muted-foreground mt-2">
              ADC + ADP
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground mb-1">Unit Rate DC</div>
            <div className="text-xl font-bold font-mono">
              {costs.unitRateDC.toFixed(3)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground mb-1">Unit Rate DP</div>
            <div className="text-xl font-bold font-mono">
              {costs.unitRateDP.toFixed(3)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground mb-1">Unit Rate TC</div>
            <div className="text-xl font-bold font-mono text-primary">
              {costs.unitRateTC.toFixed(3)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
