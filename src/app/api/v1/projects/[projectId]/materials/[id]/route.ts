import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = getPrismaForProject(projectId);
    const material = await prisma.material.findFirst({
    where: { id, projectId },
    });
    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }
    return NextResponse.json({ data: material });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    throw e;
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
    const { code, name, unit, rate, currencySlot } = body;

    const existing = await prisma.material.findFirst({ where: { id, projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const updateData: { code?: string; name?: string; unit?: string; rate?: Decimal; currencySlot?: number } = {};
    if (code != null) updateData.code = String(code).trim();
    if (name != null) updateData.name = String(name).trim();
    if (unit != null) updateData.unit = String(unit).trim();
    if (rate != null) updateData.rate = new Decimal(Number(rate));
    if (currencySlot != null) {
      const slot = Number(currencySlot);
      if (slot < 1 || slot > 5 || !Number.isInteger(slot)) {
        return NextResponse.json({ error: "currencySlot must be 1-5" }, { status: 400 });
      }
      updateData.currencySlot = slot;
    }

    const material = await prisma.material.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ data: material });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update material" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = getPrismaForProject(projectId);
    const existing = await prisma.material.findFirst({ where: { id, projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }
    await prisma.material.delete({ where: { id } });
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete material" },
      { status: 500 }
    );
  }
}
