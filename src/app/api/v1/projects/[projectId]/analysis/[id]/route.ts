import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { computeAnalysisCosts } from "@/lib/calculations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;
  const analysis = await prisma.analysis.findFirst({
    where: { id, projectId },
    include: {
      resources: {
        include: {
          labor: true,
          material: true,
          equipment: { include: { subResources: { include: { labor: true, material: true } } } },
        },
      },
    },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const costs = computeAnalysisCosts(analysis.baseQuantity, analysis.resources);

  const resources = analysis.resources.map((r) => ({
    ...r,
    quantity: r.quantity.toString(),
    labor: r.labor ? { ...r.labor, rate: r.labor.rate.toString() } : null,
    material: r.material ? { ...r.material, rate: r.material.rate.toString() } : null,
    equipment: r.equipment
      ? {
          ...r.equipment,
          totalValue: r.equipment.totalValue.toString(),
          depreciationTotal: r.equipment.depreciationTotal.toString(),
          subResources: r.equipment.subResources.map((sr) => ({
            ...sr,
            quantity: sr.quantity.toString(),
            labor: sr.labor ? { ...sr.labor, rate: sr.labor.rate.toString() } : null,
            material: sr.material ? { ...sr.material, rate: sr.material.rate.toString() } : null,
          })),
        }
      : null,
  }));

  return NextResponse.json({
    data: {
      ...analysis,
      baseQuantity: analysis.baseQuantity.toString(),
      resources,
      costs: {
        directCost: costs.directCost,
        depreciation: costs.depreciation,
        totalCost: costs.totalCost,
        unitRateDC: costs.unitRateDC,
        unitRateDP: costs.unitRateDP,
        unitRateTC: costs.unitRateTC,
      },
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const body = await req.json();
    const { code, name, unit, base_quantity } = body;

    const existing = await prisma.analysis.findFirst({ where: { id, projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const analysis = await prisma.analysis.update({
      where: { id },
      data: {
        ...(code != null && { code: String(code).trim() }),
        ...(name != null && { name: String(name).trim() }),
        ...(unit != null && { unit: String(unit).trim() }),
        ...(base_quantity != null && { baseQuantity: new Decimal(Number(base_quantity)) }),
      },
    });
    return NextResponse.json({
      data: { ...analysis, baseQuantity: analysis.baseQuantity.toString() },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update analysis" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const existing = await prisma.analysis.findFirst({ where: { id, projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    await prisma.analysis.delete({ where: { id } });
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete analysis" },
      { status: 500 }
    );
  }
}
