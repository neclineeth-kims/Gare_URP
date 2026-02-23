import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string; resourceId: string }> }
) {
  try {
    const { projectId, id: analysisId, resourceId } = await params;
    const prisma = await getPrismaForProject(projectId);
    const body = await req.json();
    const { quantity } = body;

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

    const resource = await prisma.analysisResource.findFirst({
      where: { id: resourceId, analysisId },
    });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const updated = await prisma.analysisResource.update({
      where: { id: resourceId },
      data: { quantity: new Decimal(Number(quantity)) },
      include: {
        labor: true,
        material: true,
        equipment: { include: { subResources: { include: { labor: true, material: true } } } },
      },
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
        equipment: updated.equipment
          ? {
              ...updated.equipment,
              totalValue: updated.equipment.totalValue.toString(),
              depreciationTotal: updated.equipment.depreciationTotal.toString(),
            }
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
    const { projectId, id: analysisId, resourceId } = await params;
    const prisma = await getPrismaForProject(projectId);
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, projectId },
    });
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const resource = await prisma.analysisResource.findFirst({
      where: { id: resourceId, analysisId },
    });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    await prisma.analysisResource.delete({ where: { id: resourceId } });
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete resource" },
      { status: 500 }
    );
  }
}
