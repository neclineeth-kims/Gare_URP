/**
 * Electron preload script.
 * Runs in the renderer process with a restricted Node.js context.
 * Exposes a minimal safe API to the renderer via contextBridge.
 *
 * Currently the app is a standard web app that communicates with the
 * Next.js API routes over HTTP — no extra IPC is needed.
 * This file is a placeholder that can be extended later (e.g. for
 * native file-open dialogs, auto-update checks, etc.).
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge } = require("electron");

// Expose a minimal API so the UI can detect it's running as a desktop app
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,   // "linux" | "win32" | "darwin"
  isDesktop: true,
});
