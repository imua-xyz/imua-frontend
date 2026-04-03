#!/usr/bin/env node
/**
 * Run Playwright E2E tests with .env.e2e loaded.
 * Use: pnpm test:e2e [-- playwright args...]
 * No need to copy .env.e2e to .env; this script injects .env.e2e into the test run.
 *
 * Optional: E2E_CLEAN_BEFORE=1 runs scripts/e2e-clean.mjs (soft) before tests to drop
 * stray Anvil + Playwright processes from interrupted runs.
 */
import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.e2e");

if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
} else {
  console.warn("[test-e2e] .env.e2e not found, running with current env");
}

if (process.env.E2E_CLEAN_BEFORE === "1" || process.env.E2E_CLEAN_BEFORE === "true") {
  const cleanScript = join(root, "scripts/e2e-clean.mjs");
  console.log("[test-e2e] E2E_CLEAN_BEFORE: running soft cleanup…");
  spawnSync(process.execPath, [cleanScript], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}

const args = process.argv.slice(2);
const result = spawnSync(
  "pnpm",
  ["exec", "playwright", "test", ...args],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  },
);
process.exit(result.status ?? 0);
