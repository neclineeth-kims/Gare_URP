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

    // Use raw SQL because projectCurrency delegate can be undefined in Next.js API routes
    const currencySlots = [
      [project.id, 1, "LOCAL", "Local Currency", 1],
      [project.id, 2, "CUR2", "Currency 2", 1],
      [project.id, 3, "CUR3", "Currency 3", 1],
      [project.id, 4, "CUR4", "Currency 4", 1],
      [project.id, 5, "CUR5", "Currency 5", 1],
    ];
    const { randomUUID } = await import("crypto");
    const now = new Date().toISOString();
    for (const [projectId, slot, code, name, multiplier] of currencySlots) {
      const id = randomUUID();
      await projectPrisma.$executeRaw`
        INSERT INTO project_currencies (id, project_id, slot, code, name, multiplier, created_at, updated_at)
        VALUES (${id}, ${projectId}, ${slot}, ${code}, ${name}, ${multiplier}, ${now}, ${now})
      `;
    }

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
