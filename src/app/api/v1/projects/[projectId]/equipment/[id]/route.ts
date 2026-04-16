import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject, getEquipmentById, updateEquipment, deleteEquipment } from "@/lib/db";
import type { UpdateEquipmentInput, SubResourceInput } from "@/lib/db";
import { EquipmentUpdateSchema, parseBody } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = await getPrismaForProject(projectId);
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
    const prisma = await getPrismaForProject(projectId);
    const body = await req.json();

    const parsed = parseBody(EquipmentUpdateSchema, body);
    if (!parsed.ok) return parsed.response;
    const { code, name, unit, total_value, depreciation_total, laborSubResources, materialSubResources } = parsed.data;

    const input: UpdateEquipmentInput = {};

    if (code != null) input.code = code;
    if (name != null) input.name = name;
    if (unit != null) input.unit = unit;
    if (total_value != null) input.totalValue = total_value;
    if (depreciation_total != null) input.depreciationTotal = depreciation_total;
    if (laborSubResources !== undefined) {
      input.laborSubResources = laborSubResources.map((sr): SubResourceInput => ({
        resourceId: sr.resourceId,
        quantity: sr.quantity,
      }));
    }
    if (materialSubResources !== undefined) {
      input.materialSubResources = materialSubResources.map((sr): SubResourceInput => ({
        resourceId: sr.resourceId,
        quantity: sr.quantity,
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
    const raw = e instanceof Error ? e.message : "Failed to update equipment";
    const message = raw.includes("Unique constraint")
      ? "An equipment item with this code already exists in the project"
      : raw;
    const status = raw.includes("not found") ? 404 : raw.includes("Unique constraint") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = await getPrismaForProject(projectId);
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
