"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, HardHat } from "lucide-react";
import { toast } from "sonner";

export default function NewProjectPage() {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      let data: { data?: { id?: string; name?: string }; error?: string };
      try {
        data = await res.json();
      } catch {
        toast.error("Invalid response from server");
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Failed to create project");
        return;
      }
      const projectId = data.data?.id;
      const projectName = data.data?.name ?? name.trim();
      if (!projectId) {
        toast.error("Server did not return project ID");
        return;
      }
      toast.success(`Project "${projectName}" created`);
      const target = `/projects/${projectId}/currencies`;
      // Use full navigation to ensure layout picks up the new project from registry
      window.location.assign(target);
    } catch (err) {
      console.error("Create project error:", err);
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <HardHat className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">Unit Rate Calculator</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md p-6">
        <Card>
          <CardHeader>
            <CardTitle>Create new project</CardTitle>
            <CardDescription>
              Enter a name for your project. A new directory will be created with empty
              databases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Highway Phase 1"
                  disabled={isCreating}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating…" : "Create"}
                </Button>
                <Link href="/">
                  <Button type="button" variant="outline" disabled={isCreating}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
