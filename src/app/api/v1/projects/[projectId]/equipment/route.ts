import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject, getEquipmentList, createEquipment } from "@/lib/db";
import type { CreateEquipmentInput, SubResourceInput } from "@/lib/db";

type SubResourceRequestBody = {
  resourceId: string;
  quantity: number | string;
  rate?: number | string;
};

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const prisma = getPrismaForProject(projectId);
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

    if (!code || !name || !unit || total_value == null || depreciation_total == null) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, unit, total_value, depreciation_total" },
        { status: 400 }
      );
    }

    const input: CreateEquipmentInput = {
      code: String(code).trim(),
      name: String(name).trim(),
      unit: String(unit).trim(),
      totalValue: Number(total_value),
      depreciationTotal: Number(depreciation_total),
      laborSubResources: laborSubResources?.map((sr: SubResourceRequestBody): SubResourceInput => ({
        resourceId: sr.resourceId,
        quantity: Number(sr.quantity),
        rate: sr.rate != null ? Number(sr.rate) : undefined,
      })),
      materialSubResources: materialSubResources?.map((sr: SubResourceRequestBody): SubResourceInput => ({
        resourceId: sr.resourceId,
        quantity: Number(sr.quantity),
        rate: sr.rate != null ? Number(sr.rate) : undefined,
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
    const status = e instanceof Error && e.message.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create equipment" },
      { status }
    );
  }
}
