/**
 * Project registry and directory management.
 * Projects live in ./data/projects/<name>/ with their own SQLite DB.
 * unitrate_main is the template with empty schema + currencies.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

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

/** Prisma client cache per DB path */
const prismaCache = new Map<string, PrismaClient>();

/** Create Prisma client for a database at given path (e.g. before project is registered) */
export function getPrismaForPath(projectPath: string): PrismaClient {
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

/** Get Prisma client for a project's database */
export function getPrismaForProject(projectId: string): PrismaClient {
  const entry = getProjectById(projectId);
  if (!entry) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const dbPath = getProjectDbPath(entry.path);
  if (!existsSync(dbPath)) {
    throw new Error(`Project database not found at ${dbPath}`);
  }

  const url = `file:${dbPath.replace(/\\/g, "/")}`;
  let client = prismaCache.get(url);
  if (!client) {
    client = new PrismaClient({
      datasources: {
        db: { url },
      },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    prismaCache.set(url, client);
  }
  return client;
}
