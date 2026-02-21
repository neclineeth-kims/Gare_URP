import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id: analysisId } = await params;
    const prisma = getPrismaForProject(projectId);
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
    const prisma = getPrismaForProject(projectId);
    const body = await req.json();
    const { resource_type, labor_id, material_id, equipment_id, quantity } = body;

    if (
      resource_type !== "labor" &&
      resource_type !== "material" &&
      resource_type !== "equipment"
    ) {
      return NextResponse.json(
        { error: "resource_type must be 'labor', 'material', or 'equipment'" },
        { status: 400 }
      );
    }
    if (!quantity || Number(quantity) <= 0) {
      return NextResponse.json(
        { error: "quantity must be a positive number" },
        { status: 400 }
      );
    }

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
      if (!labor_id) {
        return NextResponse.json(
          { error: "labor_id required for labor resource" },
          { status: 400 }
        );
      }
      const labor = await prisma.labor.findFirst({
        where: { id: labor_id, projectId },
      });
      if (!labor) {
        return NextResponse.json({ error: "Labor not found" }, { status: 404 });
      }
      laborId = labor_id;
    } else if (resource_type === "material") {
      if (!material_id) {
        return NextResponse.json(
          { error: "material_id required for material resource" },
          { status: 400 }
        );
      }
      const material = await prisma.material.findFirst({
        where: { id: material_id, projectId },
      });
      if (!material) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 });
      }
      materialId = material_id;
    } else {
      if (!equipment_id) {
        return NextResponse.json(
          { error: "equipment_id required for equipment resource" },
          { status: 400 }
        );
      }
      const equipment = await prisma.equipment.findFirst({
        where: { id: equipment_id, projectId },
      });
      if (!equipment) {
        return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
      }
      equipmentId = equipment_id;
    }

    const resource = await prisma.analysisResource.create({
      data: {
        analysisId,
        resourceType: resource_type,
        laborId,
        materialId,
        equipmentId,
        quantity: new Decimal(Number(quantity)),
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
