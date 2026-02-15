import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const materials = await prisma.material.findMany({
    where: { projectId },
    orderBy: { code: "asc" },
  });
  return NextResponse.json({ data: materials, count: materials.length });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await req.json();
    const { code, name, unit, rate } = body;

    if (!code || !name || !unit || rate == null) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, unit, rate" },
        { status: 400 }
      );
    }

    const material = await prisma.material.create({
      data: {
        projectId,
        code: String(code).trim(),
        name: String(name).trim(),
        unit: String(unit).trim(),
        rate: new Decimal(Number(rate)),
      },
    });
    return NextResponse.json({ data: material });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create material" },
      { status: 500 }
    );
  }
}
