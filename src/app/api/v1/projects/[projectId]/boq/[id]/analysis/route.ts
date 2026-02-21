import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id: boqItemId } = await params;
    const prisma = getPrismaForProject(projectId);
    const boqItem = await prisma.boqItem.findFirst({
      where: { id: boqItemId, projectId },
    });
    if (!boqItem) {
      return NextResponse.json({ error: "BoQ item not found" }, { status: 404 });
    }

    const boqAnalyses = await prisma.boqAnalysis.findMany({
      where: { boqItemId },
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

    const data = boqAnalyses.map((ba) => ({
      ...ba,
      coefficient: ba.coefficient.toString(),
      analysis: {
        ...ba.analysis,
        baseQuantity: ba.analysis.baseQuantity.toString(),
      },
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
    const { projectId, id: boqItemId } = await params;
    const prisma = getPrismaForProject(projectId);
    const body = await req.json();
    const { analysis_id, coefficient } = body;

    if (!analysis_id || coefficient == null) {
      return NextResponse.json(
        { error: "analysis_id and coefficient required" },
        { status: 400 }
      );
    }

    const coeff = Number(coefficient);
    if (coeff <= 0) {
      return NextResponse.json(
        { error: "coefficient must be positive" },
        { status: 400 }
      );
    }

    const boqItem = await prisma.boqItem.findFirst({
      where: { id: boqItemId, projectId },
    });
    if (!boqItem) {
      return NextResponse.json({ error: "BoQ item not found" }, { status: 404 });
    }

    const analysis = await prisma.analysis.findFirst({
      where: { id: analysis_id, projectId },
    });
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const existing = await prisma.boqAnalysis.findFirst({
      where: { boqItemId, analysisId: analysis_id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This analysis is already linked to the BoQ item" },
        { status: 400 }
      );
    }

    const boqAnalysis = await prisma.boqAnalysis.create({
      data: {
        boqItemId,
        analysisId: analysis_id,
        coefficient: new Decimal(coeff),
      },
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
        ...boqAnalysis,
        coefficient: boqAnalysis.coefficient.toString(),
        analysis: {
          ...boqAnalysis.analysis,
          baseQuantity: boqAnalysis.analysis.baseQuantity.toString(),
        },
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to add analysis" },
      { status: 500 }
    );
  }
}
