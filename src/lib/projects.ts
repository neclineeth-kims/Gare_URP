/**
 * Project registry and database management.
 * Single Supabase PostgreSQL database. All project data lives in the Project table.
 */

import { existsSync, mkdirSync, copyFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { prisma } from "./db";

const DATA_DIR = path.join(process.cwd(), "data");
export const UNITRATE_MAIN_PATH = path.join(DATA_DIR, "unitrate_main");
export const UNITRATE_MAIN_DB = path.join(UNITRATE_MAIN_PATH, "unitrate.db");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");

export type ProjectEntry = {
  id: string;
  name: string;
  path: string;
  createdAt: string;
};

function projectToEntry(p: { id: string; name: string; createdAt: Date }): ProjectEntry {
  return {
    id: p.id,
    name: p.name,
    path: `supabase:${p.id}`,
    createdAt: p.createdAt.toISOString(),
  };
}

/** Get all projects from database */
export async function getProjects(): Promise<ProjectEntry[]> {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true },
  });
  return projects.map(projectToEntry);
}

/** Get project by ID */
export async function getProjectById(projectId: string): Promise<ProjectEntry | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, createdAt: true },
  });
  return project ? projectToEntry(project) : null;
}

/** Get project by name (case-insensitive search) */
export async function getProjectByName(name: string): Promise<ProjectEntry | null> {
  const project = await prisma.project.findFirst({
    where: {
      name: { equals: name.trim(), mode: "insensitive" },
    },
    select: { id: true, name: true, createdAt: true },
  });
  return project ? projectToEntry(project) : null;
}

/** Search projects by name or ID */
export async function searchProjects(query: string): Promise<ProjectEntry[]> {
  const lower = query.toLowerCase().trim();
  if (!lower) return getProjects();
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { name: { contains: lower, mode: "insensitive" } },
        { id: { contains: lower, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true },
  });
  return projects.map(projectToEntry);
}

/** Delete project from database (cascade deletes related data) */
export async function deleteProject(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  await prisma.project.delete({ where: { id: projectId } });
}

/** Update project name in database */
export async function updateProjectName(projectId: string, newName: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  const validation = validateProjectName(newName);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const trimmed = newName.trim();
  const existing = await prisma.project.findFirst({
    where: {
      id: { not: projectId },
      name: { equals: trimmed, mode: "insensitive" },
    },
  });
  if (existing) {
    throw new Error(`A project named "${trimmed}" already exists`);
  }
  await prisma.project.update({ where: { id: projectId }, data: { name: trimmed } });
}

/** Validate project name: no path traversal, no reserved chars */
export function validateProjectName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: "Project name is required" };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: "Project name is too long" };
  }
  if (/[<>:"/\\|?*]/.test(trimmed)) {
    return { valid: false, error: "Project name contains invalid characters" };
  }
  if (/\.\./.test(trimmed)) {
    return { valid: false, error: "Project name contains invalid characters" };
  }
  return { valid: true };
}

/** Get the DB path for a project (migration script only) */
export function getProjectDbPath(projectPath: string): string {
  return path.join(projectPath, "unitrate.db");
}

/** Create project directory and copy template DB (local/migration only) */
export function createProjectDirectory(projectName: string): string {
  if (!existsSync(UNITRATE_MAIN_DB)) {
    throw new Error(
      "Template database not found. Run: npm run init:template"
    );
  }

  const safeName = projectName.trim().replace(/\s+/g, "_");
  let projectDir = path.join(PROJECTS_DIR, safeName);
  let suffix = 0;
  while (existsSync(projectDir)) {
    suffix++;
    projectDir = path.join(PROJECTS_DIR, `${safeName}_${suffix}`);
  }

  mkdirSync(projectDir, { recursive: true });
  copyFileSync(UNITRATE_MAIN_DB, getProjectDbPath(projectDir));
  return projectDir;
}

/** Returns global Prisma client. Validates project exists in database. */
export async function getPrismaForProject(projectId: string): Promise<typeof prisma> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  return prisma;
}

/** @deprecated Migration only. Creates Prisma client for SQLite at path. */
export function getPrismaForPath(projectPath: string) {
  const dbPath = getProjectDbPath(projectPath);
  if (!existsSync(dbPath)) {
    throw new Error(`Database not found at ${dbPath}`);
  }
  const url = `file:${dbPath.replace(/\\/g, "/")}`;
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}
