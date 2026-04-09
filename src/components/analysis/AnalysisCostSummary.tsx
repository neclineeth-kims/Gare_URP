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

function computeAnalysisCostsClient(baseQuantity: number, resources: ResourceRow[]) {
  let laborCost = 0;
  let materialCost = 0;
  let equipmentEDC = 0;
  let equipmentEDP = 0;

  for (const res of resources) {
    switch (res.resourceType) {
      case "labor":
        if (res.labor?.rate) laborCost += res.quantity * res.labor.rate;
        break;
      case "material":
        if (res.material?.rate) materialCost += res.quantity * res.material.rate;
        break;
      case "equipment":
        if (res.equipment) {
          let edc = 0;
          for (const sr of res.equipment.subResources) {
            if (sr.labor?.rate) edc += sr.quantity * sr.labor.rate;
            if (sr.material?.rate) edc += sr.quantity * sr.material.rate;
          }
          const edp =
            res.equipment.depreciationTotal > 0
              ? res.equipment.totalValue / res.equipment.depreciationTotal
              : 0;
          equipmentEDC += res.quantity * edc;
          equipmentEDP += res.quantity * edp;
        }
        break;
    }
  }

  const directCost = laborCost + materialCost + equipmentEDC;
  const depreciation = equipmentEDP;
  const totalCost = directCost + depreciation;
  const base = baseQuantity || 1;

  return {
    laborCost,
    materialCost,
    equipmentEDC,
    equipmentEDP,
    directCost,
    depreciation,
    totalCost,
    unitRateDC: directCost / base,
    unitRateDP: depreciation / base,
    unitRateTC: totalCost / base,
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
  const valueClass = color ?? "text-foreground";
  return (
    <div className={`flex items-center justify-between py-1.5 ${separator ? "border-t mt-1 pt-2.5" : ""}`}>
      <span className={`text-sm ${bold ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`font-mono text-sm ${bold ? "font-bold text-base" : ""} ${valueClass}`}>
        {value === 0 && !bold ? "—" : fmt(value)}
      </span>
    </div>
  );
}

export default function AnalysisCostSummary({ baseQuantity, resources }: AnalysisCostSummaryProps) {
  const c = useMemo(() => computeAnalysisCostsClient(baseQuantity, resources), [baseQuantity, resources]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Cost Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <LineItem label="Labor Cost" value={c.laborCost} color="text-green-500" />
        <LineItem label="Material Cost" value={c.materialCost} color="text-green-500" />
        <LineItem label="Equipment EDC" value={c.equipmentEDC} color="text-green-500" />
        <LineItem label="Direct Cost (ADC)" value={c.directCost} color="text-green-500" bold separator />

        <LineItem label="Equipment EDP" value={c.equipmentEDP} color="text-amber-500" />
        <LineItem label="Depreciation (ADP)" value={c.depreciation} color="text-amber-500" bold separator />

        <LineItem label="Grand Total (ATC)" value={c.totalCost} color="text-foreground" bold separator />

        {/* Unit Rates */}
        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-muted-foreground leading-tight">UR DC / cum</div>
            <div className="font-mono text-sm font-semibold text-green-500">{c.unitRateDC.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground leading-tight">UR DP / cum</div>
            <div className="font-mono text-sm font-semibold text-amber-500">{c.unitRateDP.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground leading-tight">UR TC / cum</div>
            <div className="font-mono text-sm font-semibold">{c.unitRateTC.toFixed(3)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
