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

const [, , envFile, ...rest] = process.argv;

if (!envFile || rest.length === 0) {
  console.error("Usage: tsx scripts/with-env.ts <envFile> [KEY=VALUE ...] <command> [args...]");
  process.exit(1);
}

// Load env file relative to project root (where npm scripts run)
config({ path: path.resolve(process.cwd(), envFile) });

// Consume any KEY=VALUE arguments before the actual command
const extraEnv: Record<string, string> = {};
while (rest.length > 0 && /^[A-Z_][A-Z0-9_]*=/.test(rest[0])) {
  const [key, ...val] = rest.shift()!.split("=");
  extraEnv[key] = val.join("=");
}

const [cmd, ...args] = rest;
if (!cmd) {
  console.error("No command specified after env file / KEY=VALUE pairs.");
  process.exit(1);
}

Object.assign(process.env, extraEnv);

const child = spawn(cmd, args, {
  env: process.env,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
