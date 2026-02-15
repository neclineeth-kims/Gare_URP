"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type AnalysisItem = {
  id: string;
  code: string;
  name: string;
  unit: string;
  baseQuantity: string;
  costs: {
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
  };
};

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [analysis, setAnalysis] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    unit: "cum",
    base_quantity: "1000",
  });

  const fetchAnalysis = async () => {
    const res = await fetch(`/api/v1/projects/${projectId}/analysis`);
    const json = await res.json();
    if (res.ok && json.data) setAnalysis(json.data);
  };

  useEffect(() => {
    fetchAnalysis().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const resetForm = () => {
    setForm({ code: "", name: "", unit: "cum", base_quantity: "1000" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId
      ? `/api/v1/projects/${projectId}/analysis/${editId}`
      : `/api/v1/projects/${projectId}/analysis`;
    const method = editId ? "PUT" : "POST";
    const body = editId ? form : form;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();

    if (res.ok) {
      toast.success(editId ? "Analysis updated" : "Analysis added");
      setDialogOpen(false);
      resetForm();
      fetchAnalysis();
    } else {
      toast.error(json.error || "Failed to save");
    }
  };

  const handleEdit = (item: AnalysisItem) => {
    setEditId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      unit: item.unit,
      base_quantity: item.baseQuantity,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this analysis? Resources will be removed.")) return;
    const res = await fetch(`/api/v1/projects/${projectId}/analysis/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Analysis deleted");
      fetchAnalysis();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to delete");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analysis</h2>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Analysis
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Analysis" : "Add Analysis"}</DialogTitle>
                <DialogDescription>
                  Define analysis item. Base quantity is the output unit (e.g. per 1000 cum).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">Code</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    className="col-span-3"
                    placeholder="e.g. 7001"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="col-span-3"
                    placeholder="e.g. Excavation"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unit" className="text-right">Unit</Label>
                  <Input
                    id="unit"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="col-span-3"
                    placeholder="e.g. cum"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="base_quantity" className="text-right">Base Qty</Label>
                  <Input
                    id="base_quantity"
                    type="number"
                    step="0.01"
                    min="0.001"
                    value={form.base_quantity}
                    onChange={(e) => setForm((f) => ({ ...f, base_quantity: e.target.value }))}
                    className="col-span-3"
                    placeholder="1000"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : analysis.length === 0 ? (
        <p className="text-muted-foreground">No analysis items. Add one and add resources to compute costs.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Base Qty</TableHead>
                <TableHead className="text-right">ADC/unit</TableHead>
                <TableHead className="text-right">ADP/unit</TableHead>
                <TableHead className="text-right">ATC/unit</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => router.push(`/projects/${projectId}/analysis/${item.id}`)}
                >
                  <TableCell className="font-mono">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(item.baseQuantity).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.costs.unitRateDC.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.costs.unitRateDP.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {item.costs.unitRateTC.toFixed(3)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
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
    </div>
  );
}
