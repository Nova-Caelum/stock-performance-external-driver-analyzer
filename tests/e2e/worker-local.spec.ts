import { test, expect } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeEvidence } from "../../scripts/evidence.mjs";

// MCD-8: the app as a Cloudflare Worker under /marketforces-dashboard, on the local Cloudflare dev server
// (`wrangler dev`, local mode: workerd on this machine with the Durable Object limiter simulated locally).
// Market data is real (Yahoo and the SEC list, fetched from the local runtime); the model is a fake OpenRouter
// started inside this spec, so no real model call is made and no Telegram message is sent.
//
// Hook-secret-handling: the only key here is a fake one, and assertions about it are booleans.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WRANGLER = path.join(ROOT, "node_modules/.bin/wrangler");
const BASE_PATH = "/marketforces-dashboard";
const FAKE_KEY = "sk-or-v1-test-not-a-real-key";
const KEY_PREFIX = "sk-or-";
const PER_MINUTE = 3;
const PER_DAY = 5;
const OTHER_CLIENT = "203.0.113.9"; // wrangler dev passes a client's CF-Connecting-IP through; Cloudflare's edge sets it
const EXPECTED_TESTS = 7;
const THIS_SPEC = path.basename(fileURLToPath(import.meta.url));

interface Running {
  child: ChildProcess;
  origin: string;
  output: () => string;
  exited: () => boolean;
}

interface FakeUpstream {
  base: string;
  requests: { authorization: string | undefined }[];
  close: () => void;
}

const evidence: string[] = [];
const outcomes: boolean[] = [];
let worker: Running | undefined;
let upstream: FakeUpstream | undefined;

// ---------------------------------------------------------------- helpers

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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function stop(proc: Running | undefined) {
  const pid = proc?.child.pid;
  if (pid && proc.child.exitCode === null) {
    try {
      process.kill(-pid, "SIGTERM"); // own process group: wrangler and its workerd go together
    } catch {
      // already gone
    }
  }
}

/** The tail of captured output with anything key-shaped masked, safe to put in an error message. */
function redactedTail(text: string): string {
  return text.replace(/sk-or-[\w-]*/g, "sk-or-[REDACTED]").trim().slice(-1500);
}

/** The environment for child processes: this machine's, minus every credential and the opt-in spend switch. */
function childEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
  for (const name of Object.keys(env)) {
    if (/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(name) && !(name in extra)) delete env[name];
  }
  for (const name of ["OPENROUTER_BASE_URL", "TELEGRAM_CHAT_ID", "CLOUDFLARE_INCLUDE_PROCESS_ENV", "WHOLE_PATH"]) {
    if (!(name in extra)) delete env[name];
  }
  return env;
}

async function startFakeUpstream(): Promise<FakeUpstream> {
  const requests: FakeUpstream["requests"] = [];
  const sockets = new Set<net.Socket>();
  const server = http.createServer(async (req, res) => {
    for await (const _chunk of req) {
      // drain the body
    }
    if (req.method !== "POST" || req.url !== "/api/v1/chat/completions") {
      res.writeHead(404).end();
      return;
    }
    requests.push({ authorization: req.headers.authorization });
    const data = (value: unknown) => `data: ${typeof value === "string" ? value : JSON.stringify(value)}\n\n`;
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    res.write(data({ choices: [{ delta: { content: "A cited answer [1]." } }] }));
    res.write(data({ choices: [{ delta: { annotations: [{ type: "url_citation", url_citation: { url: "https://news.example.test/a", title: "A source" } }] } }] }));
    res.end(data("[DONE]"));
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as net.AddressInfo;
  return {
    base: `http://127.0.0.1:${port}/api/v1`,
    requests,
    close() {
      for (const socket of sockets) socket.destroy();
      server.close();
    },
  };
}

/** `wrangler dev` in local mode on a free port, with its vars from a temp .dev.vars and a fresh state directory. */
async function startWorker(fake: FakeUpstream): Promise<Running> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mcd-worker-"));
  const devVars = path.join(dir, ".dev.vars");
  writeFileSync(
    devVars,
    [
      `OPENROUTER_API_KEY=${FAKE_KEY}`,
      `OPENROUTER_BASE_URL=${fake.base}`,
      "TELEGRAM_BOT_TOKEN=",
      "TELEGRAM_CHAT_ID=",
      `CHAT_LIMIT_PER_MINUTE=${PER_MINUTE}`,
      `CHAT_LIMIT_PER_DAY=${PER_DAY}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  const [port, inspector] = [await freePort(), await freePort()];
  const args = [
    "dev",
    "--local",
    "--ip", "127.0.0.1",
    "--port", String(port),
    "--inspector-port", String(inspector),
    "--env-file", devVars,
    "--persist-to", path.join(dir, "state"), // a stale minute window from an earlier run must not count
    "--show-interactive-dev-session=false",
  ];
  let log = "";
  const child = spawn(WRANGLER, args, {
    cwd: ROOT,
    env: childEnv({ WRANGLER_SEND_METRICS: "false" }),
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  child.stdout?.on("data", (d) => (log += String(d)));
  child.stderr?.on("data", (d) => (log += String(d)));
  let done = false;
  child.once("exit", () => (done = true));
  const proc: Running = { child, origin: `http://127.0.0.1:${port}`, output: () => log, exited: () => done };

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (proc.exited()) throw new Error(`wrangler dev exited before ready: ${redactedTail(log)}`);
    try {
      const res = await fetch(`${proc.origin}${BASE_PATH}/api/health`);
      if (res.ok) return proc;
    } catch {
      // not listening yet
    }
    await sleep(300);
  }
  stop(proc);
  throw new Error(`wrangler dev not ready within 90s: ${redactedTail(log)}`);
}

/** A body the server accepts: the same shape the browser sends. */
function validBody(): Record<string, unknown> {
  const start = Date.UTC(2026, 9, 5, 13, 30) / 1000;
  return {
    symbol: "AAPL",
    name: "Apple Inc.",
    range: "1mo",
    fromTime: start,
    toTime: start + 3 * 86_400,
    stats: { start, end: start + 3 * 86_400, open: 150, close: 155, changePct: 3.33, high: 157, low: 149, volume: 1_000_000, barCount: 20 },
    question: "What drove this move?",
    history: [],
  };
}

function sseEvents(text: string): string[] {
  return text
    .split("\n\n")
    .map((block) => /^event:\s*(\S+)/m.exec(block.trim())?.[1])
    .filter((name): name is string => Boolean(name));
}

const url = (p: string) => `${worker!.origin}${p}`;

// ---------------------------------------------------------------- lifecycle

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  test.setTimeout(240_000);
  const build = spawnSync("corepack", ["pnpm", "build"], { cwd: ROOT, encoding: "utf8", env: childEnv() });
  if (build.status !== 0) throw new Error(`corepack pnpm build failed:\n${build.stdout}\n${build.stderr}`);
  upstream = await startFakeUpstream();
  worker = await startWorker(upstream);
  evidence.push(
    `built with \`corepack pnpm build\`, started \`wrangler dev --local\` (wrangler.jsonc, server/worker.ts) on ${worker.origin} with a temp .dev.vars ` +
      `(fake OpenRouter key, OPENROUTER_BASE_URL -> a fake upstream in this spec, blank Telegram vars, CHAT_LIMIT_PER_MINUTE=${PER_MINUTE}, CHAT_LIMIT_PER_DAY=${PER_DAY}) and a fresh --persist-to state directory`,
  );
});

test.afterEach(({}, testInfo) => {
  outcomes.push(testInfo.status === "passed"); // a skipped check is not a pass
});

test.afterAll(() => {
  stop(worker);
  upstream?.close();
  const passed = outcomes.length === EXPECTED_TESTS && outcomes.every(Boolean);
  if (!passed) evidence.push(`only ${outcomes.filter(Boolean).length} of ${EXPECTED_TESTS} checks passed`);
  writeEvidence("worker-local", "WORKER_LOCAL", passed, evidence);
});

// ---------------------------------------------------------------- tests

test("the client is served under /marketforces-dashboard/ and every script and style it names loads", async () => {
  const page = await fetch(url(`${BASE_PATH}/`));
  expect(page.status).toBe(200);
  expect(page.headers.get("content-type") ?? "").toContain("text/html");
  const html = await page.text();
  expect(html).toContain('<div id="root">');

  const refs = [...html.matchAll(/<(script|link)\b[^>]*\b(?:src|href)="([^"]+)"[^>]*>/g)]
    .filter(([tag, kind]) => kind === "script" || /rel="(stylesheet|modulepreload)"/.test(tag))
    .map(([, kind, ref]) => ({ kind, ref }));
  expect(refs.filter((r) => r.kind === "script").length, "the page names at least one script").toBeGreaterThanOrEqual(1);
  expect(refs.some((r) => r.ref.endsWith(".css")), "the page names a stylesheet").toBe(true);
  const loaded: string[] = [];
  for (const { ref } of refs) {
    expect(ref.startsWith(`${BASE_PATH}/assets/`), `${ref} is under the base path`).toBe(true);
    const res = await fetch(url(ref));
    expect(res.status, ref).toBe(200);
    // A fallback page answering 200 for a missing bundle would pass a status check alone.
    const type = res.headers.get("content-type") ?? "";
    expect(type, ref).toMatch(ref.endsWith(".css") ? /text\/css/ : /javascript/);
    loaded.push(`${ref.slice(BASE_PATH.length + 1)} ${res.status} ${type.split(";")[0]}`);
  }

  const bare = await fetch(url(BASE_PATH), { redirect: "manual" });
  expect(bare.status).toBe(301);
  expect(new URL(bare.headers.get("location") ?? "", worker!.origin).pathname).toBe(`${BASE_PATH}/`);

  // The assets router's own redirects stay inside the base path.
  const index = await fetch(url(`${BASE_PATH}/index.html`), { redirect: "manual" });
  expect(index.status).toBeGreaterThanOrEqual(300);
  expect(index.status).toBeLessThan(400);
  expect(new URL(index.headers.get("location") ?? "", worker!.origin).pathname.startsWith(`${BASE_PATH}/`)).toBe(true);

  const deep = await fetch(url(`${BASE_PATH}/some/client/view`));
  expect(deep.status, "SPA fallback").toBe(200);
  expect(await deep.text()).toContain('<div id="root">');
  const missing = await fetch(url(`${BASE_PATH}/assets/missing-bundle.js`));
  expect(missing.status, "a missing file is a 404, not the page").toBe(404);
  const outside = await fetch(url("/"), { redirect: "manual" });
  expect(outside.status, "paths outside the base path are not this Worker's").toBe(404);

  evidence.push(
    `GET ${BASE_PATH}/ -> 200 text/html; every script and style it names is under ${BASE_PATH}/assets/ and loads: ${loaded.join(", ")}; ` +
      `GET ${BASE_PATH} -> 301 to ${BASE_PATH}/; GET ${BASE_PATH}/index.html -> ${index.status} to ${new URL(index.headers.get("location") ?? "", worker!.origin).pathname}; ` +
      `GET ${BASE_PATH}/some/client/view -> 200 index.html (SPA fallback); a missing asset -> 404; GET / -> 404`,
  );
});

test("the data routes answer under the base path from the local Workers runtime", async () => {
  const health = await fetch(url(`${BASE_PATH}/api/health`));
  expect(health.status).toBe(200);
  const healthBody = (await health.json()) as { provider: string; hasKey: boolean; alerts: boolean };
  expect(healthBody).toEqual({ provider: "yahoo", hasKey: true, alerts: false });

  const bars = await fetch(url(`${BASE_PATH}/api/bars/AAPL?range=5d`));
  const statuses = [`bars ${bars.status}`];
  const barsBody = bars.ok ? ((await bars.json()) as { symbol: string; bars: unknown[]; interval: string }) : null;

  const search = await fetch(url(`${BASE_PATH}/api/search?q=apple`));
  statuses.push(`search ${search.status}`);
  const searchBody = search.ok ? ((await search.json()) as { results: { symbol: string }[] }) : null;

  // A misspelling Yahoo cannot answer: the SEC ticker list, fetched once and kept in the Cache API.
  const typo = await fetch(url(`${BASE_PATH}/api/search?q=microsft`));
  statuses.push(`typo search ${typo.status}`);
  const typoBody = typo.ok ? ((await typo.json()) as { results: { symbol: string }[] }) : null;

  // Yahoo's cookie + crumb handshake, held in isolate memory.
  const summary = await fetch(url(`${BASE_PATH}/api/summary/AAPL`));
  statuses.push(`summary ${summary.status}`);
  const summaryBody = summary.ok ? ((await summary.json()) as { symbol: string; sector: string | null }) : null;

  const unknown = await fetch(url(`${BASE_PATH}/api/symbol/ZZZZQQ`));
  statuses.push(`unknown symbol ${unknown.status}`);

  expect(statuses, "Yahoo and the SEC answered from the local runtime").toEqual([
    "bars 200",
    "search 200",
    "typo search 200",
    "summary 200",
    "unknown symbol 404",
  ]);
  expect(barsBody!.symbol).toBe("AAPL");
  expect(barsBody!.bars.length).toBeGreaterThan(10);
  expect(searchBody!.results.map((r) => r.symbol)).toContain("AAPL");
  expect(typoBody!.results[0]?.symbol).toBe("MSFT");
  expect(summaryBody!.sector).toBeTruthy();
  expect(worker!.output().includes(KEY_PREFIX), "wrangler printed key material").toBe(false);

  evidence.push(
    `GET ${BASE_PATH}/api/health -> 200 ${JSON.stringify(healthBody)}; /api/bars/AAPL?range=5d -> 200, ${barsBody!.bars.length} bars (${barsBody!.interval}) from Yahoo; ` +
      `/api/search?q=apple -> ${searchBody!.results.map((r) => r.symbol).join(", ")}; /api/search?q=microsft -> ${typoBody!.results[0].symbol} (SEC list via the Cache API); ` +
      `/api/summary/AAPL -> 200 sector=${summaryBody!.sector} (cookie + crumb); /api/symbol/ZZZZQQ -> 404; wrangler's output holds no key material`,
  );
});

test("a burst of questions from one client gets HTTP 429 from the shared limiter, before the model is called", async () => {
  upstream!.requests.length = 0;
  const ask = async (client?: string) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (client) headers["CF-Connecting-IP"] = client;
    const res = await fetch(url(`${BASE_PATH}/api/context`), { method: "POST", headers, body: JSON.stringify(validBody()) });
    const text = await res.text();
    return { status: res.status, events: sseEvents(text), retryAfter: res.headers.get("retry-after"), body: text };
  };
  const seconds = (n: string | null) => `${n} ${n === "1" ? "second" : "seconds"}`;

  // One client: PER_MINUTE questions answered, the next refused for the minute; the model saw only the answered ones.
  const burst = [];
  for (let n = 0; n < PER_MINUTE + 1; n++) burst.push(await ask());
  for (const answer of burst.slice(0, PER_MINUTE)) {
    expect(answer.status).toBe(200);
    expect(answer.events).toEqual(["delta", "sources", "done"]);
  }
  const refused = burst[PER_MINUTE];
  expect(refused.status).toBe(429);
  expect(Number(refused.retryAfter)).toBeGreaterThanOrEqual(1);
  expect(Number(refused.retryAfter)).toBeLessThanOrEqual(60);
  expect(JSON.parse(refused.body)).toEqual({ error: `Too many questions right now — try again in ${seconds(refused.retryAfter)}.` });
  expect(upstream!.requests, "the fake upstream saw only the admitted questions").toHaveLength(PER_MINUTE);

  // The minute is counted per client, the day for everyone: another client is answered until the day's cap is reached.
  const other = [];
  for (let n = 0; n < PER_DAY - PER_MINUTE + 1; n++) other.push(await ask(OTHER_CLIENT));
  expect(other.slice(0, -1).map((a) => a.status)).toEqual(new Array(PER_DAY - PER_MINUTE).fill(200));
  const capped = other[other.length - 1];
  expect(capped.status).toBe(429);
  expect(JSON.parse(capped.body)).toEqual({ error: "Too many questions today — the daily limit is reached; it resets at midnight ET." });
  expect(Number(capped.retryAfter)).toBeGreaterThan(0);
  expect(Number(capped.retryAfter)).toBeLessThanOrEqual(25 * 3600);
  expect(upstream!.requests).toHaveLength(PER_DAY);

  expect(upstream!.requests.every((r) => r.authorization === `Bearer ${FAKE_KEY}`), "the key went to the upstream only in the Authorization header").toBe(true);
  expect([...burst, ...other].some((a) => a.body.includes(KEY_PREFIX)), "a response holds key material").toBe(false);

  evidence.push(
    `${PER_MINUTE + 1} valid POST ${BASE_PATH}/api/context from one client inside a minute (CHAT_LIMIT_PER_MINUTE=${PER_MINUTE}): ` +
      `${burst.map((a) => a.status).join(", ")}; the refusal carried Retry-After ${refused.retryAfter} and ${refused.body}; the fake upstream had seen ${PER_MINUTE} requests; ` +
      `then a second client (CF-Connecting-IP ${OTHER_CLIENT}): ${other.map((a) => a.status).join(", ")} - answered until the day's cap of ${PER_DAY} (CHAT_LIMIT_PER_DAY) across both, ` +
      `then ${capped.body} with Retry-After ${capped.retryAfter} (seconds to midnight ET); the fake upstream saw ${upstream!.requests.length} requests in all, each with the key only in its Authorization header`,
  );
});

test("if the limiter cannot be reached, the chat fails closed with 503 and calls nothing", async () => {
  const { createApp } = await import("../../server/app");
  const { yahooProvider } = await import("../../server/providers/yahoo");
  let called = 0;
  const app = createApp({
    provider: yahooProvider,
    chat: { key: FAKE_KEY, baseUrl: "http://127.0.0.1:9/never-called" },
    limiter: {
      admit: async () => {
        called++;
        throw new Error("Durable Object unreachable");
      },
    },
    alerts: { enabled: false, chatFailure: async () => false },
  });
  const res = await app.request(`${BASE_PATH}/api/context`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validBody()) });
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ error: "Chat is temporarily unavailable." });
  expect(called, "the limiter was asked").toBe(1);
  evidence.push(`createApp with a limiter whose admit() rejects: POST ${BASE_PATH}/api/context -> 503 {"error":"Chat is temporarily unavailable."}; the upstream was never called (fail closed)`);
});

test("a browser renders the watchlist and the chart under the base path, and the Caelos wordmark links home", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", (req) => {
    const p = new URL(req.url()).pathname;
    if (p.includes("/api/")) apiCalls.push(p);
  });
  await page.goto(url(`${BASE_PATH}/`));
  for (const symbol of ["AAPL", "NVDA", "MSFT", "SPY"]) {
    await expect(page.getByTestId(`watchlist-row-${symbol}`)).toBeVisible({ timeout: 20_000 });
  }
  await expect(page.getByTestId("chart")).toBeVisible();
  const lastBar = page.getByTestId("chart-last-bar");
  await expect(lastBar).toBeVisible({ timeout: 30_000 });
  await expect(lastBar).not.toHaveText(/^\s*$/);
  expect(apiCalls.length).toBeGreaterThan(0);
  expect(apiCalls.every((p) => p.startsWith(`${BASE_PATH}/api/`)), "every API call is under the base path").toBe(true);

  const home = page.getByRole("link", { name: "Nova Caelum home" });
  await expect(home).toHaveCount(1);
  await expect(home).toHaveAttribute("href", "https://novacaelum.com/");
  const mark = home.locator('svg[viewBox="0 0 2750 800"]');
  await expect(mark).toBeVisible();
  await expect(mark).toHaveAttribute("aria-hidden", "true");

  evidence.push(
    `Chromium at ${BASE_PATH}/: default watchlist rows AAPL, NVDA, MSFT, SPY and the chart rendered, last bar "${(await lastBar.textContent())?.trim()}"; ` +
      `${apiCalls.length} API calls, all under ${BASE_PATH}/api/ (e.g. ${apiCalls[0]}); the header link "Nova Caelum home" has href https://novacaelum.com/ and holds the decorative Caelos wordmark`,
  );
});

test("wrangler deploy --dry-run packages the Worker, its assets and the limiter", async () => {
  stop(worker); // the dev server is done; the remaining checks do not need it
  const outdir = mkdtempSync(path.join(os.tmpdir(), "mcd-dry-run-"));
  const dry = spawnSync(WRANGLER, ["deploy", "--dry-run", "--outdir", outdir], { cwd: ROOT, encoding: "utf8", env: childEnv({ WRANGLER_SEND_METRICS: "false" }) });
  const output = `${dry.stdout}\n${dry.stderr}`.replace(/\x1b\[[0-9;]*m/g, ""); // test runners force colour on
  expect(dry.status, redactedTail(output)).toBe(0);
  expect(output).toContain("env.CHAT_LIMITER (ChatLimiter)");
  expect(output).toContain("env.ASSETS");
  expect(readdirSync(outdir)).toContain("worker.js");
  evidence.push(`\`wrangler deploy --dry-run --outdir <tmp>\` -> exit 0; bindings listed include env.CHAT_LIMITER (ChatLimiter) and env.ASSETS; bundle worker.js written`);
});

test("the existing test suite still passes", async () => {
  test.setTimeout(600_000);
  const specs = readdirSync(path.join(ROOT, "tests/e2e"))
    .filter((name) => name.endsWith(".spec.ts") && name !== THIS_SPEC)
    .sort()
    .map((name) => `tests/e2e/${name}`);
  expect(specs.length).toBeGreaterThanOrEqual(8);
  const scratch = mkdtempSync(path.join(os.tmpdir(), "mcd-suite-"));
  // The suite's own evidence goes to scratch, never to this spec's EVIDENCE_DIR. The real BWS checks keep the
  // credentials of this machine (they skip without them); WHOLE_PATH stays unset, so nothing spends credit.
  const env: NodeJS.ProcessEnv = { ...process.env, EVIDENCE_DIR: path.join(scratch, "evidence") };
  delete env.WHOLE_PATH;
  const suite = spawnSync("corepack", ["pnpm", "exec", "playwright", "test", ...specs, "--output", path.join(scratch, "results"), "--reporter", "line"], {
    cwd: ROOT,
    encoding: "utf8",
    env,
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${suite.stdout}\n${suite.stderr}`;
  const count = (label: string) => Number(new RegExp(`(\\d+) ${label}`).exec(output)?.[1] ?? 0);
  const [passed, skipped, failed, flaky] = [count("passed"), count("skipped"), count("failed"), count("flaky")];
  expect(suite.status, redactedTail(output)).toBe(0);
  expect(failed).toBe(0);
  expect(flaky).toBe(0);
  expect(passed).toBeGreaterThanOrEqual(31);
  evidence.push(`\`playwright test\` over the ${specs.length} existing spec files (${specs.map((s) => path.basename(s, ".spec.ts")).join(", ")}) with a scratch EVIDENCE_DIR -> exit 0: ${passed} passed, ${skipped} skipped, 0 failed`);
});
