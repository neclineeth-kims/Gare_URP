import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { BoqAnalysisUpdateSchema, parseBody } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string; resourceId: string }> }
) {
  try {
    const { projectId, id: boqItemId, resourceId } = await params;
    const prisma = await getPrismaForProject(projectId);
    const body = await req.json();

    const parsed = parseBody(BoqAnalysisUpdateSchema, body);
    if (!parsed.ok) return parsed.response;
    const { coefficient: coeff } = parsed.data;

    const boqItem = await prisma.boqItem.findFirst({
      where: { id: boqItemId, projectId },
    });
    if (!boqItem) {
      return NextResponse.json({ error: "BoQ item not found" }, { status: 404 });
    }

    const boqAnalysis = await prisma.boqAnalysis.findFirst({
      where: { id: resourceId, boqItemId },
    });
    if (!boqAnalysis) {
      return NextResponse.json({ error: "BoQ analysis link not found" }, { status: 404 });
    }

    const updated = await prisma.boqAnalysis.update({
      where: { id: resourceId },
      data: { coefficient: new Decimal(coeff) },
      include: {
        analysis: {
          include: {
            resources: {
              include: {
                labor: true,
                material: true,
                equipment: {
                  include: {
                    subResources: { include: { labor: true, material: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      data: {
        ...updated,
        coefficient: updated.coefficient.toString(),
        analysis: {
          ...updated.analysis,
          baseQuantity: updated.analysis.baseQuantity.toString(),
        },
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update coefficient" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string; resourceId: string }> }
) {
  try {
    const { projectId, id: boqItemId, resourceId } = await params;
    const prisma = await getPrismaForProject(projectId);
    const boqItem = await prisma.boqItem.findFirst({
      where: { id: boqItemId, projectId },
    });
    if (!boqItem) {
      return NextResponse.json({ error: "BoQ item not found" }, { status: 404 });
    }

    const boqAnalysis = await prisma.boqAnalysis.findFirst({
      where: { id: resourceId, boqItemId },
    });
    if (!boqAnalysis) {
      return NextResponse.json({ error: "BoQ analysis link not found" }, { status: 404 });
    }

    await prisma.boqAnalysis.delete({ where: { id: resourceId } });
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to remove analysis link" },
      { status: 500 }
    );
  }
}
