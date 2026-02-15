import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id: equipmentId } = await params;

  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, projectId },
  });
  if (!equipment) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  const resources = await prisma.equipmentResource.findMany({
    where: { equipmentId },
    include: { labor: true, material: true },
  });

  const data = resources.map((r) => ({
    ...r,
    quantity: r.quantity.toString(),
    labor: r.labor ? { ...r.labor, rate: r.labor.rate.toString() } : null,
    material: r.material ? { ...r.material, rate: r.material.rate.toString() } : null,
  }));

  return NextResponse.json({ data, count: data.length });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id: equipmentId } = await params;
    const body = await req.json();
    const { resource_type, labor_id, material_id, quantity } = body;

    if (resource_type !== "labor" && resource_type !== "material") {
      return NextResponse.json(
        { error: "resource_type must be 'labor' or 'material'" },
        { status: 400 }
      );
    }
    if (!quantity || Number(quantity) <= 0) {
      return NextResponse.json(
        { error: "quantity must be a positive number" },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.findFirst({
      where: { id: equipmentId, projectId },
    });
    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    let laborId: string | null = null;
    let materialId: string | null = null;

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
    } else {
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
    }

    const existing = await prisma.equipmentResource.findFirst({
      where: {
        equipmentId,
        laborId,
        materialId,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This resource is already added to the equipment" },
        { status: 400 }
      );
    }

    const resource = await prisma.equipmentResource.create({
      data: {
        equipmentId,
        resourceType: resource_type,
        laborId,
        materialId,
        quantity: new Decimal(Number(quantity)),
      },
      include: { labor: true, material: true },
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
