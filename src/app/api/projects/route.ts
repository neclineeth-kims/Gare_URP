import { NextRequest, NextResponse } from "next/server";
import {
  createProjectDirectory,
  registerProject,
  validateProjectName,
  getProjectByName,
  getPrismaForPath,
} from "@/lib/projects";

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

    if (getProjectByName(name)) {
      return NextResponse.json(
        { error: `A project named "${name}" already exists` },
        { status: 400 }
      );
    }

    const projectPath = createProjectDirectory(name.trim());
    const projectPrisma = getPrismaForPath(projectPath);

    const currency = await projectPrisma.currency.findFirst({
      where: { isBase: true },
    });
    if (!currency) {
      await projectPrisma.$disconnect();
      return NextResponse.json(
        { error: "Template database has no base currency" },
        { status: 500 }
      );
    }

    const project = await projectPrisma.project.create({
      data: {
        name: name.trim(),
        description: "",
        currencyId: currency.id,
        status: "active",
      },
    });

    await projectPrisma.$disconnect();

    registerProject({
      id: project.id,
      name: project.name,
      path: projectPath,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      data: {
        id: project.id,
        name: project.name,
        path: projectPath,
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
