"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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

type BoqItem = {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity: string;
  costs: {
    unitRateDC: number;
    unitRateDP: number;
    unitRateTC: number;
    totalDC: number;
    totalDP: number;
    totalTC: number;
  };
};

export default function BoQPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [items, setItems] = useState<BoqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    unit: "cum",
    quantity: "1000000",
  });

  const fetchBoq = async () => {
    const res = await fetch(`/api/v1/projects/${projectId}/boq`);
    const json = await res.json();
    if (res.ok && json.data) setItems(json.data);
  };

  useEffect(() => {
    fetchBoq().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const resetForm = () => {
    setForm({ code: "", name: "", unit: "cum", quantity: "1000000" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId
      ? `/api/v1/projects/${projectId}/boq/${editId}`
      : `/api/v1/projects/${projectId}/boq`;
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    if (res.ok) {
      toast.success(editId ? "BoQ item updated" : "BoQ item added");
      setDialogOpen(false);
      resetForm();
      fetchBoq();
    } else {
      toast.error(json.error || "Failed to save");
    }
  };

  const handleEdit = (item: BoqItem) => {
    setEditId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this BoQ item?")) return;
    const res = await fetch(`/api/v1/projects/${projectId}/boq/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("BoQ item deleted");
      fetchBoq();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to delete");
    }
  };

  const grandTotalDC = items.reduce((s, i) => s + i.costs.totalDC, 0);
  const grandTotalDP = items.reduce((s, i) => s + i.costs.totalDP, 0);
  const grandTotalTC = items.reduce((s, i) => s + i.costs.totalTC, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bill of Quantities</h2>
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
              Add BoQ Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editId ? "Edit BoQ Item" : "Add BoQ Item"}</DialogTitle>
                <DialogDescription>
                  Define BoQ item. Link analysis items on the detail page.
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
                    placeholder="e.g. 9001"
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
                    placeholder="e.g. Excavation in Bulk"
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
                  <Label htmlFor="quantity" className="text-right">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="col-span-3"
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
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No BoQ items. Add one and link analysis items to compute costs.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">BDC/unit</TableHead>
                <TableHead className="text-right">BDP/unit</TableHead>
                <TableHead className="text-right">BTC/unit</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => router.push(`/projects/${projectId}/boq/${item.id}`)}
                >
                  <TableCell className="font-mono">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(item.quantity).toLocaleString()}
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
                  <TableCell className="text-right font-mono font-medium">
                    {item.costs.totalTC.toLocaleString()}
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
            <TableFooter>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={4} className="text-right">
                  Grand Total
                </TableCell>
                <TableCell className="text-right font-mono">
                  {grandTotalDC.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {grandTotalDP.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono">—</TableCell>
                <TableCell className="text-right font-mono">
                  {grandTotalTC.toLocaleString()}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}
