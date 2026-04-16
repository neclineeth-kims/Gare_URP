import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { LaborUpdateSchema, parseBody } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = await getPrismaForProject(projectId);
    const labor = await prisma.labor.findFirst({
    where: { id, projectId },
    });
    if (!labor) {
      return NextResponse.json({ error: "Labor not found" }, { status: 404 });
    }
    return NextResponse.json({ data: labor });
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
    const prisma = await getPrismaForProject(projectId);
    const body = await req.json();

    const parsed = parseBody(LaborUpdateSchema, body);
    if (!parsed.ok) return parsed.response;
    const { code, name, unit, rate, currencySlot } = parsed.data;

    const existing = await prisma.labor.findFirst({ where: { id, projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Labor not found" }, { status: 404 });
    }

    const updateData: { code?: string; name?: string; unit?: string; rate?: Decimal; currencySlot?: number } = {};
    if (code != null) updateData.code = code;
    if (name != null) updateData.name = name;
    if (unit != null) updateData.unit = unit;
    if (rate != null) updateData.rate = new Decimal(rate);
    if (currencySlot != null) updateData.currencySlot = currencySlot;

    const labor = await prisma.labor.update({ where: { id }, data: updateData });
    return NextResponse.json({ data: labor });
  } catch (e) {
    console.error(e);
    const raw = e instanceof Error ? e.message : "Failed to update labor";
    const message = raw.includes("Unique constraint")
      ? "A labor item with this code already exists in the project"
      : raw;
    return NextResponse.json({ error: message }, { status: raw.includes("Unique constraint") ? 400 : 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const prisma = await getPrismaForProject(projectId);
    const existing = await prisma.labor.findFirst({ where: { id, projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Labor not found" }, { status: 404 });
    }
    await prisma.labor.delete({ where: { id } });
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete labor" },
      { status: 500 }
    );
  }
}
