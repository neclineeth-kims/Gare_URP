import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const prisma = getPrismaForProject(projectId);
    const labor = await prisma.labor.findMany({
    where: { projectId },
    orderBy: { code: "asc" },
    });
    return NextResponse.json({ data: labor, count: labor.length });
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    throw e;
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
    const { code, name, unit, rate, currencySlot } = body;

    if (!code || !name || !unit || rate == null) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, unit, rate" },
        { status: 400 }
      );
    }

    const slot = currencySlot != null ? Number(currencySlot) : 1;
    if (slot < 1 || slot > 5 || !Number.isInteger(slot)) {
      return NextResponse.json(
        { error: "currencySlot must be 1-5" },
        { status: 400 }
      );
    }

    const labor = await prisma.labor.create({
      data: {
        projectId,
        code: String(code).trim(),
        name: String(name).trim(),
        unit: String(unit).trim(),
        rate: new Decimal(Number(rate)),
        currencySlot: slot,
      },
    });
    return NextResponse.json({ data: labor });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create labor" },
      { status: 500 }
    );
  }
}
