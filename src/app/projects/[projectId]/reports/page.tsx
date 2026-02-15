"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LaborRow = {
  resource: { code: string; name: string; unit: string; rate: string };
  totalQty: number;
};

type MaterialRow = {
  resource: { code: string; name: string; unit: string; rate: string };
  totalQty: number;
};

type EquipmentRow = {
  resource: { code: string; name: string; unit: string };
  totalHours: number;
  deprPerUnit: number;
  totalDepreciation: number;
};

type ExplosionData = {
  labor: LaborRow[];
  materials: MaterialRow[];
  equipment: EquipmentRow[];
  totalLaborCost: number;
  totalMaterialCost: number;
  totalDirectCost: number;
  totalDepreciation: number;
  grandTotal: number;
  boqSummary: { code: string; name: string; totalDC: number; totalDP: number; totalTC: number }[];
};

export default function ReportsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [data, setData] = useState<ExplosionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/projects/${projectId}/reports/resource-explosion`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setData(json.data);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (!data) {
    return (
      <div>
        <h2 className="mb-6 text-2xl font-bold">Resource Explosion Report</h2>
        <p className="text-muted-foreground">No data available.</p>
      </div>
    );
  }

  const formatNum = (n: number, decimals = 0) =>
    n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const formatRate = (n: number) => n.toFixed(2);

  return (
    <div className="space-y-8 print:space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Resource Explosion Report</h2>
        <p className="text-sm text-muted-foreground">
          Aggregated resources across all BoQ items. Labor + Material = Direct Cost. Depreciation is separate (Rule #1).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Labor Summary</CardTitle>
          <CardDescription>Total hours by labor type. Includes direct use + equipment operators.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.labor.map((l) => (
                <TableRow key={l.resource.code}>
                  <TableCell className="font-mono">{l.resource.code}</TableCell>
                  <TableCell>{l.resource.name}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(l.totalQty, 0)}</TableCell>
                  <TableCell className="text-right font-mono">{formatRate(Number(l.resource.rate))}/{l.resource.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNum(l.totalQty * Number(l.resource.rate), 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Total Labor Cost</TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right font-mono font-semibold">
                  {formatNum(data.totalLaborCost, 0)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Material Summary</CardTitle>
          <CardDescription>Total quantities by material. Includes direct use + equipment fuel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.materials.map((m) => (
                <TableRow key={m.resource.code}>
                  <TableCell className="font-mono">{m.resource.code}</TableCell>
                  <TableCell>{m.resource.name}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(m.totalQty, 0)}</TableCell>
                  <TableCell>{m.resource.unit}</TableCell>
                  <TableCell className="text-right font-mono">{formatRate(Number(m.resource.rate))}/{m.resource.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNum(m.totalQty * Number(m.resource.rate), 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Total Material Cost</TableCell>
                <TableCell colSpan={3} />
                <TableCell className="text-right font-mono font-semibold">
                  {formatNum(data.totalMaterialCost, 0)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Equipment Summary</CardTitle>
          <CardDescription>Equipment hours and depreciation. EDC is already in Labor+Material totals.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead className="text-right">Total Hrs</TableHead>
                <TableHead className="text-right">Depr/hr</TableHead>
                <TableHead className="text-right">Total Depreciation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.equipment.map((e) => (
                <TableRow key={e.resource.code}>
                  <TableCell className="font-mono">{e.resource.code}</TableCell>
                  <TableCell>{e.resource.name}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(e.totalHours, 0)}</TableCell>
                  <TableCell className="text-right font-mono">{formatRate(e.deprPerUnit)}/{e.resource.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNum(e.totalDepreciation, 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Total Depreciation</TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right font-mono font-semibold">
                  {formatNum(data.totalDepreciation, 0)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Cost Summary</CardTitle>
          <CardDescription>Total Direct Cost = Labor + Material (includes equipment EDC). Grand Total = DC + Depreciation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between py-1">
              <span>Total Labor Cost</span>
              <span className="font-mono font-medium">{formatNum(data.totalLaborCost, 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Total Material Cost</span>
              <span className="font-mono font-medium">{formatNum(data.totalMaterialCost, 0)}</span>
            </div>
            <div className="flex justify-between border-t py-2 font-semibold">
              <span>Total Direct Cost</span>
              <span className="font-mono">{formatNum(data.totalDirectCost, 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Total Depreciation</span>
              <span className="font-mono font-medium">{formatNum(data.totalDepreciation, 0)}</span>
            </div>
            <div className="flex justify-between border-t py-2 text-lg font-bold">
              <span>Grand Total</span>
              <span className="font-mono">{formatNum(data.grandTotal, 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. BoQ Summary</CardTitle>
          <CardDescription>Cost breakdown per BoQ item.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Total DC</TableHead>
                <TableHead className="text-right">Total DP</TableHead>
                <TableHead className="text-right">Total TC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.boqSummary.map((b) => (
                <TableRow key={b.code}>
                  <TableCell className="font-mono">{b.code}</TableCell>
                  <TableCell>{b.name}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(b.totalDC, 0)}</TableCell>
                  <TableCell className="text-right font-mono">{formatNum(b.totalDP, 0)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatNum(b.totalTC, 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Grand Total</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatNum(data.totalDirectCost, 0)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatNum(data.totalDepreciation, 0)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatNum(data.grandTotal, 0)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {data.labor.length === 0 && data.materials.length === 0 && data.equipment.length === 0 && (
        <p className="text-muted-foreground">No resources. Add BoQ items with linked analysis to see the explosion.</p>
      )}
    </div>
  );
}
