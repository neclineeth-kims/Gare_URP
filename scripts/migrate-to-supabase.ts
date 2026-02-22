#!/usr/bin/env npx tsx
/**
 * Migrate data from SQLite project databases to Supabase PostgreSQL.
 * Run: npm run migrate:sqlite-to-supabase
 *
 * Prerequisites:
 * 1. Supabase project created, .env.local with DATABASE_URL and DIRECT_URL
 * 2. npx prisma db push (or migrate) already run on Supabase
 * 3. npm run db:seed (ensures base Currency exists)
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env
import { existsSync, readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";
import { getProjectDbPath, type ProjectEntry } from "../src/lib/projects";

const prisma = new PrismaClient();

function readRegistryRaw(): ProjectEntry[] {
  const REGISTRY_PATH = path.join(process.cwd(), "data", "projects.json");
  if (!existsSync(REGISTRY_PATH)) return [];
  const raw = readFileSync(REGISTRY_PATH, "utf-8");
  try {
    return JSON.parse(raw) as ProjectEntry[];
  } catch {
    return [];
  }
}

function writeRegistryRaw(entries: ProjectEntry[]) {
  const { writeFileSync } = require("fs");
  const REGISTRY_PATH = path.join(process.cwd(), "data", "projects.json");
  writeFileSync(REGISTRY_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

async function ensureBaseCurrency(): Promise<string> {
  const base = await prisma.currency.findFirst({ where: { isBase: true } });
  if (base) return base.id;
  const c = await prisma.currency.create({
    data: {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      exchangeRate: 1,
      isBase: true,
    },
  });
  return c.id;
}

async function migrateProject(entry: ProjectEntry): Promise<boolean> {
  if (entry.path.startsWith("supabase:")) {
    console.log(`  [skip] ${entry.name} already migrated`);
    return false;
  }

  const dbPath = getProjectDbPath(entry.path);
  if (!existsSync(dbPath)) {
    console.log(`  [skip] ${entry.name} - SQLite file not found at ${dbPath}`);
    return false;
  }

  const db = new Database(dbPath, { readonly: true });

  try {
    // Read from SQLite
    const projects = db.prepare("SELECT * FROM projects WHERE id = ?").all(entry.id) as Record<string, unknown>[];
    if (projects.length === 0) {
      console.log(`  [skip] ${entry.name} - no Project row with id ${entry.id} in SQLite`);
      return false;
    }
    const sqliteProject = projects[0] as {
      id: string;
      name: string;
      description: string | null;
      currency_id: string;
      status: string;
    };

    // Check if project already exists in Supabase
    const existing = await prisma.project.findUnique({ where: { id: entry.id } });
    if (existing) {
      console.log(`  [skip] ${entry.name} - already exists in Supabase`);
      return false;
    }

    const baseCurrencyId = await ensureBaseCurrency();

    // Create Project
    await prisma.project.create({
      data: {
        id: sqliteProject.id,
        name: sqliteProject.name,
        description: sqliteProject.description ?? "",
        currencyId: baseCurrencyId,
        status: sqliteProject.status ?? "active",
      },
    });

    // ProjectCurrencies
    const projectCurrencies = db.prepare("SELECT * FROM project_currencies WHERE project_id = ?").all(entry.id) as Record<string, unknown>[];
    for (const pc of projectCurrencies) {
      const row = pc as { id: string; project_id: string; slot: number; code: string; name: string; multiplier: number };
      await prisma.projectCurrency.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          projectId: row.project_id,
          slot: row.slot,
          code: row.code,
          name: row.name,
          multiplier: row.multiplier,
        },
        update: {},
      });
    }

    if (projectCurrencies.length === 0) {
      await prisma.projectCurrency.createMany({
        data: [
          { projectId: entry.id, slot: 1, code: "LOCAL", name: "Local Currency", multiplier: 1 },
          { projectId: entry.id, slot: 2, code: "CUR2", name: "Currency 2", multiplier: 1 },
          { projectId: entry.id, slot: 3, code: "CUR3", name: "Currency 3", multiplier: 1 },
          { projectId: entry.id, slot: 4, code: "CUR4", name: "Currency 4", multiplier: 1 },
          { projectId: entry.id, slot: 5, code: "CUR5", name: "Currency 5", multiplier: 1 },
        ],
      });
    }

    // Labor
    const laborRows = db.prepare("SELECT * FROM labor WHERE project_id = ?").all(entry.id) as Record<string, unknown>[];
    for (const row of laborRows) {
      const l = row as { id: string; project_id: string; code: string; name: string; unit: string; rate: number; currency_slot?: number };
      await prisma.labor.create({
        data: {
          id: l.id,
          projectId: l.project_id,
          code: l.code,
          name: l.name,
          unit: l.unit,
          rate: l.rate,
          currencySlot: l.currency_slot ?? 1,
        },
      }).catch((e) => {
        if (String(e).includes("Unique constraint")) console.log(`    Labor ${l.code} already exists`);
        else throw e;
      });
    }

    // Materials
    const materialRows = db.prepare("SELECT * FROM materials WHERE project_id = ?").all(entry.id) as Record<string, unknown>[];
    for (const row of materialRows) {
      const m = row as { id: string; project_id: string; code: string; name: string; unit: string; rate: number; currency_slot?: number };
      await prisma.material.create({
        data: {
          id: m.id,
          projectId: m.project_id,
          code: m.code,
          name: m.name,
          unit: m.unit,
          rate: m.rate,
          currencySlot: m.currency_slot ?? 1,
        },
      }).catch((e) => {
        if (String(e).includes("Unique constraint")) console.log(`    Material ${m.code} already exists`);
        else throw e;
      });
    }

    // Equipment
    const equipmentRows = db.prepare("SELECT * FROM equipment WHERE project_id = ?").all(entry.id) as Record<string, unknown>[];
    for (const row of equipmentRows) {
      const e = row as { id: string; project_id: string; code: string; name: string; unit: string; total_value: number; depreciation_total: number };
      await prisma.equipment.create({
        data: {
          id: e.id,
          projectId: e.project_id,
          code: e.code,
          name: e.name,
          unit: e.unit,
          totalValue: e.total_value,
          depreciationTotal: e.depreciation_total,
        },
      }).catch((err) => {
        if (String(err).includes("Unique constraint")) console.log(`    Equipment ${e.code} already exists`);
        else throw err;
      });
    }

    // EquipmentResource
    for (const eq of equipmentRows) {
      const eqId = (eq as { id: string }).id;
      const erRows = db.prepare("SELECT * FROM equipment_resources WHERE equipment_id = ?").all(eqId) as Record<string, unknown>[];
      for (const row of erRows) {
        const er = row as { id: string; equipment_id: string; resource_type: string; labor_id: string | null; material_id: string | null; quantity: number };
        await prisma.equipmentResource.create({
          data: {
            id: er.id,
            equipmentId: er.equipment_id,
            resourceType: er.resource_type,
            laborId: er.labor_id,
            materialId: er.material_id,
            quantity: er.quantity,
          },
        }).catch((err) => {
          if (String(err).includes("Unique constraint")) return;
          throw err;
        });
      }
    }

    // Analysis
    const analysisRows = db.prepare("SELECT * FROM analysis WHERE project_id = ?").all(entry.id) as Record<string, unknown>[];
    for (const row of analysisRows) {
      const a = row as { id: string; project_id: string; code: string; name: string; unit: string; base_quantity: number };
      await prisma.analysis.create({
        data: {
          id: a.id,
          projectId: a.project_id,
          code: a.code,
          name: a.name,
          unit: a.unit,
          baseQuantity: a.base_quantity,
        },
      }).catch((err) => {
        if (String(err).includes("Unique constraint")) console.log(`    Analysis ${a.code} already exists`);
        else throw err;
      });
    }

    // AnalysisResource
    for (const a of analysisRows) {
      const aId = (a as { id: string }).id;
      const arRows = db.prepare("SELECT * FROM analysis_resources WHERE analysis_id = ?").all(aId) as Record<string, unknown>[];
      for (const row of arRows) {
        const ar = row as { id: string; analysis_id: string; resource_type: string; labor_id: string | null; material_id: string | null; equipment_id: string | null; quantity: number };
        await prisma.analysisResource.create({
          data: {
            id: ar.id,
            analysisId: ar.analysis_id,
            resourceType: ar.resource_type,
            laborId: ar.labor_id,
            materialId: ar.material_id,
            equipmentId: ar.equipment_id,
            quantity: ar.quantity,
          },
        }).catch((err) => {
          if (String(err).includes("Unique constraint")) return;
          throw err;
        });
      }
    }

    // BoqItem
    const boqRows = db.prepare("SELECT * FROM boq_items WHERE project_id = ?").all(entry.id) as Record<string, unknown>[];
    for (const row of boqRows) {
      const b = row as { id: string; project_id: string; code: string; name: string; unit: string; quantity: number };
      await prisma.boqItem.create({
        data: {
          id: b.id,
          projectId: b.project_id,
          code: b.code,
          name: b.name,
          unit: b.unit,
          quantity: b.quantity,
        },
      }).catch((err) => {
        if (String(err).includes("Unique constraint")) console.log(`    BoQ ${b.code} already exists`);
        else throw err;
      });
    }

    // BoqAnalysis
    for (const b of boqRows) {
      const boqId = (b as { id: string }).id;
      const baRows = db.prepare("SELECT * FROM boq_analysis WHERE boq_item_id = ?").all(boqId) as Record<string, unknown>[];
      for (const row of baRows) {
        const ba = row as { id: string; boq_item_id: string; analysis_id: string; coefficient: number };
        await prisma.boqAnalysis.create({
          data: {
            id: ba.id,
            boqItemId: ba.boq_item_id,
            analysisId: ba.analysis_id,
            coefficient: ba.coefficient,
          },
        }).catch((err) => {
          if (String(err).includes("Unique constraint")) return;
          throw err;
        });
      }
    }

    // Update registry path to supabase placeholder
    const entries = readRegistryRaw();
    const idx = entries.findIndex((p) => p.id === entry.id);
    if (idx >= 0) {
      entries[idx] = { ...entries[idx], path: `supabase:${entry.id}` };
      writeRegistryRaw(entries);
    }

    console.log(`  [ok] ${entry.name}`);
    return true;
  } finally {
    db.close();
  }
}

async function main() {
  if (!process.env.DATABASE_URL?.includes("postgresql")) {
    console.error("DATABASE_URL must point to Supabase PostgreSQL. Check .env.local");
    process.exit(1);
  }

  const entries = readRegistryRaw();
  const toMigrate = entries.filter((e) => !e.path.startsWith("supabase:"));
  if (toMigrate.length === 0) {
    console.log("No SQLite projects to migrate.");
    return;
  }

  console.log(`Migrating ${toMigrate.length} project(s) to Supabase...`);
  let migrated = 0;
  for (const entry of toMigrate) {
    console.log(`\n${entry.name} (${entry.id}):`);
    try {
      const ok = await migrateProject(entry);
      if (ok) migrated++;
    } catch (e) {
      console.error(`  [error]`, e);
    }
  }

  console.log(`\nDone. Migrated ${migrated} project(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
