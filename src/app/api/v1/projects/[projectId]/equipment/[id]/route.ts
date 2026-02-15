import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeEquipmentCosts } from "@/lib/calculations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;
  const equipment = await prisma.equipment.findFirst({
    where: { id, projectId },
    include: { subResources: { include: { labor: true, material: true } } },
  });

  if (!equipment) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  const { edc, edp, etc } = computeEquipmentCosts(
    equipment.totalValue,
    equipment.depreciationTotal,
    equipment.subResources
  );

  return NextResponse.json({
    data: {
      ...equipment,
      totalValue: equipment.totalValue.toString(),
      depreciationTotal: equipment.depreciationTotal.toString(),
      subResources: equipment.subResources.map((sr) => ({
        ...sr,
        quantity: sr.quantity.toString(),
        labor: sr.labor
          ? { ...sr.labor, rate: sr.labor.rate.toString() }
          : null,
        material: sr.material
          ? { ...sr.material, rate: sr.material.rate.toString() }
          : null,
      })),
      costs: { edc, edp, etc },
    },
  });
}
