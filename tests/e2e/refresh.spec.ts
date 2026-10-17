import { test, expect, type Route } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeEvidence } from "../../scripts/evidence.mjs";
import type { Bar, BarsResult, Range } from "../../server/providers/types";

// Runs against the built app: `corepack pnpm build`, then the real server (Yahoo) on a free port.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TSX = path.join(ROOT, "node_modules/.bin/tsx");
const SELECTED = "AAPL"; // first default ticker, selected on a fresh load
const EXPECTED_TESTS = 2;

interface Running {
  child: ChildProcess;
  base: string;
  output: () => string;
}

let server: Running | undefined;
const evidence: string[] = [];
const outcomes: boolean[] = [];

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

/** A complete BarsResult whose newest bar is at `lastBarTime` (UTC seconds). */
function fixture(symbol: string, range: Range, marketState: "open" | "closed", lastBarTime: number): BarsResult {
  const step = 5 * 60;
  const bars: Bar[] = [];
  for (let i = 39; i >= 0; i--) {
    const close = 200 + Math.sin(i / 4) * 3 + (39 - i) * 0.1;
    bars.push({ time: lastBarTime - i * step, open: close - 0.4, high: close + 0.8, low: close - 0.9, close, volume: 120_000 + i * 900 });
  }
  return {
    symbol,
    name: `${symbol} Fixture Inc.`,
    currency: "USD",
    exchangeTimezone: "America/New_York",
    interval: "5m",
    range,
    regularMarketPrice: bars[bars.length - 1].close,
    previousClose: 198.5,
    lastBarTime,
    marketState,
    bars,
    fetchedAt: lastBarTime,
  };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const build = spawnSync("corepack", ["pnpm", "build"], { cwd: ROOT, encoding: "utf8" });
  if (build.status !== 0) throw new Error(`corepack pnpm build failed:\n${build.stdout}\n${build.stderr}`);
  server = await startServer();
  evidence.push(`built with \`corepack pnpm build\`, started \`MARKET_PROVIDER=yahoo tsx server/index.ts\` on ${server.base}`);
});

test.afterEach(({}, testInfo) => {
  outcomes.push(testInfo.status === testInfo.expectedStatus);
});

test.afterAll(() => {
  stop(server);
  const passed = outcomes.length === EXPECTED_TESTS && outcomes.every(Boolean);
  if (!passed) evidence.push(`only ${outcomes.filter(Boolean).length} of ${EXPECTED_TESTS} checks passed`);
  writeEvidence("refresh", "REFRESH", passed, evidence);
});

test("chart bars re-fetch every 5 minutes without a page reload and the latest bar time is shown", async ({ page }) => {
  const barsRequests: string[] = [];
  page.on("request", (req) => {
    if (new URL(req.url()).pathname.endsWith(`/api/bars/${SELECTED}`)) barsRequests.push(req.url());
  });
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations++;
  });

  await page.clock.install(); // starts at the real time and keeps running until told otherwise
  await page.goto(server!.base);
  const lastBar = page.getByTestId("chart-last-bar");
  await expect(lastBar).toBeVisible({ timeout: 20_000 });
  await expect(lastBar).not.toHaveText(/^\s*$/);
  await expect(page.getByTestId("chart")).toBeVisible();
  const navigationsAfterLoad = navigations;
  const initial = barsRequests.length;
  expect(initial).toBeGreaterThan(0);

  // Negative control: nothing re-fetches before the 5-minute mark.
  await page.clock.fastForward("04:30");
  await page.waitForTimeout(1_000);
  expect(barsRequests.length, "no re-fetch before 5 minutes").toBe(initial);
  const before = barsRequests.length;

  await page.clock.fastForward("05:00");
  await expect.poll(() => barsRequests.length, { timeout: 15_000 }).toBeGreaterThan(before);
  await expect(lastBar).not.toHaveText(/^\s*$/);
  expect(navigations, "no navigation between the load and the refresh").toBe(navigationsAfterLoad);

  const lastBarText = (await lastBar.textContent())?.trim();
  evidence.push(
    `page.clock.install() then load: ${initial} request(s) to /api/bars/${SELECTED}; fastForward("04:30") -> still ${before}; ` +
      `page.clock.fastForward("05:00") -> ${barsRequests.length} request(s), ${navigations - navigationsAfterLoad} navigations in between`,
  );
  evidence.push(`chart-last-bar visible and non-empty: "${lastBarText}"`);
});

test("the badge reads Live on fresh open-market data and Market closed on stale data", async ({ page }) => {
  // No fake clock in this test, so the page's Date.now() is the test process's.
  const now = Math.floor(Date.now() / 1000);
  let next = (symbol: string, range: Range) => fixture(symbol, range, "open", now);
  await page.route("**/api/bars/**", async (route: Route) => {
    const url = new URL(route.request().url());
    const symbol = decodeURIComponent(url.pathname.split("/").pop() ?? SELECTED);
    const range = (url.searchParams.get("range") ?? "1mo") as Range;
    await route.fulfill({ json: next(symbol, range) });
  });

  await page.goto(server!.base);
  const badge = page.getByTestId("chart-badge");
  await expect(badge).toHaveText(/Live/, { timeout: 15_000 });
  const liveLine = (await page.getByTestId("chart-last-bar").textContent())?.trim();
  evidence.push(`fixture marketState=open, lastBarTime=now -> chart-badge "${(await badge.textContent())?.trim()}", chart-last-bar "${liveLine}"`);

  const threeDaysAgo = now - 3 * 24 * 60 * 60;
  next = (symbol, range) => fixture(symbol, range, "closed", threeDaysAgo);
  await page.getByTestId("range-5d").click(); // a new range forces a fresh fetch without reloading
  await expect(badge).toHaveText(/Market closed/, { timeout: 15_000 });
  await expect(badge).not.toContainText("Live");
  const closedLine = (await page.getByTestId("chart-last-bar").textContent())?.trim();
  expect(closedLine).toContain("ET");
  evidence.push(
    `fixture marketState=closed, lastBarTime=3 days old (range-5d click) -> chart-badge "${(await badge.textContent())?.trim()}" ` +
      `(no "Live"), chart-last-bar "${closedLine}"`,
  );
});
