import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { computeEquipmentCosts } from "@/lib/calculations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const equipment = await prisma.equipment.findMany({
    where: { projectId },
    include: { subResources: { include: { labor: true, material: true } } },
    orderBy: { code: "asc" },
  });

  const data = equipment.map((eq) => {
    const { edc, edp, etc } = computeEquipmentCosts(
      eq.totalValue,
      eq.depreciationTotal,
      eq.subResources
    );
    return {
      id: eq.id,
      code: eq.code,
      name: eq.name,
      unit: eq.unit,
      totalValue: eq.totalValue.toString(),
      depreciationTotal: eq.depreciationTotal.toString(),
      edc: edc.toFixed(2),
      edp: edp.toFixed(2),
      etc: etc.toFixed(2),
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
    const { code, name, unit, total_value, depreciation_total } = body;

    if (!code || !name || !unit || total_value == null || depreciation_total == null) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, unit, total_value, depreciation_total" },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.create({
      data: {
        projectId,
        code: String(code).trim(),
        name: String(name).trim(),
        unit: String(unit).trim(),
        totalValue: new Decimal(Number(total_value)),
        depreciationTotal: new Decimal(Number(depreciation_total)),
      },
    });
    return NextResponse.json({ data: equipment });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create equipment" },
      { status: 500 }
    );
  }
}
