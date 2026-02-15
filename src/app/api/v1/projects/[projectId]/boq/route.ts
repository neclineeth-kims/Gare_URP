import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { computeBoqCosts } from "@/lib/calculations";

const analysisInclude = {
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
};

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
          analysis: { include: analysisInclude },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  const data = boqItems.map((item) => {
    const costs = computeBoqCosts(item.quantity, item.boqAnalyses);
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity.toString(),
      costs: {
        unitRateDC: costs.unitRateDC,
        unitRateDP: costs.unitRateDP,
        unitRateTC: costs.unitRateTC,
        totalDC: costs.totalDC,
        totalDP: costs.totalDP,
        totalTC: costs.totalTC,
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
    const { code, name, unit, quantity } = body;

    if (!code || !name || !unit || quantity == null) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, unit, quantity" },
        { status: 400 }
      );
    }

    const boqItem = await prisma.boqItem.create({
      data: {
        projectId,
        code: String(code).trim(),
        name: String(name).trim(),
        unit: String(unit).trim(),
        quantity: new Decimal(Number(quantity)),
      },
    });
    return NextResponse.json({
      data: {
        ...boqItem,
        quantity: boqItem.quantity.toString(),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create BoQ item" },
      { status: 500 }
    );
  }
}
