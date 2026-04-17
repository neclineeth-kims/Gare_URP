/**
 * Electron main process — wraps Next.js as a local HTTP server.
 *
 * Dev mode:   Next.js dev server is started by `npm run electron:dev` (via concurrently).
 *             Electron simply loads http://localhost:3700.
 *
 * Prod mode:  Electron starts a programmatic Next.js server from the pre-built
 *             .next folder, then opens a BrowserWindow pointing at the local URL.
 *
 * Database:   DATABASE_URL is set to a SQLite file inside the OS user-data folder
 *             (e.g. ~/.config/Unit Rate App/unitrate.db on Linux,
 *              %APPDATA%\Unit Rate App\unitrate.db on Windows).
 *             This is set BEFORE Next.js (and therefore Prisma) starts.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// Use require() so TypeScript doesn't fail if electron isn't installed yet.
// At runtime inside Electron this will always resolve correctly.
const electron = require("electron");
const { app, BrowserWindow, shell } = electron as {
  app: {
    isPackaged: boolean;
    getPath: (name: string) => string;
    whenReady: () => Promise<void>;
    quit: () => void;
    on: (event: string, cb: (...args: unknown[]) => void) => void;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BrowserWindow: any;
  shell: { openExternal: (url: string) => void };
};

import { createServer } from "node:http";
import { parse } from "node:url";
import path from "node:path";
import fs from "node:fs";

const PORT = 3700;
const isDev = !app.isPackaged;

// ── File logger (production debugging) ───────────────────────────────────────
let logFile: string | null = null;

function initLogger() {
  try {
    const logDir = app.getPath("userData");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    logFile = path.join(logDir, "urp-debug.log");
    fs.writeFileSync(logFile, `=== URP Log ${new Date().toISOString()} ===\n`);

    // Intercept process.stderr so Next.js internal errors are captured
    const origStderr = process.stderr.write.bind(process.stderr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stderr as any).write = (chunk: unknown, ...args: unknown[]) => {
      try { fs.appendFileSync(logFile!, `[stderr] ${chunk}`); } catch {}
      return (origStderr as Function)(chunk, ...args);
    };

    // Also intercept console.error
    const origConsoleError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      const line = "[console.error] " + args.map(String).join(" ");
      try { fs.appendFileSync(logFile!, line + "\n"); } catch {}
      origConsoleError(...args);
    };
  } catch {}
}

function log(...args: unknown[]) {
  const line = args.map(String).join(" ");
  console.log(line);
  if (logFile) {
    try { fs.appendFileSync(logFile, line + "\n"); } catch {}
  }
}

function logError(...args: unknown[]) {
  const line = "[ERROR] " + args.map((a) => (a instanceof Error ? a.stack ?? a.message : String(a))).join(" ");
  console.error(line);
  if (logFile) {
    try { fs.appendFileSync(logFile, line + "\n"); } catch {}
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mainWindow: any = null;

// Electron adds resourcesPath to process
const eProcess = process as NodeJS.Process & { resourcesPath: string };

// ── Database path ─────────────────────────────────────────────────────────────

function getDbPath(): string {
  const userDataPath = app.getPath("userData");
  // Ensure the directory exists (first run)
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  const dbPath = path.join(userDataPath, "unitrate.db");
  // Copy the bundled template db if missing OR if it looks empty/corrupt.
  // This ensures a clean schema on every fresh install.
  const templatePath = isDev
    ? path.join(__dirname, "../../electron/assets/template.db")
    : path.join(eProcess.resourcesPath, "template.db");

  const dbExists = fs.existsSync(dbPath);
  const dbSize = dbExists ? fs.statSync(dbPath).size : 0;
  log("[electron] DB exists:", dbExists, "size:", dbSize, "bytes");
  log("[electron] template.db path:", templatePath, "exists:", fs.existsSync(templatePath));

  if (!dbExists || dbSize < 8192) {
    // DB missing or suspiciously small (< 8 KB) — copy fresh template
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, dbPath);
      log("[electron] Copied template.db →", dbPath);
    } else {
      logError("[electron] template.db not found at", templatePath);
    }
  } else {
    log("[electron] Existing DB kept (size OK)");
  }
  return dbPath.replace(/\\/g, "/");
}

// ── Prisma resolution patch (production only) ────────────────────────────────
//
// Problem: electron-builder's glob silently excludes dot-prefixed directories,
// so node_modules/.prisma/client/ is never packed into the ASAR.
//
// Fix: copy .prisma/client to resources/prisma-client via extraResources, then
// hook Module._resolveFilename to redirect the two require() calls Prisma makes
// that can't otherwise be satisfied:
//
//   1. require('.prisma/client/default')          → resources/prisma-client/default
//      (bare-package-name lookup, dot-dir → absent from ASAR)
//
//   2. require('@prisma/client/runtime/library.js') → app.asar/.../library.js
//      (called from resources/prisma-client/index.js which is outside the ASAR,
//       so normal node_modules lookup never reaches inside app.asar)
//
// Electron's fs patch makes ASAR paths transparent to Node's file I/O, so
// _orig() called with an explicit app.asar/... path resolves correctly.

function patchPrismaClientResolution(): void {
  if (isDev) return;

  // ── 1. Engine binary ───────────────────────────────────────────────────────
  // PRISMA_QUERY_ENGINE_LIBRARY must be the full path to the .node engine file.
  // electron-builder unpacks @prisma/engines/** to app.asar.unpacked.
  const enginesDir = path.join(eProcess.resourcesPath, "app.asar.unpacked", "node_modules", "@prisma", "engines");
  if (fs.existsSync(enginesDir)) {
    const engineFile = fs.readdirSync(enginesDir).find(f => f.endsWith(".node"));
    if (engineFile) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(enginesDir, engineFile);
      log("[electron] PRISMA_QUERY_ENGINE_LIBRARY →", process.env.PRISMA_QUERY_ENGINE_LIBRARY);
    } else {
      log("[electron] WARNING: no .node file found in", enginesDir);
    }
  } else {
    log("[electron] WARNING: @prisma/engines dir not found at", enginesDir);
  }

  // ── 2. Module resolution hook ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Module = require("module");

  // resources/prisma-client/ = the .prisma/client copy placed by extraResources
  const prismaClientDir = path.join(eProcess.resourcesPath, "prisma-client");
  // The @prisma/client package (runtime helpers) lives inside the ASAR.
  // Electron's fs patch makes ASAR paths readable via ordinary Node.js I/O.
  const prismaRuntimeDir = path.join(eProcess.resourcesPath, "app.asar", "node_modules", "@prisma", "client", "runtime");

  log("[electron] prisma-client dir:", prismaClientDir, "exists:", fs.existsSync(prismaClientDir));
  log("[electron] prisma runtime dir:", prismaRuntimeDir);

  const _orig = Module._resolveFilename.bind(Module);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Module._resolveFilename = function (request: string, parent: any, isMain: boolean, options: unknown) {
    // .prisma/client/* → resources/prisma-client/*
    if (request === ".prisma/client" || request.startsWith(".prisma/client/")) {
      const suffix = request.slice(".prisma/client".length); // "" | "/default" | …
      const target = suffix ? path.join(prismaClientDir, suffix) : prismaClientDir;
      log("[electron] resolve .prisma redirect:", request, "→", target);
      return _orig(target, parent, isMain, options);
    }
    // @prisma/client/runtime/* → app.asar/…/@prisma/client/runtime/*
    // Needed because prisma-client/index.js (outside ASAR) requires this.
    if (request.startsWith("@prisma/client/runtime/")) {
      const file = request.slice("@prisma/client/runtime/".length);
      const target = path.join(prismaRuntimeDir, file);
      log("[electron] resolve runtime redirect:", request, "→", target);
      return _orig(target, parent, isMain, options);
    }
    return _orig(request, parent, isMain, options);
  };
}

// ── Next.js server (production) ───────────────────────────────────────────────

async function startProdServer(): Promise<void> {
  const appDir = path.join(eProcess.resourcesPath, "app.asar");
  log("[electron] resourcesPath:", eProcess.resourcesPath);
  log("[electron] appDir:", appDir);
  log("[electron] DATABASE_URL:", process.env.DATABASE_URL);
  log("[electron] PRISMA_QUERY_ENGINE_LIBRARY:", process.env.PRISMA_QUERY_ENGINE_LIBRARY ?? "NOT SET");

  const nextApp = require("next")({
    dev: false,
    dir: appDir,
    port: PORT,
    hostname: "127.0.0.1",
  });
  const handle = nextApp.getRequestHandler();

  log("[electron] Calling nextApp.prepare()...");
  try {
    await nextApp.prepare();
    log("[electron] nextApp.prepare() complete");
  } catch (err) {
    logError("[electron] nextApp.prepare() FAILED:", err);
    throw err;
  }

  await new Promise<void>((resolve, reject) => {
    createServer((req, res) => {
      if (!req.url) return;
      const parsedUrl = parse(req.url, true);
      log(`[req] ${req.method} ${req.url}`);
      handle(req, res, parsedUrl);
      res.on("finish", () => {
        if (res.statusCode >= 500) {
          logError(`[res] ${res.statusCode} ${req.method} ${req.url}`);
        }
      });
    })
      .listen(PORT, "127.0.0.1", () => {
        log(`[electron] Next.js server ready on http://127.0.0.1:${PORT}`);
        log(`[electron] Log file: ${logFile}`);
        resolve();
      })
      .on("error", reject);
  });
}

// ── BrowserWindow ─────────────────────────────────────────────────────────────

function createWindow(url: string): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: "Unit Rate App",
    show: false, // show after 'ready-to-show' to avoid blank flash
  });

  mainWindow.loadURL(url);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.webContents.openDevTools(); // temporary: always open for debugging
  });

  // Open external links in the system browser, not in the app window
  mainWindow.webContents.setWindowOpenHandler(({ url: extUrl }: { url: string }) => {
    if (extUrl.startsWith("http")) shell.openExternal(extUrl);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  initLogger();

  // 1. Set DATABASE_URL before Prisma ever initialises
  const dbPath = getDbPath();
  process.env.DATABASE_URL = `file:${dbPath}`;
  log(`[electron] DATABASE_URL → file:${dbPath}`);

  // 2. Patch Prisma module resolution + engine path (production only)
  patchPrismaClientResolution();

  if (isDev) {
    // In dev mode the Next.js dev server is already running (started by
    // `npm run electron:dev` via concurrently). Just open the window.
    createWindow(`http://localhost:${PORT}`);
  } else {
    // Production: start the Next.js server first, then open the window.
    try {
      await startProdServer();
      createWindow(`http://127.0.0.1:${PORT}`);
    } catch (err) {
      logError("[electron] Failed to start Next.js server:", err);
      app.quit();
    }
  }
});

app.on("window-all-closed", () => {
  // On macOS apps stay in dock until Cmd+Q; on all other platforms quit.
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  // macOS: re-create window when dock icon is clicked with no windows open.
  if (mainWindow === null) {
    createWindow(isDev ? `http://localhost:${PORT}` : `http://127.0.0.1:${PORT}`);
  }
});
