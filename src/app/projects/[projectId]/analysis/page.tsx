import { getPrismaForProject, getAnalyses } from "@/lib/db";
import AnalysisPageClient from "@/components/analysis/AnalysisPageClient";
import type { Metadata } from "next";
import type { AnalysisWithCostsClient } from "@/types/analysis";

export const metadata: Metadata = {
  title: "Analysis",
};

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const prisma = getPrismaForProject(projectId);
  const initialAnalyses = await getAnalyses(prisma, projectId);

  // Convert Decimal objects to numbers for client component serialization
  const serializedAnalyses: AnalysisWithCostsClient[] = initialAnalyses.map((a) => ({
    ...a,
    baseQuantity: Number(a.baseQuantity),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    resources: a.resources.map((r) => ({
      ...r,
      quantity: Number(r.quantity),
      createdAt: r.createdAt.toISOString(),
      labor: r.labor
        ? {
            ...r.labor,
            rate: Number(r.labor.rate),
            createdAt: r.labor.createdAt.toISOString(),
            updatedAt: r.labor.updatedAt.toISOString(),
          }
        : null,
      material: r.material
        ? {
            ...r.material,
            rate: Number(r.material.rate),
            createdAt: r.material.createdAt.toISOString(),
            updatedAt: r.material.updatedAt.toISOString(),
          }
        : null,
      equipment: r.equipment
        ? {
            ...r.equipment,
            totalValue: Number(r.equipment.totalValue),
            depreciationTotal: Number(r.equipment.depreciationTotal),
            createdAt: r.equipment.createdAt.toISOString(),
            updatedAt: r.equipment.updatedAt.toISOString(),
            subResources: r.equipment.subResources.map((sr) => ({
              ...sr,
              quantity: Number(sr.quantity),
              createdAt: sr.createdAt.toISOString(),
              labor: sr.labor
                ? {
                    ...sr.labor,
                    rate: Number(sr.labor.rate),
                    createdAt: sr.labor.createdAt.toISOString(),
                    updatedAt: sr.labor.updatedAt.toISOString(),
                  }
                : null,
              material: sr.material
                ? {
                    ...sr.material,
                    rate: Number(sr.material.rate),
                    createdAt: sr.material.createdAt.toISOString(),
                    updatedAt: sr.material.updatedAt.toISOString(),
                  }
                : null,
            })),
          }
        : null,
    })),
  }));

  return <AnalysisPageClient projectId={projectId} initialAnalyses={serializedAnalyses} />;
}
