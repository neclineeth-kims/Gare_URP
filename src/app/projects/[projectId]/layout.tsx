import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrismaForProject } from "@/lib/projects";
import { getMainCurrencyDisplay } from "@/lib/currency";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  let prisma;
  try {
    prisma = getPrismaForProject(projectId);
  } catch {
    notFound();
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) notFound();

  const mainCurrency = await getMainCurrencyDisplay(prisma, projectId);
  const currencyDisplay = mainCurrency
    ? `${mainCurrency.symbol} ${mainCurrency.code}`
    : "US$";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold">{project.name}</h1>
          <p className="text-xs text-muted-foreground">{currencyDisplay}</p>
        </div>
      </header>

      <div className="flex flex-1">
        <Sidebar projectId={projectId} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
