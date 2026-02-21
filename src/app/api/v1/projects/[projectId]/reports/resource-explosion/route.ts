import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { getCurrencyMultipliers, applyConversionToBoqAnalyses } from "@/lib/currency";
import { explodeProject } from "@/lib/calculations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const prisma = getPrismaForProject(projectId);
    const multipliers = await getCurrencyMultipliers(prisma, projectId);

    const boqItemsRaw = await prisma.boqItem.findMany({
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

    const boqItems = boqItemsRaw.map((item) => ({
      ...item,
      boqAnalyses: applyConversionToBoqAnalyses(item.boqAnalyses, multipliers),
    }));

    const explosion = explodeProject(boqItems);

    // Report should show ALL project resources (including unused ones as 0 totals)
    const [allLabor, allMaterials, allEquipment] = await Promise.all([
    prisma.labor.findMany({
      where: { projectId },
      select: { id: true, code: true, name: true, unit: true, rate: true, currencySlot: true },
      orderBy: { code: "asc" },
    }),
    prisma.material.findMany({
      where: { projectId },
      select: { id: true, code: true, name: true, unit: true, rate: true, currencySlot: true },
      orderBy: { code: "asc" },
    }),
    prisma.equipment.findMany({
      where: { projectId },
      select: { id: true, code: true, name: true, unit: true, totalValue: true, depreciationTotal: true },
      orderBy: { code: "asc" },
    }),
    ]);

    const laborUsedById = new Map(explosion.labor.map((l) => [l.resource.id, l.totalQty]));
    const materialUsedById = new Map(explosion.materials.map((m) => [m.resource.id, m.totalQty]));
    const equipmentUsedById = new Map(explosion.equipment.map((e) => [e.resource.id, e]));

    const { convertRate } = await import("@/lib/currency");

    const labor = allLabor.map((l) => {
      const convertedRate = convertRate(Number(l.rate), l.currencySlot ?? 1, multipliers);
      return {
        resource: {
          code: l.code,
          name: l.name,
          unit: l.unit,
          rate: String(convertedRate),
        },
        totalQty: laborUsedById.get(l.id) ?? 0,
      };
    });

    const materials = allMaterials.map((m) => {
      const convertedRate = convertRate(Number(m.rate), m.currencySlot ?? 1, multipliers);
      return {
        resource: {
          code: m.code,
          name: m.name,
          unit: m.unit,
          rate: String(convertedRate),
        },
        totalQty: materialUsedById.get(m.id) ?? 0,
      };
    });

    const equipment = allEquipment.map((e) => {
    const used = equipmentUsedById.get(e.id);
    const deprPerUnit = Number(e.depreciationTotal) > 0 ? Number(e.totalValue) / Number(e.depreciationTotal) : 0;
    const totalHours = used?.totalHours ?? 0;
    return {
      resource: { code: e.code, name: e.name, unit: e.unit },
      totalHours,
      deprPerUnit: used?.deprPerUnit ?? deprPerUnit,
      totalDepreciation: totalHours * (used?.deprPerUnit ?? deprPerUnit),
    };
    });

    return NextResponse.json({
      data: {
          labor,
        materials,
        equipment,
        totalLaborCost: explosion.totalLaborCost,
        totalMaterialCost: explosion.totalMaterialCost,
        totalDirectCost: explosion.totalDirectCost,
        totalDepreciation: explosion.totalDepreciation,
        grandTotal: explosion.grandTotal,
        boqSummary: explosion.boqSummary,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    throw e;
  }
}
