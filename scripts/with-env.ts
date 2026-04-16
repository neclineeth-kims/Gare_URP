#!/usr/bin/env tsx
/**
 * Tiny cross-platform helper: loads an env file then spawns a shell command.
 *
 * Usage:
 *   tsx scripts/with-env.ts <envFile> <command> [args...]
 *
 * Example:
 *   tsx scripts/with-env.ts .env.desktop prisma db push --schema prisma/schema.sqlite.prisma
 *
 * Replaces dotenv-cli so we don't need an extra package.
 * Uses `dotenv` (already in dependencies) and `tsx` (already in devDependencies).
 */

import { config } from "dotenv";
import { spawn } from "node:child_process";
import path from "node:path";

const [, , envFile, cmd, ...args] = process.argv;

if (!envFile || !cmd) {
  console.error("Usage: tsx scripts/with-env.ts <envFile> <command> [args...]");
  process.exit(1);
}

// Load env file relative to project root (where npm scripts run)
config({ path: path.resolve(process.cwd(), envFile) });

const child = spawn(cmd, args, {
  env: process.env,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
