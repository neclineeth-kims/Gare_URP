#!/usr/bin/env tsx
/**
 * Starts the desktop dev environment:
 *   1. Loads .env.desktop
 *   2. Starts Next.js dev server on port 3700
 *   3. Waits for it to be ready
 *   4. Launches Electron
 *
 * Replaces concurrently + wait-on so we don't need extra packages.
 * Uses only: tsx, dotenv, node:child_process, node:http (all built-in or already installed).
 */

import { config } from "dotenv";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.desktop") });

const PORT = 3700;

function waitForServer(url: string, timeoutMs = 60000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) resolve();
          else setTimeout(check, 1000);
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Timed out waiting for ${url}`));
          } else {
            setTimeout(check, 1000);
          }
        });
    };
    check();
  });
}

async function main() {
  console.log("[electron:dev] Starting Next.js dev server on port", PORT, "...");

  const nextProcess = spawn(
    "npx",
    ["next", "dev", "-p", String(PORT)],
    { env: process.env, stdio: "inherit", shell: true }
  );

  nextProcess.on("error", (err) => {
    console.error("[electron:dev] Next.js failed to start:", err);
    process.exit(1);
  });

  try {
    await waitForServer(`http://localhost:${PORT}`);
    console.log("[electron:dev] Next.js ready — launching Electron...");
  } catch (err) {
    console.error("[electron:dev] Next.js did not become ready:", err);
    nextProcess.kill();
    process.exit(1);
  }

  const electronBin =
    process.platform === "win32"
      ? path.join("node_modules", ".bin", "electron.cmd")
      : path.join("node_modules", ".bin", "electron");

  const electronProcess = spawn(
    electronBin,
    [path.join("electron", "dist", "main.js")],
    { env: process.env, stdio: "inherit", shell: false }
  );

  electronProcess.on("exit", (code) => {
    console.log("[electron:dev] Electron exited. Stopping Next.js...");
    nextProcess.kill();
    process.exit(code ?? 0);
  });

  // Forward Ctrl+C to both processes
  process.on("SIGINT", () => {
    electronProcess.kill();
    nextProcess.kill();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
