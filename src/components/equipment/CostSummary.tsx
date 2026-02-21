"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";

type SubResourceRow = {
  quantity: number;
  rate: number;
};

type CostSummaryProps = {
  totalValue: number;
  depreciationTotal: number;
  laborSubResources: SubResourceRow[];
  materialSubResources: SubResourceRow[];
};

export default function CostSummary({
  totalValue,
  depreciationTotal,
  laborSubResources,
  materialSubResources,
}: CostSummaryProps) {
  const costs = useMemo(() => {
    // Calculate EDC (Equipment Direct Cost) = operator labor + fuel/material
    let edc = 0;
    for (const sr of laborSubResources) {
      edc += sr.quantity * sr.rate;
    }
    for (const sr of materialSubResources) {
      edc += sr.quantity * sr.rate;
    }

    // Calculate EDP (Equipment Depreciation) = totalValue / depreciationTotal
    const edp = depreciationTotal > 0 ? totalValue / depreciationTotal : 0;

    // Calculate ETC (Equipment Total Cost) = EDC + EDP
    const etc = edc + edp;

    return { edc, edp, etc };
  }, [totalValue, depreciationTotal, laborSubResources, materialSubResources]);

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20">
      <CardHeader>
        <CardTitle className="text-lg">Cost Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-background/50 p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Direct Cost (EDC)</div>
            <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
              {costs.edc.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">per unit</div>
            <div className="text-xs text-muted-foreground mt-2">
              Labor + Material
            </div>
          </div>
          <div className="rounded-lg border bg-background/50 p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Depreciation (EDP)</div>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {costs.edp.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">per unit</div>
            <div className="text-xs text-muted-foreground mt-2">
              Equipment wear
            </div>
          </div>
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Cost (ETC)</div>
            <div className="text-2xl font-bold font-mono text-primary">
              {costs.etc.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">per unit</div>
            <div className="text-xs text-muted-foreground mt-2">
              EDC + EDP
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
