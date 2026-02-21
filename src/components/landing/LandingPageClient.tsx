"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, FolderOpen, HardHat, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ProjectEntry = {
  id: string;
  name: string;
  path: string;
  createdAt: string;
};

export function LandingPageClient({ projects }: { projects: ProjectEntry[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = search.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.id.toLowerCase().includes(search.toLowerCase())
      )
    : projects;

  const handleEditOpen = (project: ProjectEntry) => {
    setEditId(project.id);
    setEditName(project.name);
  };

  const handleEditSave = async () => {
    if (!editId || !editName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Project renamed");
        setEditId(null);
        router.refresh();
      } else {
        toast.error(json.error || "Failed to rename");
      }
    } catch {
      toast.error("Failed to rename project");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Project deleted");
        setDeleteId(null);
        router.refresh();
      } else {
        toast.error(json.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-2">
          <HardHat className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">Unit Rate Calculator</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold">Projects</h2>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/new-project">
                <Plus className="h-4 w-4" />
                Start new project
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <p className="mb-4 text-muted-foreground">
            Open an existing project or create a new one to get started.
          </p>
          {projects.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {projects.length === 0
                  ? "No projects yet"
                  : "No matching projects"}
              </CardTitle>
              <CardDescription>
                {projects.length === 0
                  ? "Create a project to get started with labor, materials, equipment, and analysis."
                  : "Try a different search term or create a new project."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <Card key={project.id} className="h-full transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditOpen(project)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(project.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/projects/${project.id}`}>
                    <span className="text-sm text-muted-foreground">Open project →</span>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename project</DialogTitle>
                <DialogDescription>
                  Enter a new name for this project.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Project name"
                onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditId(null)} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={loading || !editName.trim()}>
                  {loading ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete project</DialogTitle>
                <DialogDescription>
                  This will permanently delete the project folder and all its data. This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteId(null)} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={loading}
                >
                  {loading ? "Deleting…" : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </>
        )}
      </main>
    </div>
  );
}
