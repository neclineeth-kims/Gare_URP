import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { explodeProject } from "@/lib/calculations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const boqItems = await prisma.boqItem.findMany({
    where: { projectId },
    include: {
      boqAnalyses: {
        include: {
          analysis: {
            include: {
              resources: {
                include: {
                  labor: true,
                  material: true,
                  equipment: {
                    include: {
                      subResources: { include: { labor: true, material: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const explosion = explodeProject(boqItems);

  // Serialize Decimal fields for JSON
  const labor = explosion.labor.map((l) => ({
    resource: {
      ...l.resource,
      rate: l.resource.rate.toString(),
    },
    totalQty: l.totalQty,
  }));

  const materials = explosion.materials.map((m) => ({
    resource: {
      ...m.resource,
      rate: m.resource.rate.toString(),
    },
    totalQty: m.totalQty,
  }));

  return NextResponse.json({
    data: {
      labor,
      materials,
      equipment: explosion.equipment,
      totalLaborCost: explosion.totalLaborCost,
      totalMaterialCost: explosion.totalMaterialCost,
      totalDirectCost: explosion.totalDirectCost,
      totalDepreciation: explosion.totalDepreciation,
      grandTotal: explosion.grandTotal,
      boqSummary: explosion.boqSummary,
    },
  });
}
