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

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LineItem({
  label,
  value,
  color,
  bold,
  separator,
}: {
  label: string;
  value: number;
  color?: string;
  bold?: boolean;
  separator?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${separator ? "border-t mt-1 pt-2.5" : ""}`}>
      <span className={`text-sm ${bold ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`font-mono text-sm ${bold ? "font-bold" : ""} ${color ?? "text-foreground"}`}>
        {value === 0 && !bold ? "—" : fmt(value)}
      </span>
    </div>
  );
}

export default function BoqCostSummary({ quantity, analyses }: BoqCostSummaryProps) {
  const c = useMemo(() => computeBoqCostsClient(quantity, analyses), [quantity, analyses]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Cost Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <LineItem label="Total DC" value={c.totalDC} color="text-green-500" bold />
        <LineItem label="Total DP" value={c.totalDP} color="text-amber-500" bold />
        <LineItem label="Grand Total TC" value={c.totalTC} color="text-foreground" bold separator />

        {/* Unit Rates */}
        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-muted-foreground leading-tight">UR DC</div>
            <div className="font-mono text-sm font-semibold text-green-500">{c.unitRateDC.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground leading-tight">UR DP</div>
            <div className="font-mono text-sm font-semibold text-amber-500">{c.unitRateDP.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground leading-tight">UR TC</div>
            <div className="font-mono text-sm font-semibold">{c.unitRateTC.toFixed(3)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
