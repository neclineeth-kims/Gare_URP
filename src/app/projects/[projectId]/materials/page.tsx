"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

type Material = {
  id: string;
  code: string;
  name: string;
  unit: string;
  rate: string;
};

type MaterialApiItem = Omit<Material, "rate"> & { rate: unknown };

export default function MaterialsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", unit: "lt", rate: "" });

  const fetchMaterials = async () => {
    const res = await fetch(`/api/v1/projects/${projectId}/materials`);
    const json = await res.json();
    if (res.ok) {
      setMaterials(
        (json.data as MaterialApiItem[]).map((m) => ({
          ...m,
          rate: m.rate != null ? String(m.rate) : "",
        }))
      );
    }
  };

  useEffect(() => {
    fetchMaterials().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const resetForm = () => {
    setForm({ code: "", name: "", unit: "lt", rate: "" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId
      ? `/api/v1/projects/${projectId}/materials/${editId}`
      : `/api/v1/projects/${projectId}/materials`;
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    if (res.ok) {
      toast.success(editId ? "Material updated" : "Material added");
      setDialogOpen(false);
      resetForm();
      fetchMaterials();
    } else {
      toast.error(json.error || "Failed to save");
    }
  };

  const handleEdit = (item: Material) => {
    setEditId(item.id);
    setForm({ code: item.code, name: item.name, unit: item.unit, rate: item.rate });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this material?")) return;
    const res = await fetch(`/api/v1/projects/${projectId}/materials/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Material deleted");
      fetchMaterials();
    } else {
      const json = await res.json();
      toast.error(json.error || "Failed to delete");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Materials</h2>
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
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Material" : "Add Material"}</DialogTitle>
                <DialogDescription>Enter material details.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="code" className="text-right">Code</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    className="col-span-3"
                    placeholder="e.g. 2001"
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
                    placeholder="e.g. Diesel"
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
                    placeholder="e.g. lt, ton"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rate" className="text-right">Rate</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    value={form.rate}
                    onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                    className="col-span-3"
                    placeholder="Cost per unit"
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
      ) : materials.length === 0 ? (
        <p className="text-muted-foreground">No materials. Add one to get started.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(item.rate).toFixed(2)}
                  </TableCell>
                  <TableCell>
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
