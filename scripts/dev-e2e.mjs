#!/usr/bin/env node
/**
 * Start Next.js dev server with .env.e2e loaded.
 * Used by Playwright webServer so E2E tests get mock wallet and GraphQL.
 *
 * This script is expected to bind to port 3000. If port 3000 is already in
 * use (for example, an existing `pnpm dev` or `pnpm run dev:e2e`), we fail
 * fast with a clear error instead of letting Next.js silently switch to
 * another port (which would cause E2E tests to hit the wrong server).
 */
import { readFileSync, existsSync } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import net from "net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.e2e");

async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(port, "127.0.0.1");
  });
}

const PORT = 3000;
if (await isPortInUse(PORT)) {
  console.error(
    `[dev-e2e] Port ${PORT} is already in use. ` +
      "Please stop any existing dev server (e.g. `pnpm dev` or `pnpm run dev:e2e`) " +
      "before running E2E tests.",
  );
  process.exit(1);
}

if (!existsSync(envPath)) {
  console.warn("[dev-e2e] .env.e2e not found, running dev with current env");
} else {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const child = spawn("pnpm", ["dev"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

/** Forward signals so Playwright can tear down the dev server without orphaning Next.js. */
function forwardToChild(signal) {
  if (child.pid && !child.killed) {
    try {
      child.kill(signal);
    } catch {
      // ignore
    }
  }
}
process.on("SIGINT", () => forwardToChild("SIGINT"));
process.on("SIGTERM", () => forwardToChild("SIGTERM"));

child.on("exit", (code) => process.exit(code ?? 0));
