import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string; resourceId: string }> }
) {
  try {
    const { projectId, id: equipmentId, resourceId } = await params;
    const body = await req.json();
    const { quantity } = body;

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

    const resource = await prisma.equipmentResource.findFirst({
      where: { id: resourceId, equipmentId },
    });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const updated = await prisma.equipmentResource.update({
      where: { id: resourceId },
      data: { quantity: new Decimal(Number(quantity)) },
      include: { labor: true, material: true },
    });

    return NextResponse.json({
      data: {
        ...updated,
        quantity: updated.quantity.toString(),
        labor: updated.labor
          ? { ...updated.labor, rate: updated.labor.rate.toString() }
          : null,
        material: updated.material
          ? { ...updated.material, rate: updated.material.rate.toString() }
          : null,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update resource" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string; resourceId: string }> }
) {
  try {
    const { projectId, id: equipmentId, resourceId } = await params;

    const equipment = await prisma.equipment.findFirst({
      where: { id: equipmentId, projectId },
    });
    if (!equipment) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    const resource = await prisma.equipmentResource.findFirst({
      where: { id: resourceId, equipmentId },
    });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    await prisma.equipmentResource.delete({ where: { id: resourceId } });
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete resource" },
      { status: 500 }
    );
  }
}
