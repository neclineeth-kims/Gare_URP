"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AnalysisRow = {
  coefficient: number;
  analysis: {
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
  };
};

type BoqCostSummaryProps = {
  quantity: number;
  analyses: AnalysisRow[];
};

function computeBoqCostsClient(quantity: number, analyses: AnalysisRow[]) {
  let unitRateDC = 0;
  let unitRateDP = 0;
  for (const ba of analyses) {
    const coeff = Number(ba.coefficient);
    unitRateDC += coeff * ba.analysis.unitRateDC;
    unitRateDP += coeff * ba.analysis.unitRateDP;
  }
  const unitRateTC = unitRateDC + unitRateDP;
  const qty = Number(quantity) || 0;
  return {
    unitRateDC,
    unitRateDP,
    unitRateTC,
    totalDC: unitRateDC * qty,
    totalDP: unitRateDP * qty,
    totalTC: unitRateTC * qty,
  };
}

export default function BoqCostSummary({ quantity, analyses }: BoqCostSummaryProps) {
  const costs = useMemo(
    () => computeBoqCostsClient(quantity, analyses),
    [quantity, analyses]
  );

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20">
      <CardHeader>
        <CardTitle className="text-lg">Cost Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <div className="mb-1 text-sm font-medium text-muted-foreground">
              Unit Rate DC (BDC)
            </div>
            <div className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
              {costs.unitRateDC.toFixed(3)}
            </div>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-1 text-sm font-medium text-muted-foreground">
              Unit Rate DP (BDP)
            </div>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {costs.unitRateDP.toFixed(3)}
            </div>
          </div>
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
            <div className="mb-1 text-sm font-medium text-muted-foreground">
              Unit Rate TC (BTC)
            </div>
            <div className="text-2xl font-bold font-mono text-primary">
              {costs.unitRateTC.toFixed(3)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-3">
          <div className="text-center">
            <div className="mb-1 text-sm font-medium text-muted-foreground">
              Total DC
            </div>
            <div className="text-xl font-bold font-mono text-green-600 dark:text-green-400">
              {costs.totalDC.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-sm font-medium text-muted-foreground">
              Total DP
            </div>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {costs.totalDP.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-sm font-medium text-muted-foreground">
              Total TC
            </div>
            <div className="text-xl font-bold font-mono text-primary">
              {costs.totalTC.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
