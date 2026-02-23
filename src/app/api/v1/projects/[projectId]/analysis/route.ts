import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject, getAnalyses, createAnalysis } from "@/lib/db";
import type { CreateAnalysisInput, AnalysisResourceInput } from "@/lib/db";

type AnalysisResourceRequestBody = {
  resourceType: string;
  resourceId: string;
  quantity: number | string;
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

    const analyses = await getAnalyses(prisma, projectId, { search, sort });

    const data = analyses.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      unit: a.unit,
      baseQuantity: a.baseQuantity.toString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      resources: a.resources.map((r) => ({
        id: r.id,
        resourceType: r.resourceType,
        quantity: r.quantity.toString(),
        labor: r.labor
          ? {
              id: r.labor.id,
              code: r.labor.code,
              name: r.labor.name,
              unit: r.labor.unit,
              rate: r.labor.rate.toString(),
            }
          : null,
        material: r.material
          ? {
              id: r.material.id,
              code: r.material.code,
              name: r.material.name,
              unit: r.material.unit,
              rate: r.material.rate.toString(),
            }
          : null,
        equipment: r.equipment
          ? {
              id: r.equipment.id,
              code: r.equipment.code,
              name: r.equipment.name,
              unit: r.equipment.unit,
              totalValue: r.equipment.totalValue.toString(),
              depreciationTotal: r.equipment.depreciationTotal.toString(),
              subResources: r.equipment.subResources.map((sr) => ({
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
            }
          : null,
      })),
      costs: {
        directCost: a.costs.directCost,
        depreciation: a.costs.depreciation,
        totalCost: a.costs.totalCost,
        unitRateDC: a.costs.unitRateDC,
        unitRateDP: a.costs.unitRateDP,
        unitRateTC: a.costs.unitRateTC,
      },
    }));

    return NextResponse.json({ data, count: data.length });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch analyses" },
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
    const { code, name, unit, base_quantity, resources } = body;

    if (!code || !name || !unit || base_quantity == null) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, unit, base_quantity" },
        { status: 400 }
      );
    }

    const input: CreateAnalysisInput = {
      code: String(code).trim(),
      name: String(name).trim(),
      unit: String(unit).trim(),
      baseQuantity: Number(base_quantity),
      resources: resources?.map((res: AnalysisResourceRequestBody): AnalysisResourceInput => ({
        resourceType: res.resourceType as "labor" | "material" | "equipment",
        resourceId: res.resourceId,
        quantity: Number(res.quantity),
      })),
    };

    const analysis = await createAnalysis(prisma, projectId, input);

    return NextResponse.json({
      data: {
        ...analysis,
        baseQuantity: analysis.baseQuantity.toString(),
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: analysis.updatedAt.toISOString(),
        resources: analysis.resources.map((r) => ({
          ...r,
          quantity: r.quantity.toString(),
          createdAt: r.createdAt.toISOString(),
          labor: r.labor
            ? { ...r.labor, rate: r.labor.rate.toString(), createdAt: r.labor.createdAt.toISOString(), updatedAt: r.labor.updatedAt.toISOString() }
            : null,
          material: r.material
            ? { ...r.material, rate: r.material.rate.toString(), createdAt: r.material.createdAt.toISOString(), updatedAt: r.material.updatedAt.toISOString() }
            : null,
          equipment: r.equipment
            ? {
                ...r.equipment,
                totalValue: r.equipment.totalValue.toString(),
                depreciationTotal: r.equipment.depreciationTotal.toString(),
                createdAt: r.equipment.createdAt.toISOString(),
                updatedAt: r.equipment.updatedAt.toISOString(),
                subResources: r.equipment.subResources.map((sr) => ({
                  ...sr,
                  quantity: sr.quantity.toString(),
                  createdAt: sr.createdAt.toISOString(),
                  labor: sr.labor
                    ? { ...sr.labor, rate: sr.labor.rate.toString(), createdAt: sr.labor.createdAt.toISOString(), updatedAt: sr.labor.updatedAt.toISOString() }
                    : null,
                  material: sr.material
                    ? { ...sr.material, rate: sr.material.rate.toString(), createdAt: sr.material.createdAt.toISOString(), updatedAt: sr.material.updatedAt.toISOString() }
                    : null,
                })),
              }
            : null,
        })),
        costs: analysis.costs,
      },
    });
  } catch (e) {
    console.error(e);
    const status = e instanceof Error && e.message.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create analysis" },
      { status }
    );
  }
}
