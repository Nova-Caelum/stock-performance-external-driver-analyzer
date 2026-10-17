import { test, expect, type Page } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeEvidence } from "../../scripts/evidence.mjs";

// Runs against the built app: `corepack pnpm build`, then the real server (Yahoo) on a free port.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TSX = path.join(ROOT, "node_modules/.bin/tsx");
const STORAGE_KEY = "mcd.watchlist.v1";

interface Running {
  child: ChildProcess;
  base: string;
  output: () => string;
}

let server: Running | undefined;
const watchlistEvidence: string[] = [];
const buildEvidence: string[] = [];
let watchlistPassed = false;
let buildPassed = false;

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

async function startServer(): Promise<Running> {
  const port = await freePort();
  let log = "";
  const child = spawn(TSX, ["server/index.ts"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), MARKET_PROVIDER: "yahoo" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true, // own process group so the whole tsx tree can be killed
  });
  child.stdout?.on("data", (d) => (log += String(d)));
  child.stderr?.on("data", (d) => (log += String(d)));
  let exited = false;
  child.once("exit", () => (exited = true));
  const running: Running = { child, base: `http://127.0.0.1:${port}`, output: () => log.trim().slice(-1500) };

  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (exited) throw new Error(`server exited before ready:\n${running.output()}`);
    try {
      const res = await fetch(`${running.base}/api/health`);
      if (res.ok) return running;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within 25s:\n${running.output()}`);
}

function stop(running: Running | undefined) {
  const pid = running?.child.pid;
  if (pid && running.child.exitCode === null) {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

function run(args: string[]) {
  const result = spawnSync("corepack", ["pnpm", ...args], { cwd: ROOT, encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}`.trim().slice(-2000) };
}

async function addTicker(page: Page, symbol: string, via: "enter" | "button") {
  const input = page.getByTestId("watchlist-input");
  await input.fill(symbol);
  if (via === "enter") await input.press("Enter");
  else await page.getByTestId("watchlist-add").click();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const build = run(["build"]);
  if (build.status !== 0) throw new Error(`corepack pnpm build failed:\n${build.output}`);
  server = await startServer();
  watchlistEvidence.push(`built with \`corepack pnpm build\`, started \`MARKET_PROVIDER=yahoo tsx server/index.ts\` on ${server.base}`);
});

test.afterAll(() => {
  stop(server);
  if (!watchlistPassed) watchlistEvidence.push("the watchlist test did not pass");
  if (!buildPassed) buildEvidence.push("the typecheck/build/render test did not pass");
  writeEvidence("watchlist", "WATCHLIST", watchlistPassed, watchlistEvidence);
  writeEvidence("build", "BUILD", buildPassed, buildEvidence);
});

test("the watchlist adds, refuses an unknown ticker, removes, and persists across reload", async ({ page }) => {
  await page.goto(server!.base);
  // A fresh browser context has empty localStorage, so the defaults load.
  for (const symbol of ["AAPL", "NVDA", "MSFT", "SPY"]) {
    await expect(page.getByTestId(`watchlist-row-${symbol}`)).toBeVisible();
  }
  watchlistEvidence.push("fresh localStorage -> default rows AAPL, NVDA, MSFT, SPY visible");

  await addTicker(page, "AMD", "enter");
  await expect(page.getByTestId("watchlist-row-AMD")).toBeVisible({ timeout: 15_000 });
  watchlistEvidence.push("typed AMD + Enter -> row watchlist-row-AMD appeared (resolved via /api/symbol/AMD)");

  await addTicker(page, "ZZZZQQ", "button");
  const error = page.getByTestId("watchlist-error");
  await expect(error).toBeVisible({ timeout: 15_000 });
  await expect(error).toContainText("No data for ZZZZQQ");
  await expect(page.getByTestId("watchlist-row-ZZZZQQ")).toHaveCount(0);
  watchlistEvidence.push(`typed ZZZZQQ + Add -> watchlist-error visible "${(await error.textContent())?.trim()}", no ZZZZQQ row`);

  await page.getByTestId("watchlist-remove-AMD").click();
  await expect(page.getByTestId("watchlist-row-AMD")).toHaveCount(0);
  watchlistEvidence.push("clicked watchlist-remove-AMD -> AMD row gone");

  await addTicker(page, "AMD", "enter");
  await expect(page.getByTestId("watchlist-row-AMD")).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByTestId("watchlist-row-AMD")).toBeVisible();
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(JSON.parse(saved ?? "[]")).toContain("AMD");
  watchlistEvidence.push(`added AMD again, reloaded -> AMD row still present; localStorage["${STORAGE_KEY}"] = ${saved}`);

  watchlistPassed = true;
});

test("typecheck and production build pass, and the page renders the Caelos provider and library components", async ({ page }) => {
  const typecheck = run(["typecheck"]);
  expect(typecheck.status, typecheck.output).toBe(0);
  buildEvidence.push("`corepack pnpm typecheck` -> exit 0");

  const build = run(["build"]);
  expect(build.status, build.output).toBe(0);
  buildEvidence.push("`corepack pnpm build` -> exit 0");

  await page.goto(server!.base);
  // CaelosProvider emits data-caelos-theme on its root; library recipes emit caelos-* classes.
  const provider = page.locator('[data-caelos-theme="dark"]');
  await expect(provider.first()).toBeAttached();
  const button = page.locator(".caelos-button").first();
  await expect(button).toBeVisible();
  const surface = page.locator("[data-surface]").first();
  await expect(surface).toBeAttached();
  const styled = await button.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(styled).toContain("IBM Plex Sans");
  buildEvidence.push(
    `served the build -> [data-caelos-theme="dark"] present, .caelos-button visible (computed font-family ${styled}), ` +
      `Surface [data-surface] present`,
  );

  buildPassed = true;
});
