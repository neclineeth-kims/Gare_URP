#!/usr/bin/env npx tsx
/**
 * Initialize unitrate_main template directory with empty database (schema + currencies).
 * Run: npm run init:template
 */

import { mkdirSync, existsSync } from "fs";
import path from "path";
import { execSync } from "child_process";

const DATA_DIR = path.join(process.cwd(), "data");
const UNITRATE_MAIN_PATH = path.join(DATA_DIR, "unitrate_main");
const UNITRATE_MAIN_DB = path.join(UNITRATE_MAIN_PATH, "unitrate.db");
const dbUrl = `file:${UNITRATE_MAIN_DB.replace(/\\/g, "/")}`;

console.log("Initializing unitrate_main template...");

if (!existsSync(UNITRATE_MAIN_PATH)) {
  mkdirSync(UNITRATE_MAIN_PATH, { recursive: true });
  console.log("Created", UNITRATE_MAIN_PATH);
}

console.log("Applying schema...");
execSync(`npx prisma db push`, {
  env: { ...process.env, DATABASE_URL: dbUrl },
  stdio: "inherit",
});

console.log("Seeding currencies...");
execSync(`npx tsx prisma/seed-template.ts`, {
  env: { ...process.env, DATABASE_URL: dbUrl },
  stdio: "inherit",
});

console.log("Template initialized at", UNITRATE_MAIN_DB);
