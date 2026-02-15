import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { computeAnalysisCosts } from "@/lib/calculations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const analysis = await prisma.analysis.findMany({
    where: { projectId },
    include: {
      resources: {
        include: {
          labor: true,
          material: true,
          equipment: { include: { subResources: { include: { labor: true, material: true } } } },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  const data = analysis.map((a) => {
    const costs = computeAnalysisCosts(a.baseQuantity, a.resources);
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      unit: a.unit,
      baseQuantity: a.baseQuantity.toString(),
      costs: {
        directCost: costs.directCost,
        depreciation: costs.depreciation,
        totalCost: costs.totalCost,
        unitRateDC: costs.unitRateDC,
        unitRateDP: costs.unitRateDP,
        unitRateTC: costs.unitRateTC,
      },
    };
  });

  return NextResponse.json({ data, count: data.length });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await req.json();
    const { code, name, unit, base_quantity } = body;

    if (!code || !name || !unit || base_quantity == null) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, unit, base_quantity" },
        { status: 400 }
      );
    }

    const analysis = await prisma.analysis.create({
      data: {
        projectId,
        code: String(code).trim(),
        name: String(name).trim(),
        unit: String(unit).trim(),
        baseQuantity: new Decimal(Number(base_quantity)),
      },
    });
    return NextResponse.json({
      data: {
        ...analysis,
        baseQuantity: analysis.baseQuantity.toString(),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create analysis" },
      { status: 500 }
    );
  }
}
