/**
 * Project registry and database management.
 * Single Supabase PostgreSQL database with projectId row-level isolation.
 * Registry (projects.json) tracks project metadata. Path retained for migration only.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { prisma } from "./db";

const DATA_DIR = path.join(process.cwd(), "data");
export const UNITRATE_MAIN_PATH = path.join(DATA_DIR, "unitrate_main");
export const UNITRATE_MAIN_DB = path.join(UNITRATE_MAIN_PATH, "unitrate.db");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");
const REGISTRY_PATH = path.join(DATA_DIR, "projects.json");

export type ProjectEntry = {
  id: string;
  name: string;
  path: string;
  createdAt: string;
};

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readRegistry(): ProjectEntry[] {
  ensureDataDir();
  if (!existsSync(REGISTRY_PATH)) {
    writeFileSync(REGISTRY_PATH, "[]", "utf-8");
    return [];
  }
  const raw = readFileSync(REGISTRY_PATH, "utf-8");
  try {
    return JSON.parse(raw) as ProjectEntry[];
  } catch {
    return [];
  }
}

function writeRegistry(entries: ProjectEntry[]) {
  ensureDataDir();
  writeFileSync(REGISTRY_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

/** Get all registered projects */
export function getProjects(): ProjectEntry[] {
  return readRegistry();
}

/** Get project by ID */
export function getProjectById(projectId: string): ProjectEntry | null {
  return readRegistry().find((p) => p.id === projectId) ?? null;
}

/** Get project by name (case-insensitive search) */
export function getProjectByName(name: string): ProjectEntry | null {
  const lower = name.toLowerCase().trim();
  return readRegistry().find((p) => p.name.toLowerCase() === lower) ?? null;
}

/** Search projects by name */
export function searchProjects(query: string): ProjectEntry[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return readRegistry();
  return readRegistry().filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.id.toLowerCase().includes(lower)
  );
}

/** Register a new project */
export function registerProject(entry: ProjectEntry): void {
  const entries = readRegistry();
  if (entries.some((p) => p.id === entry.id)) {
    throw new Error(`Project with id ${entry.id} already registered`);
  }
  if (entries.some((p) => p.name.toLowerCase() === entry.name.toLowerCase())) {
    throw new Error(`Project with name "${entry.name}" already exists`);
  }
  entries.push(entry);
  writeRegistry(entries);
}

/** Remove project from registry (does not delete files) */
export function unregisterProject(projectId: string): boolean {
  const entries = readRegistry().filter((p) => p.id !== projectId);
  if (entries.length === readRegistry().length) return false;
  writeRegistry(entries);
  return true;
}

/** Delete project: unregister, remove from DB (cascade), and optionally remove SQLite folder if present */
export async function deleteProject(projectId: string): Promise<void> {
  const entry = getProjectById(projectId);
  if (!entry) {
    throw new Error(`Project not found: ${projectId}`);
  }
  unregisterProject(projectId);
  await prisma.project.delete({ where: { id: projectId } }).catch(() => {
    // Project may not exist in DB (legacy registry-only)
  });
  if (existsSync(entry.path)) {
    try {
      rmSync(entry.path, { recursive: true });
    } catch {
      // Ignore file delete errors (e.g. migration leftovers)
    }
  }
}

/** Update project name in registry and in the project database */
export async function updateProjectName(projectId: string, newName: string): Promise<void> {
  const entry = getProjectById(projectId);
  if (!entry) {
    throw new Error(`Project not found: ${projectId}`);
  }
  const validation = validateProjectName(newName);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const trimmed = newName.trim();
  const lower = trimmed.toLowerCase();
  const existing = readRegistry().find(
    (p) => p.id !== projectId && p.name.toLowerCase() === lower
  );
  if (existing) {
    throw new Error(`A project named "${trimmed}" already exists`);
  }
  const entries = readRegistry();
  const idx = entries.findIndex((p) => p.id === projectId);
  if (idx === -1) return;
  entries[idx] = { ...entries[idx], name: trimmed };
  writeRegistry(entries);
  try {
    await prisma.project.update({ where: { id: projectId }, data: { name: trimmed } });
  } catch {
    // Registry updated; DB update optional (project may not exist in DB)
  }
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

/** Get the DB path for a project */
export function getProjectDbPath(projectPath: string): string {
  return path.join(projectPath, "unitrate.db");
}

/** Create project directory and copy template DB */
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

/** Returns global Prisma client. Validates project exists in registry. */
export function getPrismaForProject(projectId: string): typeof prisma {
  const entry = getProjectById(projectId);
  if (!entry) {
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
