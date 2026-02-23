import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject, getAnalysisById, updateAnalysis, deleteAnalysis } from "@/lib/db";
import type { UpdateAnalysisInput, AnalysisResourceInput } from "@/lib/db";

type AnalysisResourceRequestBody = {
  resourceType: string;
  resourceId: string;
  quantity: number | string;
};

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = await getPrismaForProject(projectId);
    const analysis = await getAnalysisById(prisma, projectId, id);

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

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
            ? {
                ...r.labor,
                rate: r.labor.rate.toString(),
                createdAt: r.labor.createdAt.toISOString(),
                updatedAt: r.labor.updatedAt.toISOString(),
              }
            : null,
          material: r.material
            ? {
                ...r.material,
                rate: r.material.rate.toString(),
                createdAt: r.material.createdAt.toISOString(),
                updatedAt: r.material.updatedAt.toISOString(),
              }
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
                    ? {
                        ...sr.labor,
                        rate: sr.labor.rate.toString(),
                        createdAt: sr.labor.createdAt.toISOString(),
                        updatedAt: sr.labor.updatedAt.toISOString(),
                      }
                    : null,
                  material: sr.material
                    ? {
                        ...sr.material,
                        rate: sr.material.rate.toString(),
                        createdAt: sr.material.createdAt.toISOString(),
                        updatedAt: sr.material.updatedAt.toISOString(),
                      }
                    : null,
                })),
              }
            : null,
        })),
        costs: analysis.costs,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch analysis" },
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
    const prisma = await getPrismaForProject(projectId);
    const body = await req.json();
    const { code, name, unit, base_quantity, resources } = body;

    const input: UpdateAnalysisInput = {};

    if (code != null) input.code = String(code).trim();
    if (name != null) input.name = String(name).trim();
    if (unit != null) input.unit = String(unit).trim();
    if (base_quantity != null) input.baseQuantity = Number(base_quantity);
    if (resources !== undefined) {
      input.resources = resources.map((res: AnalysisResourceRequestBody): AnalysisResourceInput => ({
        resourceType: res.resourceType as "labor" | "material" | "equipment",
        resourceId: res.resourceId,
        quantity: Number(res.quantity),
      }));
    }

    const analysis = await updateAnalysis(prisma, projectId, id, input);

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
            ? {
                ...r.labor,
                rate: r.labor.rate.toString(),
                createdAt: r.labor.createdAt.toISOString(),
                updatedAt: r.labor.updatedAt.toISOString(),
              }
            : null,
          material: r.material
            ? {
                ...r.material,
                rate: r.material.rate.toString(),
                createdAt: r.material.createdAt.toISOString(),
                updatedAt: r.material.updatedAt.toISOString(),
              }
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
                    ? {
                        ...sr.labor,
                        rate: sr.labor.rate.toString(),
                        createdAt: sr.labor.createdAt.toISOString(),
                        updatedAt: sr.labor.updatedAt.toISOString(),
                      }
                    : null,
                  material: sr.material
                    ? {
                        ...sr.material,
                        rate: sr.material.rate.toString(),
                        createdAt: sr.material.createdAt.toISOString(),
                        updatedAt: sr.material.updatedAt.toISOString(),
                      }
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
      { error: e instanceof Error ? e.message : "Failed to update analysis" },
      { status }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = await getPrismaForProject(projectId);
    await deleteAnalysis(prisma, projectId, id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    const status = e instanceof Error && e.message.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete analysis" },
      { status }
    );
  }
}
