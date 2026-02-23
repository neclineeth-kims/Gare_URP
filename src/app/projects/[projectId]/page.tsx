import Link from "next/link";
import { getPrismaForProject } from "@/lib/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Users, Package, Wrench, BarChart3, ClipboardList } from "lucide-react";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const prisma = await getPrismaForProject(projectId);

  const [currencyCount, laborCount, materialsCount, equipmentCount, analysisCount, boqCount] =
    await Promise.all([
      prisma.projectCurrency.count({ where: { projectId } }),
      prisma.labor.count({ where: { projectId } }),
      prisma.material.count({ where: { projectId } }),
      prisma.equipment.count({ where: { projectId } }),
      prisma.analysis.count({ where: { projectId } }),
      prisma.boqItem.count({ where: { projectId } }),
    ]);

  const stats = [
    { label: "Currencies", count: currencyCount, href: "currencies", icon: Coins },
    { label: "Labor", count: laborCount, href: "labor", icon: Users },
    { label: "Materials", count: materialsCount, href: "materials", icon: Package },
    { label: "Equipment", count: equipmentCount, href: "equipment", icon: Wrench },
    { label: "Analysis", count: analysisCount, href: "analysis", icon: BarChart3 },
    { label: "BoQ Items", count: boqCount, href: "boq", icon: ClipboardList },
  ];

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Project Overview</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.href} href={`/projects/${projectId}/${stat.href}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.count}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
