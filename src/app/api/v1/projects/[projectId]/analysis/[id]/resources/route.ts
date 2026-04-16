import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { AnalysisResourceCreateSchema, parseBody } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id: analysisId } = await params;
    const prisma = await getPrismaForProject(projectId);
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, projectId },
    });
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const resources = await prisma.analysisResource.findMany({
      where: { analysisId },
      include: {
      labor: true,
      material: true,
      equipment: { include: { subResources: { include: { labor: true, material: true } } } },
      },
    });

    const data = resources.map((r) => ({
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
          })),
        }
      : null,
    }));

    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    throw e;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id: analysisId } = await params;
    const prisma = await getPrismaForProject(projectId);
    const body = await req.json();

    const parsed = parseBody(AnalysisResourceCreateSchema, body);
    if (!parsed.ok) return parsed.response;
    const { resource_type, labor_id, material_id, equipment_id, quantity } = parsed.data;

    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, projectId },
    });
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    let laborId: string | null = null;
    let materialId: string | null = null;
    let equipmentId: string | null = null;

    if (resource_type === "labor") {
      const labor = await prisma.labor.findFirst({
        where: { id: labor_id, projectId },
      });
      if (!labor) {
        return NextResponse.json({ error: "Labor not found" }, { status: 404 });
      }
      laborId = labor_id!;
    } else if (resource_type === "material") {
      const material = await prisma.material.findFirst({
        where: { id: material_id, projectId },
      });
      if (!material) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 });
      }
      materialId = material_id!;
    } else {
      const equipment = await prisma.equipment.findFirst({
        where: { id: equipment_id, projectId },
      });
      if (!equipment) {
        return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
      }
      equipmentId = equipment_id!;
    }

    const resource = await prisma.analysisResource.create({
      data: {
        analysisId,
        resourceType: resource_type,
        laborId,
        materialId,
        equipmentId,
        quantity: new Decimal(quantity),
      },
      include: {
        labor: true,
        material: true,
        equipment: { include: { subResources: { include: { labor: true, material: true } } } },
      },
    });

    return NextResponse.json({
      data: {
        ...resource,
        quantity: resource.quantity.toString(),
        labor: resource.labor
          ? { ...resource.labor, rate: resource.labor.rate.toString() }
          : null,
        material: resource.material
          ? { ...resource.material, rate: resource.material.rate.toString() }
          : null,
        equipment: resource.equipment
          ? {
              ...resource.equipment,
              totalValue: resource.equipment.totalValue.toString(),
              depreciationTotal: resource.equipment.depreciationTotal.toString(),
            }
          : null,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to add resource" },
      { status: 500 }
    );
  }
}
