import { NextRequest, NextResponse } from "next/server";
import { deleteProject, updateProjectName, getProjectById } from "@/lib/projects";
import { ProjectUpdateSchema, parseBody } from "@/lib/validators";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = parseBody(ProjectUpdateSchema, body);
    if (!parsed.ok) return parsed.response;
    const { name } = parsed.data;

    if (!(await getProjectById(id))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await updateProjectName(id, name);
    return NextResponse.json({ data: { id, name } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update project" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!(await getProjectById(id))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await deleteProject(id);
    return NextResponse.json({ data: { deleted: id } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete project" },
      { status: 500 }
    );
  }
}
