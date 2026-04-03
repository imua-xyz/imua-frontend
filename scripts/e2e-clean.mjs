#!/usr/bin/env node
/**
 * Clean up local resources after interrupted E2E / dev runs.
 *
 * Usage:
 *   pnpm test:e2e:clean                    # Anvil pid file + stray Playwright CLI only
 *   pnpm test:e2e:clean:force              # same + free ports 3000 & 8545 (recommended when "stuck")
 *   pnpm test:e2e:clean -- --force-ports   # equivalent to :force
 *   pnpm test:e2e:clean -- --force-ports --kill-next  # also pkill "next dev" / dev-e2e heuristics
 *
 * Requires macOS or Linux with `lsof` and `pkill` (not Windows).
 */
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync, spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pidFile = join(root, ".e2e-anvil-pid");

const argv = process.argv.slice(2);
const forcePorts = argv.includes("--force-ports");
const killNext = argv.includes("--kill-next");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function killPid(pid, signal = "SIGTERM") {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

function stopAnvilFromPidFile() {
  if (!existsSync(pidFile)) return;
  try {
    const pid = parseInt(readFileSync(pidFile, "utf8").trim(), 10);
    if (Number.isInteger(pid) && pid > 0) {
      if (killPid(pid)) {
        console.log(`[e2e-clean] Stopped Anvil (pid ${pid} from .e2e-anvil-pid)`);
      }
    }
  } catch {
    // ignore
  } finally {
    try {
      unlinkSync(pidFile);
    } catch {
      // ignore
    }
  }
}

/** Collect PIDs using port (LISTEN first, then any TCP match — macOS `lsof`). */
function pidsOnPort(port) {
  const sets = [
    `lsof -nP -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null`,
    `lsof -nP -iTCP:${port} -t 2>/dev/null`,
    `lsof -ti :${port} 2>/dev/null`,
  ];
  const pids = new Set();
  for (const cmd of sets) {
    try {
      const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      for (const line of out.split(/\s+/).filter(Boolean)) {
        const pid = parseInt(line, 10);
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
    } catch {
      // lsof exits 1 when empty
    }
  }
  return [...pids];
}

async function killListenersOnPort(port, label, useKill) {
  const signal = useKill ? "SIGKILL" : "SIGTERM";
  const seen = pidsOnPort(port);
  for (const pid of seen) {
    try {
      process.kill(pid, signal);
      console.log(`[e2e-clean] Sent ${signal} to pid ${pid} (${label} :${port})`);
    } catch {
      /* ignore */
    }
  }
}

async function drainPort(port, label) {
  await killListenersOnPort(port, label, false);
  await sleep(800);
  const remaining = pidsOnPort(port);
  if (remaining.length === 0) return;
  console.log(`[e2e-clean] Port ${port} still busy (${remaining.join(", ")}), sending SIGKILL…`);
  await killListenersOnPort(port, label, true);
}

function pkillPlaywrightOrphans() {
  const patterns = ["playwright test", "@playwright/test/cli"];
  for (const pat of patterns) {
    const r = spawnSync("pkill", ["-f", pat], { stdio: "ignore" });
    if ((r.status ?? 1) === 0) {
      console.log(`[e2e-clean] pkill -f "${pat}"`);
    }
  }
}

/** Best-effort: stop Next dev / dev-e2e wrapper (may match other projects' terminals). */
function pkillNextDevHeuristics() {
  const patterns = [
    "scripts/dev-e2e.mjs",
    "node_modules/.bin/next dev",
    "next dev",
  ];
  for (const pat of patterns) {
    const r = spawnSync("pkill", ["-f", pat], { stdio: "ignore" });
    if ((r.status ?? 1) === 0) {
      console.log(`[e2e-clean] pkill -f "${pat}"`);
    }
  }
}

async function main() {
  console.log("[e2e-clean] Starting cleanup…");
  stopAnvilFromPidFile();
  pkillPlaywrightOrphans();

  if (killNext) {
    console.log("[e2e-clean] --kill-next: stopping Next / dev-e2e processes (heuristic pkill)");
    pkillNextDevHeuristics();
    await sleep(500);
  }

  if (forcePorts) {
    console.log("[e2e-clean] --force-ports: freeing TCP 3000 (Next) and 8545 (Anvil)");
    await drainPort(3000, "Next/dev");
    await drainPort(8545, "Anvil");
  } else {
    console.log(
      "[e2e-clean] Ports not touched. Run `pnpm test:e2e:clean:force` or `pnpm test:e2e:clean -- --force-ports` to clear :3000 / :8545.",
    );
  }

  console.log("[e2e-clean] Done. Verify: lsof -nP -iTCP:3000 -sTCP:LISTEN   (should be empty)");
}

main().catch((e) => {
  console.error("[e2e-clean] Error:", e);
  process.exit(1);
});
