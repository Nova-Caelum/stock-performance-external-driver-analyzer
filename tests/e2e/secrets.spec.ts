import { test, expect, type Page, type Route } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeEvidence } from "../../scripts/evidence.mjs";
import type { Bar, BarsResult, Range } from "../../server/providers/types";

// Key custody: the OpenRouter key may live only in the server process.
// (a) the built bundle holds no key material, (b) no browser request carries it,
// (c) the documented start command fetches it from BWS into the server and prints none of it.
//
// Hook-secret-handling: assertions in this file are booleans or counts, never `.toContain(secret)`,
// so a failure cannot print captured output or a request that holds key material. Evidence lines
// describe what was checked; they never quote a request, a log line or a key.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TSX = path.join(ROOT, "node_modules/.bin/tsx");
const CLIENT_DIR = path.join(ROOT, "dist/client/marketforces-dashboard"); // the built client, under its base path
const FAKE_KEY = "sk-or-v1-test-not-a-real-key";
const KEY_PREFIX = "sk-or-";
const NEEDLES = [KEY_PREFIX, FAKE_KEY];
const EXPECTED_TESTS = 3;

interface Running {
  child: ChildProcess;
  base: string;
  output: () => string;
}

const evidence: string[] = [];
const outcomes: boolean[] = [];
let app: Running | undefined;
let fakeUpstream: { base: string; authorizations: (string | undefined)[]; close: () => void } | undefined;

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

async function waitForHealth(base: string, exited: () => boolean, describe: () => string, timeoutMs: number): Promise<{ hasKey: boolean }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (exited()) throw new Error(`server exited before ready (${describe()})`);
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return (await res.json()) as { hasKey: boolean };
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server not ready within ${timeoutMs / 1000}s (${describe()})`);
}

/** The tail of captured output with anything key-shaped masked, safe to put in an error message. */
function redactedTail(text: string): string {
  return text.replace(/sk-or-[\w-]*/g, "sk-or-[REDACTED]").trim().slice(-1200);
}

function spawnGroup(command: string, args: string[], env: NodeJS.ProcessEnv): { child: ChildProcess; output: () => string; exited: () => boolean } {
  let log = "";
  const child = spawn(command, args, {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true, // own process group so the whole tree (start.sh -> corepack -> pnpm -> tsx -> node) can be killed
  });
  child.stdout?.on("data", (d) => (log += String(d)));
  child.stderr?.on("data", (d) => (log += String(d)));
  let done = false;
  child.once("exit", () => (done = true));
  return { child, output: () => log, exited: () => done };
}

function stop(child: ChildProcess | undefined) {
  if (child?.pid && child.exitCode === null) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

// ---------------------------------------------------------------- a fake OpenRouter that records who is asking

async function startFakeUpstream() {
  const authorizations: (string | undefined)[] = [];
  const sockets = new Set<net.Socket>();
  const server = http.createServer(async (req, res) => {
    for await (const _chunk of req) void _chunk;
    authorizations.push(req.headers.authorization);
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "A cited answer [1]." } }] })}\n\n`);
    res.write(
      `data: ${JSON.stringify({ choices: [{ delta: { annotations: [{ type: "url_citation", url_citation: { url: "https://news.example.test/a", title: "A source" } }] } }] })}\n\n`,
    );
    res.end("data: [DONE]\n\n");
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as net.AddressInfo;
  return {
    base: `http://127.0.0.1:${port}/api/v1`,
    authorizations,
    close() {
      for (const socket of sockets) socket.destroy();
      server.close();
    },
  };
}

// ---------------------------------------------------------------- the checks, written so they can fail

/** Every regular file under `dir`, as [relative path, bytes]. */
function readTree(dir: string): [string, Buffer][] {
  const out: [string, Buffer][] = [];
  const walk = (current: string) => {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push([path.relative(dir, full), readFileSync(full)]);
    }
  };
  walk(dir);
  return out;
}

/** Names of the entries whose bytes contain a needle. Only names are returned, never content. */
function filesWithKeyMaterial(entries: Iterable<[string, Buffer]>): string[] {
  const hits: string[] = [];
  for (const [name, bytes] of entries) {
    if (NEEDLES.some((needle) => bytes.includes(Buffer.from(needle)))) hits.push(name);
  }
  return hits;
}

interface Seen {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

function recordRequests(page: Page) {
  const seen: Seen[] = [];
  const pending: Promise<void>[] = [];
  page.on("request", (req) => {
    pending.push(
      (async () => {
        seen.push({ method: req.method(), url: req.url(), headers: await req.allHeaders(), body: req.postData() ?? "" });
      })(),
    );
  });
  return {
    async settled() {
      await Promise.all(pending);
      return seen;
    },
  };
}

/** One label per problem: the request's position and what was wrong with it, never the request itself. */
function leaksIn(seen: Seen[]): string[] {
  const leaks: string[] = [];
  seen.forEach((req, i) => {
    if ("authorization" in req.headers) leaks.push(`request ${i} (${req.method}): has an Authorization header`);
    if (NEEDLES.some((n) => req.url.includes(n))) leaks.push(`request ${i} (${req.method}): URL holds key material`);
    if (NEEDLES.some((n) => JSON.stringify(req.headers).includes(n))) leaks.push(`request ${i} (${req.method}): a header holds key material`);
    if (NEEDLES.some((n) => req.body.includes(n))) leaks.push(`request ${i} (${req.method}): body holds key material`);
  });
  return leaks;
}

// ---------------------------------------------------------------- a small bars fixture so Yahoo cannot fail a secrets check

function fixtureBars(): Bar[] {
  const bars: Bar[] = [];
  const start = Date.UTC(2026, 9, 5, 13, 30) / 1000;
  for (let i = 0; i < 56; i++) {
    const close = Math.round((150 + i * 0.35 + 6 * Math.sin(i / 4)) * 100) / 100;
    const open = i === 0 ? 149.5 : bars[i - 1].close;
    bars.push({
      time: start + Math.floor(i / 7) * 86_400 + (i % 7) * 3600,
      open,
      high: Math.max(open, close) + 0.8,
      low: Math.min(open, close) - 0.7,
      close,
      volume: 40_000 + i * 250,
    });
  }
  return bars;
}

async function routeBars(page: Page) {
  const bars = fixtureBars();
  await page.route("**/api/bars/**", async (route: Route) => {
    const url = new URL(route.request().url());
    const symbol = decodeURIComponent(url.pathname.split("/").pop() ?? "AAPL");
    const last = bars[bars.length - 1];
    const body: BarsResult = {
      symbol,
      name: `${symbol} Fixture Inc.`,
      currency: "USD",
      exchangeTimezone: "America/New_York",
      interval: "60m",
      range: (url.searchParams.get("range") ?? "1mo") as Range,
      regularMarketPrice: last.close,
      previousClose: bars[bars.length - 8].close,
      lastBarTime: last.time,
      marketState: "closed",
      bars,
      fetchedAt: last.time,
    };
    await route.fulfill({ json: body });
  });
}

async function driveOneChat(page: Page, base: string) {
  await routeBars(page);
  await page.goto(base);
  await expect(page.getByTestId("chart-last-bar")).toBeVisible({ timeout: 20_000 });
  const box = await page.getByTestId("chart").boundingBox();
  if (!box) throw new Error("chart has no bounding box");
  const y = box.y + box.height * 0.5;
  await page.mouse.move(box.x + box.width * 0.35, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, y, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId("ctx-window")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "What drove this move?" }).click();
  await expect(page.getByTestId("ctx-answer")).toContainText("A cited answer [1].", { timeout: 15_000 });
  await expect(page.getByTestId("ctx-source")).toHaveCount(1);
}

// ---------------------------------------------------------------- lifecycle

test.describe.configure({ mode: "serial" });

test.afterEach(({}, testInfo) => {
  outcomes.push(testInfo.status === "passed"); // a skipped check is not a pass
});

test.afterAll(() => {
  stop(app?.child);
  fakeUpstream?.close();
  const passed = outcomes.length === EXPECTED_TESTS && outcomes.every(Boolean);
  if (!passed) evidence.push(`only ${outcomes.filter(Boolean).length} of ${EXPECTED_TESTS} checks passed`);
  writeEvidence("secrets", "SECRETS", passed, evidence);
});

// ---------------------------------------------------------------- tests

test("(a) the built bundle holds no key material", () => {
  // The key is in the build's environment on purpose: the scan means something only if the build could have picked it up.
  const build = spawnSync("corepack", ["pnpm", "build"], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, OPENROUTER_API_KEY: FAKE_KEY },
  });
  expect(build.status, "corepack pnpm build exits 0").toBe(0);
  expect(existsSync(path.join(CLIENT_DIR, "index.html"))).toBe(true);

  const entries = readTree(CLIENT_DIR);
  const bytes = entries.reduce((sum, [, b]) => sum + b.length, 0);
  const scripts = entries.filter(([name]) => name.endsWith(".js"));
  expect(entries.length, "the scan covered the built client").toBeGreaterThanOrEqual(3);
  expect(scripts.length).toBeGreaterThanOrEqual(1);
  expect(bytes).toBeGreaterThan(100_000);

  const hits = filesWithKeyMaterial(entries);
  expect(hits, "files under dist/client holding key material").toEqual([]);

  // The scan can fail: planted material is found, in text and in a binary-looking file.
  expect(filesWithKeyMaterial([["planted.js", Buffer.from(`const k = "${FAKE_KEY}";`)]])).toEqual(["planted.js"]);
  expect(filesWithKeyMaterial([["planted.bin", Buffer.concat([Buffer.from([0, 255, 1]), Buffer.from("sk-or-v1-anything")])]])).toEqual(["planted.bin"]);
  expect(filesWithKeyMaterial([["clean.js", Buffer.from("const k = 1;")]])).toEqual([]);

  evidence.push(
    `\`corepack pnpm build\` with the fixed fake key set in the build environment -> exit 0; scanned ${entries.length} files / ${bytes} bytes under dist/client ` +
      `(${scripts.length} script file(s)) for the key prefix and the fake key string: 0 files hold either; the scanner reports a planted key in text and in binary content`,
  );
});

test("(b) one chat driven in the browser sends no key in any request", async ({ page, browser }) => {
  fakeUpstream = await startFakeUpstream();
  const env = { ...process.env, OPENROUTER_API_KEY: FAKE_KEY, OPENROUTER_BASE_URL: fakeUpstream.base, PORT: String(await freePort()), MARKET_PROVIDER: "yahoo" };
  const server = spawnGroup(TSX, ["server/index.ts"], env);
  app = { child: server.child, base: `http://127.0.0.1:${env.PORT}`, output: server.output };
  const health = await waitForHealth(app.base, server.exited, () => `fake-upstream app: ${redactedTail(server.output())}`, 25_000);
  expect(health.hasKey).toBe(true);

  const recorder = recordRequests(page);
  await driveOneChat(page, app.base);
  const seen = await recorder.settled();

  const contextPosts = seen.filter((r) => r.method === "POST" && new URL(r.url).pathname.endsWith("/api/context"));
  expect(contextPosts.length, "the chat request was among those recorded").toBe(1);
  expect(seen.length).toBeGreaterThan(5);
  expect(leaksIn(seen), "browser requests carrying key material").toEqual([]);
  expect(seen.some((r) => "authorization" in r.headers)).toBe(false);

  // The key was real to the server: the upstream received it, in the Authorization header, from the server alone.
  expect(fakeUpstream.authorizations).toEqual([`Bearer ${FAKE_KEY}`]);

  // What the server says back holds none either.
  const healthText = await (await fetch(`${app.base}/api/health`)).text();
  expect(healthText.includes(KEY_PREFIX)).toBe(false);
  expect(server.output().includes(KEY_PREFIX)).toBe(false);

  // The recorder can fail: a request with an Authorization header, and one with key material in the URL, are both caught.
  const control = await browser.newPage();
  const controlRecorder = recordRequests(control);
  await control.goto(`${app.base}/api/health`);
  await control.evaluate(async () => {
    await fetch("/api/health", { headers: { Authorization: "Bearer planted-probe" } });
    await fetch("/api/health?k=sk-or-v1-planted-probe");
  });
  const controlLeaks = leaksIn(await controlRecorder.settled());
  await control.close();
  expect(controlLeaks.some((l) => l.includes("Authorization header"))).toBe(true);
  expect(controlLeaks.some((l) => l.includes("URL holds key material"))).toBe(true);

  evidence.push(
    `drove one chat in Chromium (drag on the chart, click a suggestion chip, streamed answer and one source rendered) while recording every request via page.on("request") ` +
      `and request.allHeaders(): ${seen.length} requests, including ${contextPosts.length} POST /api/context; none had an Authorization header and none held key material in URL, headers or body`,
  );
  evidence.push(
    `the fake upstream received exactly one request, with the key in its Authorization header, sent by the server; /api/health and the server's own output hold no key material`,
  );
  evidence.push(`control: a page that sent an Authorization header and a URL with key-shaped text was flagged by the same check (${controlLeaks.length} findings)`);
});

test("(c) scripts/start.sh fetches the key from BWS into the server and prints none of it", async () => {
  test.setTimeout(150_000);
  stop(app?.child); // the (b) server is done
  const bwsOnPath = spawnSync("bash", ["-c", "command -v bws"], { encoding: "utf8" }).status === 0;
  const hasToken = Boolean(process.env.BWS_ACCESS_TOKEN);
  const hasId = Boolean(process.env.MCD_BWS_OPENROUTER_ID); // the start script's entry id comes from the environment
  if (!bwsOnPath || !hasToken || !hasId) {
    const why = !bwsOnPath ? "the bws CLI is not on PATH" : !hasToken ? "BWS_ACCESS_TOKEN is not set" : "MCD_BWS_OPENROUTER_ID is not set";
    evidence.push(`SKIPPED: ${why} in this environment`);
    test.skip(true, "BWS is unavailable in this environment");
  }

  const port = await freePort();
  const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(port) };
  delete env.OPENROUTER_API_KEY;
  delete env.OPENROUTER_BASE_URL;
  expect("OPENROUTER_API_KEY" in env, "the key is UNSET before the start script runs").toBe(false);

  const run = spawnGroup("./scripts/start.sh", [], env);
  try {
    const base = `http://127.0.0.1:${port}`;
    const health = await waitForHealth(base, run.exited, () => `start.sh: ${redactedTail(run.output())}`, 120_000);
    expect(health.hasKey, "/api/health reports a key loaded from BWS").toBe(true);

    // Boolean only: the health route does not return the key, and the script printed none.
    const healthText = await (await fetch(`${base}/api/health`)).text();
    expect(healthText.includes(KEY_PREFIX)).toBe(false);
    const output = run.output();
    expect(output.includes(KEY_PREFIX), "start.sh stdout/stderr holds key material").toBe(false);
    expect(output.includes("http://127.0.0.1")).toBe(true); // the output we scanned is the script's real output, not an empty string
    const lines = output.split("\n").filter((l) => l.trim()).length;
    evidence.push(
      `\`OPENROUTER_API_KEY\` unset, \`PORT=<free>\`, ran \`./scripts/start.sh\` (BWS available: bws on PATH, access token present): /api/health -> hasKey=true; ` +
        `the script's captured stdout/stderr (${lines} lines, including its start URL) contains no key-prefix text; /api/health body contains none; process group then stopped`,
    );
  } finally {
    stop(run.child);
  }
});
