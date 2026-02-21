import { getPrismaForProject, getBoqItems } from "@/lib/db";
import { computeAnalysisCosts } from "@/lib/calculations";
import BoqPageClient from "@/components/boq/BoqPageClient";
import type { BoqItemWithCosts } from "@/types/boq";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bill of Quantities",
};

export default async function BoqPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const prisma = getPrismaForProject(projectId);
  const items = await getBoqItems(prisma, projectId, { sort: "code" });

  const serializedItems: BoqItemWithCosts[] = items.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    description: null,
    unit: item.unit,
    quantity: Number(item.quantity),
    costs: item.costs,
    boqAnalyses: item.boqAnalyses.map((ba) => {
      const analysisCosts = computeAnalysisCosts(
        ba.analysis.baseQuantity,
        ba.analysis.resources
      );
      return {
        id: ba.id,
        analysisId: ba.analysisId,
        coefficient: Number(ba.coefficient),
        analysis: {
          id: ba.analysis.id,
          code: ba.analysis.code,
          name: ba.analysis.name,
          unit: ba.analysis.unit,
          unitRateDC: analysisCosts.unitRateDC,
          unitRateDP: analysisCosts.unitRateDP,
          unitRateTC: analysisCosts.unitRateTC,
        },
      };
    }),
  }));

  return (
    <BoqPageClient projectId={projectId} initialBoqItems={serializedItems} />
  );
}
