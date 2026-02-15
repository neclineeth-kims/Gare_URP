import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { computeBoqCosts, computeAnalysisCosts } from "@/lib/calculations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;
  const boqItem = await prisma.boqItem.findFirst({
    where: { id, projectId },
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

  if (!boqItem) {
    return NextResponse.json({ error: "BoQ item not found" }, { status: 404 });
  }

  const costs = computeBoqCosts(boqItem.quantity, boqItem.boqAnalyses);

  const boqAnalyses = boqItem.boqAnalyses.map((ba) => {
    const analysisCosts = computeAnalysisCosts(ba.analysis.baseQuantity, ba.analysis.resources);
    const coeff = Number(ba.coefficient);
    return {
      ...ba,
      coefficient: ba.coefficient.toString(),
      analysis: {
        ...ba.analysis,
        baseQuantity: ba.analysis.baseQuantity.toString(),
      },
      analysisCosts: {
        unitRateDC: analysisCosts.unitRateDC,
        unitRateDP: analysisCosts.unitRateDP,
        unitRateTC: analysisCosts.unitRateTC,
      },
      weightedDC: coeff * analysisCosts.unitRateDC,
      weightedDP: coeff * analysisCosts.unitRateDP,
      weightedTC: coeff * analysisCosts.unitRateTC,
    };
  });

  return NextResponse.json({
    data: {
      ...boqItem,
      quantity: boqItem.quantity.toString(),
      boqAnalyses,
      costs: {
        unitRateDC: costs.unitRateDC,
        unitRateDP: costs.unitRateDP,
        unitRateTC: costs.unitRateTC,
        totalDC: costs.totalDC,
        totalDP: costs.totalDP,
        totalTC: costs.totalTC,
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
    const { code, name, unit, quantity } = body;

    const existing = await prisma.boqItem.findFirst({ where: { id, projectId } });
    if (!existing) {
      return NextResponse.json({ error: "BoQ item not found" }, { status: 404 });
    }

    const boqItem = await prisma.boqItem.update({
      where: { id },
      data: {
        ...(code != null && { code: String(code).trim() }),
        ...(name != null && { name: String(name).trim() }),
        ...(unit != null && { unit: String(unit).trim() }),
        ...(quantity != null && { quantity: new Decimal(Number(quantity)) }),
      },
    });
    return NextResponse.json({
      data: { ...boqItem, quantity: boqItem.quantity.toString() },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update BoQ item" },
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
    const existing = await prisma.boqItem.findFirst({ where: { id, projectId } });
    if (!existing) {
      return NextResponse.json({ error: "BoQ item not found" }, { status: 404 });
    }
    await prisma.boqItem.delete({ where: { id } });
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete BoQ item" },
      { status: 500 }
    );
  }
}
