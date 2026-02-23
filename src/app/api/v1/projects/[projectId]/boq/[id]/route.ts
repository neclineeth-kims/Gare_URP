import { NextRequest, NextResponse } from "next/server";
import {
  getPrismaForProject,
  getBoqItemById,
  updateBoqItem,
  deleteBoqItem,
  type UpdateBoqItemInput,
} from "@/lib/db";
import { computeAnalysisCosts } from "@/lib/calculations";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = getPrismaForProject(projectId);
    const item = await getBoqItemById(prisma, projectId, id);

    if (!item) {
      return NextResponse.json({ error: "BoQ item not found" }, { status: 404 });
    }

    const boqAnalyses = item.boqAnalyses.map((ba) => {
      const analysisCosts = computeAnalysisCosts(
        ba.analysis.baseQuantity,
        ba.analysis.resources
      );
      const coeff = Number(ba.coefficient);
      return {
        id: ba.id,
        analysisId: ba.analysisId,
        coefficient: ba.coefficient.toString(),
        analysis: {
          id: ba.analysis.id,
          code: ba.analysis.code,
          name: ba.analysis.name,
          unit: ba.analysis.unit,
          baseQuantity: ba.analysis.baseQuantity.toString(),
          unitRates: {
            unitRateDC: analysisCosts.unitRateDC,
            unitRateDP: analysisCosts.unitRateDP,
            unitRateTC: analysisCosts.unitRateTC,
          },
        },
        weightedDC: coeff * analysisCosts.unitRateDC,
        weightedDP: coeff * analysisCosts.unitRateDP,
        weightedTC: coeff * analysisCosts.unitRateTC,
      };
    });

    return NextResponse.json({
      data: {
        id: item.id,
        projectId: item.projectId,
        code: item.code,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity.toString(),
        costs: {
          unitRateDC: item.costs.unitRateDC,
          unitRateDP: item.costs.unitRateDP,
          unitRateTC: item.costs.unitRateTC,
          totalDC: item.costs.totalDC,
          totalDP: item.costs.totalDP,
          totalTC: item.costs.totalTC,
        },
        boqAnalyses,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch BoQ item" },
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
    const prisma = getPrismaForProject(projectId);
    const body = await req.json();
    const { code, name, unit, quantity, analyses } = body;

    const input: UpdateBoqItemInput = {};

    if (code != null) input.code = String(code).trim();
    if (name != null) input.name = String(name).trim();
    if (unit != null) input.unit = String(unit).trim();
    if (quantity != null) input.quantity = Number(quantity);
    if (Array.isArray(analyses)) {
      input.analyses = analyses.map(
        (a: { analysisId: string; coefficient: number }) => ({
          analysisId: String(a.analysisId),
          coefficient: Number(a.coefficient),
        })
      );
    }

    const item = await updateBoqItem(prisma, projectId, id, input);

    return NextResponse.json({
      data: {
        id: item.id,
        projectId: item.projectId,
        code: item.code,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity.toString(),
        costs: {
          unitRateDC: item.costs.unitRateDC,
          unitRateDP: item.costs.unitRateDP,
          unitRateTC: item.costs.unitRateTC,
          totalDC: item.costs.totalDC,
          totalDP: item.costs.totalDP,
          totalTC: item.costs.totalTC,
        },
        boqAnalyses: item.boqAnalyses.map((ba) => {
          const analysisCosts = computeAnalysisCosts(
            ba.analysis.baseQuantity,
            ba.analysis.resources
          );
          return {
            id: ba.id,
            analysisId: ba.analysisId,
            coefficient: ba.coefficient.toString(),
            analysis: {
              id: ba.analysis.id,
              code: ba.analysis.code,
              name: ba.analysis.name,
              unit: ba.analysis.unit,
              baseQuantity: ba.analysis.baseQuantity.toString(),
              unitRates: {
                unitRateDC: analysisCosts.unitRateDC,
                unitRateDP: analysisCosts.unitRateDP,
                unitRateTC: analysisCosts.unitRateTC,
              },
            },
          };
        }),
      },
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to update BoQ item";
    const status =
      message.includes("not found") || message.includes("does not belong")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = getPrismaForProject(projectId);
    await deleteBoqItem(prisma, projectId, id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to delete BoQ item";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
