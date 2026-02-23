import { NextRequest, NextResponse } from "next/server";
import { validateProjectName, getProjectByName } from "@/lib/projects";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

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

    const currency = await prisma.currency.findFirst({
      where: { isBase: true },
    });
    if (!currency) {
      return NextResponse.json(
        { error: "No base currency found. Run db:seed first." },
        { status: 500 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
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
