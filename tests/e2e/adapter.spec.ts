import { test, expect } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeEvidence } from "../../scripts/evidence.mjs";
import type { BarsResult, MarketDataProvider } from "../../server/providers/types";
import type { yahooProvider } from "../../server/providers/yahoo";
import type { schwabProvider } from "../../server/providers/schwab";

// Compile-time proof (checked by `pnpm typecheck`): both providers satisfy the one interface.
type BothProvidersImplementTheInterface = [typeof yahooProvider, typeof schwabProvider] extends [
  MarketDataProvider,
  MarketDataProvider,
]
  ? true
  : never;
export const providersTypecheck: BothProvidersImplementTheInterface = true;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TSX = path.join(ROOT, "node_modules/.bin/tsx");
const EXPECTED_TESTS = 4;

interface Running {
  child: ChildProcess;
  base: string;
  output: () => string;
}

const evidence: string[] = [];
const outcomes: boolean[] = [];
const servers: Running[] = [];
let yahoo: Running;
let schwab: Running;

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

async function startServer(provider: "yahoo" | "schwab"): Promise<Running> {
  const port = await freePort();
  let log = "";
  const child = spawn(TSX, ["server/index.ts"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), MARKET_PROVIDER: provider },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true, // own process group so the whole tsx tree can be killed
  });
  child.stdout?.on("data", (d) => (log += String(d)));
  child.stderr?.on("data", (d) => (log += String(d)));
  let exited = false;
  child.once("exit", () => (exited = true));
  const running: Running = { child, base: `http://127.0.0.1:${port}`, output: () => log.trim().slice(-1500) };
  servers.push(running);

  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (exited) throw new Error(`server (${provider}) exited before ready:\n${running.output()}`);
    try {
      const res = await fetch(`${running.base}/api/health`);
      if (res.ok) return running;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server (${provider}) not ready within 25s:\n${running.output()}`);
}

function stopAll() {
  for (const { child } of servers) {
    if (child.pid && child.exitCode === null) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // already gone
      }
    }
  }
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  yahoo = await startServer("yahoo");
  evidence.push(`started \`MARKET_PROVIDER=yahoo tsx server/index.ts\` on ${yahoo.base}`);
  schwab = await startServer("schwab");
  evidence.push(`started \`MARKET_PROVIDER=schwab tsx server/index.ts\` on ${schwab.base}`);
});

test.afterEach(({}, testInfo) => {
  outcomes.push(testInfo.status === testInfo.expectedStatus);
});

test.afterAll(() => {
  stopAll();
  const passed = outcomes.length === EXPECTED_TESTS && outcomes.every(Boolean);
  if (!passed) evidence.push(`only ${outcomes.filter(Boolean).length} of ${EXPECTED_TESTS} checks passed`);
  writeEvidence("adapter", "ADAPTER", passed, evidence);
});

test("Yahoo bars are served through the provider interface", async () => {
  const res = await fetch(`${yahoo.base}/api/bars/AAPL?range=5d`);
  const body = (await res.json()) as BarsResult;
  expect(res.status).toBe(200);
  expect(body.bars.length).toBeGreaterThan(0);
  for (const bar of body.bars) {
    for (const key of ["time", "open", "high", "low", "close", "volume"] as const) {
      expect(typeof bar[key], `bar.${key}`).toBe("number");
      expect(Number.isFinite(bar[key]), `bar.${key} finite`).toBe(true);
    }
  }
  for (let i = 1; i < body.bars.length; i++) {
    expect(body.bars[i].time, `bar ${i} time`).toBeGreaterThan(body.bars[i - 1].time);
  }
  const health = (await (await fetch(`${yahoo.base}/api/health`)).json()) as { provider: string };
  expect(health.provider).toBe("yahoo");
  evidence.push(
    `GET /api/bars/AAPL?range=5d -> 200, ${body.bars.length} bars (${body.interval}), times strictly ascending, ` +
      `last bar ${new Date(body.lastBarTime * 1000).toISOString()}, marketState=${body.marketState}, /api/health provider=yahoo`,
  );
});

test("an unknown symbol returns 404 No data for ZZZZQQ", async () => {
  const res = await fetch(`${yahoo.base}/api/symbol/ZZZZQQ`);
  const body = (await res.json()) as { error: string };
  expect(res.status).toBe(404);
  expect(body.error).toContain("No data for ZZZZQQ");
  evidence.push(`GET /api/symbol/ZZZZQQ -> 404 ${JSON.stringify(body)}`);
});

test("a Schwab-selected server answers not-configured without crashing", async () => {
  const res = await fetch(`${schwab.base}/api/bars/AAPL`);
  const body = (await res.json()) as { error: string };
  expect(res.status).toBe(501);
  expect(body.error).toContain("not configured");
  const health = await fetch(`${schwab.base}/api/health`);
  const healthBody = (await health.json()) as { provider: string };
  expect(health.status).toBe(200);
  expect(healthBody.provider).toBe("schwab");
  evidence.push(
    `GET /api/bars/AAPL (schwab server) -> 501 "${body.error}"; then GET /api/health -> 200 provider=${healthBody.provider} (server still up)`,
  );
});

test("pnpm typecheck passes over both providers", () => {
  const run = spawnSync("corepack", ["pnpm", "typecheck"], { cwd: ROOT, encoding: "utf8" });
  expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
  evidence.push("`corepack pnpm typecheck` (tsc --noEmit over server/, src/, tests/ incl. both providers vs MarketDataProvider) -> exit 0");
});
