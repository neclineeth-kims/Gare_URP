import { NextRequest, NextResponse } from "next/server";
import { validateProjectName, getProjectByName } from "@/lib/projects";
import { prisma } from "@/lib/db";
import { ProjectCreateSchema, parseBody } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = parseBody(ProjectCreateSchema, body);
    if (!parsed.ok) return parsed.response;
    const { name } = parsed.data;

    const validation = validateProjectName(name);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (await getProjectByName(name)) {
      return NextResponse.json(
        { error: `A project named "${name}" already exists` },
        { status: 400 }
      );
    }

    let currency = await prisma.currency.findFirst({
      where: { isBase: true },
    });
    // Auto-create base currency in desktop/SQLite mode if it doesn't exist yet.
    if (!currency) {
      const isSQLite = process.env.DATABASE_URL?.startsWith("file:");
      if (!isSQLite) {
        return NextResponse.json(
          { error: "No base currency found. Run db:seed first." },
          { status: 500 }
        );
      }
      currency = await prisma.currency.create({
        data: {
          code: "LOCAL",
          name: "Local Currency",
          symbol: "L",
          exchangeRate: 1,
          isBase: true,
        },
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: "",
        currencyId: currency.id,
        status: "active",
      },
    });

    await prisma.projectCurrency.createMany({
      data: [
        { projectId: project.id, slot: 1, code: "LOCAL", name: "Local Currency", multiplier: 1 },
        { projectId: project.id, slot: 2, code: "CUR2", name: "Currency 2", multiplier: 1 },
        { projectId: project.id, slot: 3, code: "CUR3", name: "Currency 3", multiplier: 1 },
        { projectId: project.id, slot: 4, code: "CUR4", name: "Currency 4", multiplier: 1 },
        { projectId: project.id, slot: 5, code: "CUR5", name: "Currency 5", multiplier: 1 },
      ],
    });

    return NextResponse.json({
      data: {
        id: project.id,
        name: project.name,
        path: `supabase:${project.id}`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create project" },
      { status: 500 }
    );
  }
}
