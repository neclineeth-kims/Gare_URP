import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;
  const labor = await prisma.labor.findFirst({
    where: { id, projectId },
  });
  if (!labor) {
    return NextResponse.json({ error: "Labor not found" }, { status: 404 });
  }
  return NextResponse.json({ data: labor });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  try {
    const { projectId, id } = await params;
    const body = await req.json();
    const { code, name, unit, rate } = body;

    const existing = await prisma.labor.findFirst({ where: { id, projectId } });
    if (!existing) {
      return NextResponse.json({ error: "Labor not found" }, { status: 404 });
    }

    const labor = await prisma.labor.update({
      where: { id },
      data: {
        ...(code != null && { code: String(code).trim() }),
        ...(name != null && { name: String(name).trim() }),
        ...(unit != null && { unit: String(unit).trim() }),
        ...(rate != null && { rate: new Decimal(Number(rate)) }),
      },
    });
    return NextResponse.json({ data: labor });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update labor" },
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
