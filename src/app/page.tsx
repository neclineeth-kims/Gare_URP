import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat } from "lucide-react";

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    include: { currency: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-2">
          <HardHat className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">Unit Rate Calculator</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Projects</h2>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No projects yet</CardTitle>
              <CardDescription>
                Create a project to get started with labor, materials, and equipment.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full transition-colors hover:bg-accent/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {project.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{project.currency.symbol} {project.currency.code}</span>
                      <span className="capitalize">{project.status}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
