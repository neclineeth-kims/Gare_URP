"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BoqAnalysisPicker } from "@/components/boq-analysis-picker";
import { ArrowLeft, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type BoqAnalysisRow = {
  id: string;
  coefficient: string;
  analysis: {
    id: string;
    code: string;
    name: string;
    unit: string;
    baseQuantity: string;
  };
  analysisCosts: {
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
  };
  weightedDC: number;
  weightedDP: number;
  weightedTC: number;
};

type BoqDetail = {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity: string;
  boqAnalyses: BoqAnalysisRow[];
  costs: {
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
    totalDC: number;
    totalDP: number;
    totalTC: number;
  };
};

export default function BoqDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const boqId = params.id as string;

  const [boq, setBoq] = useState<BoqDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editCoefficient, setEditCoefficient] = useState("");

  const fetchBoq = async () => {
    const res = await fetch(`/api/v1/projects/${projectId}/boq/${boqId}`);
    const json = await res.json();
    if (res.ok && json.data) {
      setBoq(json.data);
    } else {
      toast.error("BoQ item not found");
    }
  };

  useEffect(() => {
    fetchBoq().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, boqId]);

  const existingAnalysisIds = (boq?.boqAnalyses ?? []).map((ba) => ba.analysis.id);
  const coeffSum = (boq?.boqAnalyses ?? []).reduce((s, ba) => s + Number(ba.coefficient), 0);
  const coeffWarning = Math.abs(coeffSum - 1) > 0.001;

  const handleAddAnalysis = async (analysis: { id: string }, coefficient: number) => {
    const res = await fetch(
      `/api/v1/projects/${projectId}/boq/${boqId}/analysis`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: analysis.id,
          coefficient,
        }),
      }
    );
    const json = await res.json();
    if (res.ok) {
      toast.success("Analysis linked");
      fetchBoq();
    } else {
      toast.error(json.error || "Failed to add");
    }
  };

  const handleEditCoefficient = (row: BoqAnalysisRow) => {
    setEditRowId(row.id);
    setEditCoefficient(row.coefficient);
    setEditDialogOpen(true);
  };

  const handleSaveCoefficient = async () => {
    if (!editRowId || !editCoefficient || Number(editCoefficient) <= 0) return;
    const res = await fetch(
      `/api/v1/projects/${projectId}/boq/${boqId}/analysis/${editRowId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coefficient: Number(editCoefficient) }),
      }
    );
    const json = await res.json();
    if (res.ok) {
      toast.success("Coefficient updated");
      setEditDialogOpen(false);
      setEditRowId(null);
      fetchBoq();
    } else {
      toast.error(json.error || "Failed to update");
    }
  };

  const handleRemove = async (rowId: string) => {
    if (!confirm("Remove this analysis link?")) return;
    const res = await fetch(
      `/api/v1/projects/${projectId}/boq/${boqId}/analysis/${rowId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast.success("Removed");
      fetchBoq();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to remove");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }
  if (!boq) {
    return (
      <div className="space-y-4">
        <Link href={`/projects/${projectId}/boq`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to BoQ
          </Button>
        </Link>
        <p className="text-muted-foreground">BoQ item not found.</p>
      </div>
    );
  }

  const unitLabel = boq.unit ? `/${boq.unit}` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}/boq`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">
            {boq.code} — {boq.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Quantity: {Number(boq.quantity).toLocaleString()} {boq.unit}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>
            BDC = Σ(coefficient × ADC), BDP = Σ(coefficient × ADP). BTC = BDC + BDP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">BDC {unitLabel}</p>
              <p className="text-2xl font-bold font-mono">
                {boq.costs.unitRateDC.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total: {boq.costs.totalDC.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium text-muted-foreground">BDP {unitLabel}</p>
              <p className="text-2xl font-bold font-mono">
                {boq.costs.unitRateDP.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total: {boq.costs.totalDP.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-primary/10 p-4">
              <p className="text-sm font-medium text-muted-foreground">BTC {unitLabel}</p>
              <p className="text-2xl font-bold font-mono">
                {boq.costs.unitRateTC.toFixed(3)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total: {boq.costs.totalTC.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Analysis Composition</CardTitle>
            <CardDescription>
              Link analysis items with coefficients. Unit rate = Σ(coefficient × analysis unit rate).
              {coeffWarning && (
                <span className="mt-1 block text-amber-600">
                  Note: Coefficients sum to {coeffSum.toFixed(3)} (1.0 is typical but not required).
                </span>
              )}
            </CardDescription>
          </div>
          <Button onClick={() => setPickerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Analysis
          </Button>
        </CardHeader>
        <CardContent>
          {boq.boqAnalyses.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No analysis items linked. Add analysis items to compute BoQ costs.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Analysis</TableHead>
                    <TableHead className="text-right">Coefficient</TableHead>
                    <TableHead className="text-right">ADC/unit</TableHead>
                    <TableHead className="text-right">ADP/unit</TableHead>
                    <TableHead className="text-right">ATC/unit</TableHead>
                    <TableHead className="text-right">Weighted DC</TableHead>
                    <TableHead className="text-right">Weighted DP</TableHead>
                    <TableHead className="text-right">Weighted TC</TableHead>
                    <TableHead className="w-[70px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boq.boqAnalyses.map((ba) => (
                    <TableRow key={ba.id}>
                      <TableCell>
                        <span className="font-mono">{ba.analysis.code}</span> {ba.analysis.name}
                      </TableCell>
                      <TableCell className="text-right font-mono">{ba.coefficient}</TableCell>
                      <TableCell className="text-right font-mono">
                        {ba.analysisCosts.unitRateDC.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ba.analysisCosts.unitRateDP.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ba.analysisCosts.unitRateTC.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ba.weightedDC.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ba.weightedDP.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {ba.weightedTC.toFixed(3)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditCoefficient(ba)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Coefficient
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemove(ba.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BoqAnalysisPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        existingAnalysisIds={existingAnalysisIds}
        onSelect={handleAddAnalysis}
      />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Coefficient</DialogTitle>
            <DialogDescription>
              Coefficient weights the analysis unit rate (e.g. 0.5 = 50%).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coeff" className="text-right">Coefficient</Label>
              <Input
                id="coeff"
                type="number"
                step="0.01"
                min="0.001"
                value={editCoefficient}
                onChange={(e) => setEditCoefficient(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCoefficient}
              disabled={!editCoefficient || Number(editCoefficient) <= 0}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
