import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject, getEquipmentById, updateEquipment, deleteEquipment } from "@/lib/db";
import type { UpdateEquipmentInput, SubResourceInput } from "@/lib/db";

type SubResourceRequestBody = {
  resourceId: string;
  quantity: number | string;
  rate?: number | string;
};

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = getPrismaForProject(projectId);
    const equipment = await getEquipmentById(prisma, projectId, id);

    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

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
        costs: equipment.costs,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch equipment" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = getPrismaForProject(projectId);
    const body = await req.json();
    const {
      code,
      name,
      unit,
      total_value,
      depreciation_total,
      laborSubResources,
      materialSubResources,
    } = body;

    const input: UpdateEquipmentInput = {};

    if (code != null) input.code = String(code).trim();
    if (name != null) input.name = String(name).trim();
    if (unit != null) input.unit = String(unit).trim();
    if (total_value != null) input.totalValue = Number(total_value);
    if (depreciation_total != null) input.depreciationTotal = Number(depreciation_total);
    if (laborSubResources !== undefined) {
      input.laborSubResources = laborSubResources.map((sr: SubResourceRequestBody): SubResourceInput => ({
        resourceId: sr.resourceId,
        quantity: Number(sr.quantity),
        rate: sr.rate != null ? Number(sr.rate) : undefined,
      }));
    }
    if (materialSubResources !== undefined) {
      input.materialSubResources = materialSubResources.map((sr: SubResourceRequestBody): SubResourceInput => ({
        resourceId: sr.resourceId,
        quantity: Number(sr.quantity),
        rate: sr.rate != null ? Number(sr.rate) : undefined,
      }));
    }

    const equipment = await updateEquipment(prisma, projectId, id, input);

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
        costs: equipment.costs,
      },
    });
  } catch (e) {
    console.error(e);
    const status = e instanceof Error && e.message.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update equipment" },
      { status }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = getPrismaForProject(projectId);
    await deleteEquipment(prisma, projectId, id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    const status = e instanceof Error && e.message.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete equipment" },
      { status }
    );
  }
}
