import { NextRequest, NextResponse } from "next/server";
import { getPrismaForProject } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { MaterialCreateSchema, parseBody } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const prisma = await getPrismaForProject(projectId);
    const materials = await prisma.material.findMany({
    where: { projectId },
    orderBy: { code: "asc" },
    });
    return NextResponse.json({ data: materials, count: materials.length });
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
    const prisma = await getPrismaForProject(projectId);
    const body = await req.json();

    const parsed = parseBody(MaterialCreateSchema, body);
    if (!parsed.ok) return parsed.response;
    const { code, name, unit, rate, currencySlot } = parsed.data;

    const material = await prisma.material.create({
      data: {
        projectId,
        code,
        name,
        unit,
        rate: new Decimal(rate),
        currencySlot: currencySlot ?? 1,
      },
    });
    return NextResponse.json({ data: material });
  } catch (e) {
    console.error(e);
    const raw = e instanceof Error ? e.message : "Failed to create material";
    const message = raw.includes("Unique constraint")
      ? "A material with this code already exists in the project"
      : raw;
    return NextResponse.json({ error: message }, { status: raw.includes("Unique constraint") ? 400 : 500 });
  }
}
