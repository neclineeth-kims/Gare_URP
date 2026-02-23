import { NextRequest, NextResponse } from "next/server";
import {
  getPrismaForProject,
  getBoqItems,
  createBoqItem,
  type CreateBoqItemInput,
} from "@/lib/db";
import { computeAnalysisCosts } from "@/lib/calculations";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const prisma = getPrismaForProject(projectId);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;
    const sort = (searchParams.get("sort") as "code" | "name" | null) ?? undefined;

    const items = await getBoqItems(prisma, projectId, {
      search: search || undefined,
      sort: sort ?? "code",
    });

    const data = items.map((item) => ({
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
    }));

    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list BoQ items" },
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
    const { code, name, unit, quantity, analyses } = body;

    if (!code || !name || !unit || quantity == null) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, unit, quantity" },
        { status: 400 }
      );
    }

    const input: CreateBoqItemInput = {
      code: String(code).trim(),
      name: String(name).trim(),
      unit: String(unit).trim(),
      quantity: Number(quantity),
    };

    if (Array.isArray(analyses) && analyses.length > 0) {
      input.analyses = analyses.map((a: { analysisId: string; coefficient: number }) => ({
        analysisId: String(a.analysisId),
        coefficient: Number(a.coefficient),
      }));
    }

    const item = await createBoqItem(prisma, projectId, input);

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
    const message = e instanceof Error ? e.message : "Failed to create BoQ item";
    const status =
      message.includes("not found") || message.includes("does not belong")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
