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
  return path.join(userDataPath, "unitrate.db").replace(/\\/g, "/");
}

// ── Prisma engine path (production only) ─────────────────────────────────────

function setPrismaEnginePath(): void {
  if (isDev) return; // In dev, Prisma finds its engine in node_modules normally

  // When packaged, native modules are unpacked from ASAR to app.asar.unpacked
  const engineDir = path.join(
    eProcess.resourcesPath,
    "app.asar.unpacked",
    "node_modules",
    ".prisma",
    "client"
  );

  try {
    if (!fs.existsSync(engineDir)) return;
    const files = fs.readdirSync(engineDir);
    const engineFile = files.find(
      (f) =>
        (f.startsWith("libquery_engine") || f.startsWith("query_engine")) &&
        f.endsWith(".node")
    );
    if (engineFile) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(engineDir, engineFile);
      console.log("[electron] Prisma engine:", process.env.PRISMA_QUERY_ENGINE_LIBRARY);
    }
  } catch (err) {
    console.warn("[electron] Could not locate Prisma engine binary:", err);
  }
}

// ── Next.js server (production) ───────────────────────────────────────────────

async function startProdServer(): Promise<void> {
  // The app directory inside the ASAR
  const appDir = path.join(eProcess.resourcesPath, "app.asar");

  const nextApp = require("next")({
    dev: false,
    dir: appDir,
    port: PORT,
    hostname: "127.0.0.1",
  });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  await new Promise<void>((resolve, reject) => {
    createServer((req, res) => {
      if (!req.url) return;
      handle(req, res, parse(req.url, true));
    })
      .listen(PORT, "127.0.0.1", () => {
        console.log(`[electron] Next.js server ready on http://127.0.0.1:${PORT}`);
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
    if (isDev) mainWindow?.webContents.openDevTools();
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
  // 1. Set DATABASE_URL before Prisma ever initialises
  const dbPath = getDbPath();
  process.env.DATABASE_URL = `file:${dbPath}`;
  console.log(`[electron] DATABASE_URL → file:${dbPath}`);

  // 2. Point Prisma to the unpacked engine binary (production only)
  setPrismaEnginePath();

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
      console.error("[electron] Failed to start Next.js server:", err);
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
