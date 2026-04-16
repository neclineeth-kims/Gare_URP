import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject, getEquipmentList, createEquipment } from "@/lib/db";
import type { CreateEquipmentInput, SubResourceInput } from "@/lib/db";
import { EquipmentCreateSchema, parseBody } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const prisma = await getPrismaForProject(projectId);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const sort = (searchParams.get("sort") as "code" | "name" | null) || undefined;

    const equipment = await getEquipmentList(prisma, projectId, { search, sort });

    const data = equipment.map((eq) => ({
      id: eq.id,
      code: eq.code,
      name: eq.name,
      unit: eq.unit,
      totalValue: eq.totalValue.toString(),
      depreciationTotal: eq.depreciationTotal.toString(),
      createdAt: eq.createdAt.toISOString(),
      updatedAt: eq.updatedAt.toISOString(),
      subResources: eq.subResources.map((sr) => ({
        id: sr.id,
        resourceType: sr.resourceType,
        quantity: sr.quantity.toString(),
        labor: sr.labor
          ? {
              id: sr.labor.id,
              code: sr.labor.code,
              name: sr.labor.name,
              unit: sr.labor.unit,
              rate: sr.labor.rate.toString(),
            }
          : null,
        material: sr.material
          ? {
              id: sr.material.id,
              code: sr.material.code,
              name: sr.material.name,
              unit: sr.material.unit,
              rate: sr.material.rate.toString(),
            }
          : null,
      })),
      costs: {
        edc: eq.costs.edc,
        edp: eq.costs.edp,
        etc: eq.costs.etc,
      },
    }));

    return NextResponse.json({ data, count: data.length });
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const prisma = await getPrismaForProject(projectId);
    const body = await req.json();

    const parsed = parseBody(EquipmentCreateSchema, body);
    if (!parsed.ok) return parsed.response;
    const { code, name, unit, total_value, depreciation_total, laborSubResources, materialSubResources } = parsed.data;

    const input: CreateEquipmentInput = {
      code,
      name,
      unit,
      totalValue: total_value,
      depreciationTotal: depreciation_total,
      laborSubResources: laborSubResources?.map((sr): SubResourceInput => ({
        resourceId: sr.resourceId,
        quantity: sr.quantity,
      })),
      materialSubResources: materialSubResources?.map((sr): SubResourceInput => ({
        resourceId: sr.resourceId,
        quantity: sr.quantity,
      })),
    };

    const equipment = await createEquipment(prisma, projectId, input);

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
    const raw = e instanceof Error ? e.message : "Failed to create equipment";
    const message = raw.includes("Unique constraint")
      ? "An equipment item with this code already exists in the project"
      : raw;
    const status = raw.includes("not found") ? 404 : raw.includes("Unique constraint") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
