import { test, expect, type Page, type Route } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeEvidence } from "../../scripts/evidence.mjs";
import type { Bar, BarsResult, Range } from "../../server/providers/types";

// MCD-R3 cost controls: the chat runs on its own capped OpenRouter key and the cheaper model, is rate limited,
// and tells Daniel on Telegram (DevOps-Lead bot) when a call fails.
//
// Everything runs against a fake OpenRouter and a fake Telegram started inside this spec: no real model call,
// no real Telegram message. The one real thing is the BWS test at the end, which only starts the app.
//
// Hook-secret-handling: assertions on secrets are booleans (`.includes(x)` then `.toBe(false)`), so a failure
// prints "true" and never the text it scanned. Evidence lines name BWS entries and ids, never values.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TSX = path.join(ROOT, "node_modules/.bin/tsx");
const EXPECTED_TESTS = 9;

const MODEL = "deepseek/deepseek-v4.1-flash";
const FAKE_KEY = "sk-or-v1-test-not-a-real-key";
const KEY_PREFIX = "sk-or-";
const FAKE_BOT_TOKEN = "123:fake-token";
const FAKE_CHAT_ID = "424242";
const CANARY = "CANARYWORD92";
const CANARY_QUESTION = `Why did ${CANARY} move so much?`;
const PROVIDER_ECHO_KEY = "sk-or-v1-echoed-by-provider";

// The start script reads its BWS entry ids from MCD_BWS_* (they are not in the repository). The stand-in tests invent
// their own ids; the real-BWS test takes this machine's from the environment and skips without them.
const ENTRY_NAME = "Stock_Analyzer_OPENROUTERKEY";
const STANDIN_IDS = { openrouter: randomUUID(), botToken: randomUUID(), chatId: randomUUID() };
const REAL_IDS = {
  openrouter: process.env.MCD_BWS_OPENROUTER_ID ?? "",
  botToken: process.env.MCD_BWS_TELEGRAM_TOKEN_ID ?? "",
  chatId: process.env.MCD_BWS_TELEGRAM_CHAT_ID ?? "",
};

interface Running {
  child: ChildProcess;
  base: string;
  output: () => string;
  exited: () => boolean;
}

interface UpstreamBody {
  model: string;
  stream: boolean;
  max_tokens: number;
  plugins: { id: string; engine?: string; mode?: string; max_results?: number; search_prompt?: string }[];
  messages: { role: string; content: string }[];
}

type UpstreamMode = "stream" | "http-500" | "http-402" | "empty";

interface FakeUpstream {
  base: string;
  requests: { authorization: string | undefined; body: UpstreamBody }[];
  mode: UpstreamMode;
  /** Requests that arrive after this call wait until the returned function is called. */
  gate: () => () => void;
  close: () => void;
}

interface FakeTelegram {
  base: string;
  /** What the bot was asked to send; `path` carries the token by design (/bot<token>/sendMessage). */
  messages: { path: string; chatId: unknown; text: string; otherFields: string[] }[];
  failWith: number | null;
  close: () => void;
}

const evidence: string[] = [];
const outcomes: boolean[] = [];
const running: Running[] = [];
let upstream: FakeUpstream;
let telegram: FakeTelegram;

// ---------------------------------------------------------------- process helpers

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

function spawnGroup(command: string, args: string[], env: NodeJS.ProcessEnv): Running {
  let log = "";
  const child = spawn(command, args, { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"], detached: true }); // own process group: the whole tree can be killed
  child.stdout?.on("data", (d) => (log += String(d)));
  child.stderr?.on("data", (d) => (log += String(d)));
  let done = false;
  child.once("exit", () => (done = true));
  const proc: Running = { child, base: "", output: () => log, exited: () => done };
  running.push(proc);
  return proc;
}

function stop(proc: Running | undefined) {
  const pid = proc?.child.pid;
  if (pid && proc.child.exitCode === null) {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

/** The tail of captured output with anything key-shaped masked, safe to put in an error message. */
function redactedTail(text: string): string {
  return text.replace(/sk-or-[\w-]*/g, "sk-or-[REDACTED]").replace(/\b\d{5,}:[\w-]{20,}/g, "[BOT-TOKEN-REDACTED]").trim().slice(-1200);
}

async function waitForHealth(proc: Running, timeoutMs: number): Promise<{ provider: string; hasKey: boolean; alerts: unknown }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (proc.exited()) throw new Error(`process exited before ready: ${redactedTail(proc.output())}`);
    try {
      const res = await fetch(`${proc.base}/api/health`);
      if (res.ok) return (await res.json()) as { provider: string; hasKey: boolean; alerts: unknown };
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`not ready within ${timeoutMs / 1000}s: ${redactedTail(proc.output())}`);
}

/** The app as the specs run it: tsx server/index.ts on a free port, wired to the fakes, with `overrides` on top. */
async function startApp(overrides: Record<string, string | undefined> = {}): Promise<Running> {
  const port = await freePort();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OPENROUTER_API_KEY: FAKE_KEY,
    OPENROUTER_BASE_URL: upstream.base,
    TELEGRAM_BOT_TOKEN: FAKE_BOT_TOKEN,
    TELEGRAM_CHAT_ID: FAKE_CHAT_ID,
    TELEGRAM_API_BASE: telegram.base,
    PORT: String(port),
    MARKET_PROVIDER: "yahoo",
  };
  delete env.CHAT_LIMIT_PER_MINUTE;
  delete env.CHAT_LIMIT_PER_DAY;
  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[name];
    else env[name] = value;
  }
  const proc = spawnGroup(TSX, ["server/index.ts"], env);
  proc.base = `http://127.0.0.1:${port}`;
  await waitForHealth(proc, 25_000);
  return proc;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Nothing the process printed holds key or bot-token material. Booleans only, so a failure prints no text. */
function expectNoSecretsPrinted(proc: Running, label: string) {
  const out = proc.output();
  expect(out.includes(KEY_PREFIX), `${label}: output holds an OpenRouter key`).toBe(false);
  expect(out.includes(FAKE_BOT_TOKEN), `${label}: output holds the bot token`).toBe(false);
}

// ---------------------------------------------------------------- fake OpenRouter

function sseData(value: unknown): string {
  return `data: ${typeof value === "string" ? value : JSON.stringify(value)}\n\n`;
}

async function startFakeUpstream(): Promise<FakeUpstream> {
  const state = { mode: "stream" as UpstreamMode, gate: null as null | Promise<void> };
  const requests: FakeUpstream["requests"] = [];
  const sockets = new Set<net.Socket>();

  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    if (req.method !== "POST" || req.url !== "/api/v1/chat/completions") {
      res.writeHead(404).end();
      return;
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as UpstreamBody;
    requests.push({ authorization: req.headers.authorization, body });
    if (state.gate) await state.gate;

    const asked = body.messages[body.messages.length - 1].content;
    if (state.mode === "http-500") {
      // A provider that echoes what it was asked, and a credential, into its own error text.
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: `Provider error while answering: ${asked} (credential ${PROVIDER_ECHO_KEY}, Bearer abc123)` } }));
      return;
    }
    if (state.mode === "http-402") {
      res.writeHead(402, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Insufficient credits for this request." } }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    res.write(sseData({ choices: [{ delta: { role: "assistant", content: "" } }] }));
    if (state.mode === "empty") {
      res.write(sseData({ choices: [{ delta: { reasoning: "thinking, then nothing" }, finish_reason: "length" }] }));
      res.end(sseData("[DONE]"));
      return;
    }
    res.write(sseData({ choices: [{ delta: { content: "A cited answer [1]." } }] }));
    res.write(sseData({ choices: [{ delta: { annotations: [{ type: "url_citation", url_citation: { url: "https://news.example.test/a", title: "A source" } }] } }] }));
    res.end(sseData("[DONE]"));
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
    get mode() {
      return state.mode;
    },
    set mode(next: UpstreamMode) {
      state.mode = next;
    },
    gate() {
      let release!: () => void;
      state.gate = new Promise<void>((resolve) => (release = resolve));
      return () => {
        state.gate = null;
        release();
      };
    },
    close() {
      for (const socket of sockets) socket.destroy();
      server.close();
    },
  };
}

// ---------------------------------------------------------------- fake Telegram

async function startFakeTelegram(): Promise<FakeTelegram> {
  const messages: FakeTelegram["messages"] = [];
  const state = { failWith: null as number | null };
  const sockets = new Set<net.Socket>();
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
    } catch {
      // not JSON: recorded with empty fields
    }
    messages.push({
      path: req.url ?? "",
      chatId: parsed.chat_id,
      text: typeof parsed.text === "string" ? parsed.text : "",
      otherFields: Object.keys(parsed).filter((k) => k !== "chat_id" && k !== "text"),
    });
    if (state.failWith) {
      res.writeHead(state.failWith, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, description: "fake failure" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, result: { message_id: 1 } }));
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as net.AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    messages,
    get failWith() {
      return state.failWith;
    },
    set failWith(next: number | null) {
      state.failWith = next;
    },
    close() {
      for (const socket of sockets) socket.destroy();
      server.close();
    },
  };
}

// ---------------------------------------------------------------- fixtures and browser helpers

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

const BARS = fixtureBars();

async function routeBars(page: Page) {
  await page.route("**/api/bars/**", async (route: Route) => {
    const url = new URL(route.request().url());
    const symbol = decodeURIComponent(url.pathname.split("/").pop() ?? "AAPL");
    const last = BARS[BARS.length - 1];
    const body: BarsResult = {
      symbol,
      name: `${symbol} Fixture Inc.`,
      currency: "USD",
      exchangeTimezone: "America/New_York",
      interval: "60m",
      range: (url.searchParams.get("range") ?? "1mo") as Range,
      regularMarketPrice: last.close,
      previousClose: BARS[BARS.length - 8].close,
      lastBarTime: last.time,
      marketState: "closed",
      bars: BARS,
      fetchedAt: last.time,
    };
    await route.fulfill({ json: body });
  });
}

async function openAndSelect(page: Page, base: string) {
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
}

async function ask(page: Page, question: string) {
  const input = page.getByTestId("ctx-input");
  await input.fill(question);
  await input.press("Enter");
}

/** A body the server accepts: the same shape the browser sends. */
function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const from = BARS[10].time;
  const to = BARS[30].time;
  const inside = BARS.filter((b) => b.time >= from && b.time <= to);
  return {
    symbol: "AAPL",
    name: "Apple Inc.",
    range: "1mo",
    fromTime: from,
    toTime: to,
    stats: {
      start: inside[0].time,
      end: inside[inside.length - 1].time,
      open: inside[0].open,
      close: inside[inside.length - 1].close,
      changePct: 3.12,
      high: Math.max(...inside.map((b) => b.high)),
      low: Math.min(...inside.map((b) => b.low)),
      volume: inside.reduce((sum, b) => sum + b.volume, 0),
      barCount: inside.length,
    },
    question: "What drove this move?",
    history: [],
    ...overrides,
  };
}

async function postContext(base: string, body: unknown) {
  const res = await fetch(`${base}/api/context`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const text = await res.text();
  return { res, text };
}

function sseEvents(text: string): string[] {
  return text
    .split("\n\n")
    .map((block) => /^event:\s*(\S+)/m.exec(block.trim())?.[1])
    .filter((name): name is string => Boolean(name));
}

// ---------------------------------------------------------------- lifecycle

test.beforeAll(async () => {
  const build = spawnSync("corepack", ["pnpm", "build"], { cwd: ROOT, encoding: "utf8" });
  if (build.status !== 0) throw new Error(`corepack pnpm build failed:\n${build.stdout}\n${build.stderr}`);
  upstream = await startFakeUpstream();
  telegram = await startFakeTelegram();
});

test.beforeEach(() => {
  upstream.requests.length = 0;
  upstream.mode = "stream";
  telegram.messages.length = 0;
  telegram.failWith = null;
});

test.afterEach(({}, testInfo) => {
  outcomes.push(testInfo.status === "passed"); // a skipped check is not a pass
  for (const proc of running.splice(0)) stop(proc);
});

test.afterAll(() => {
  for (const proc of running.splice(0)) stop(proc);
  upstream?.close();
  telegram?.close();
  const passed = outcomes.length === EXPECTED_TESTS && outcomes.every(Boolean);
  if (!passed) evidence.push(`only ${outcomes.filter(Boolean).length} of ${EXPECTED_TESTS} checks passed`);
  writeEvidence("cost-controls", "COSTCTL", passed, evidence);
});

// ---------------------------------------------------------------- tests

test("the chat request names DeepSeek V4.1 Flash with Parallel turbo search, on the server's key", async ({ page }) => {
  const app = await startApp();
  await openAndSelect(page, app.base);
  await page.getByRole("button", { name: "What drove this move?" }).click();
  await expect(page.getByTestId("ctx-answer")).toContainText("A cited answer [1].", { timeout: 15_000 });

  expect(upstream.requests).toHaveLength(1);
  const { body, authorization } = upstream.requests[0];
  expect(body.model).toBe(MODEL);
  expect(body.stream).toBe(true);
  expect(body.max_tokens).toBeGreaterThanOrEqual(1500);
  expect(body.plugins).toHaveLength(1);
  expect(body.plugins[0]).toMatchObject({ id: "web", engine: "parallel", mode: "turbo", max_results: 6 });
  expect(body.plugins[0].search_prompt ?? "").toContain("AAPL (AAPL Fixture Inc.)");
  expect(authorization).toBe(`Bearer ${FAKE_KEY}`);
  expectNoSecretsPrinted(app, "app");

  evidence.push(
    `drove one chat in Chromium against a fake OpenRouter: the upstream request body named model ${body.model} and plugin ` +
      `${JSON.stringify({ id: body.plugins[0].id, engine: body.plugins[0].engine, mode: body.plugins[0].mode, max_results: body.plugins[0].max_results })}, ` +
      `max_tokens ${body.max_tokens}, stream ${body.stream}; the key reached the upstream only in the Authorization header`,
  );
});

test("the fourth question inside a minute gets HTTP 429 and the panel shows why; no upstream call, no alert", async ({ page }) => {
  const app = await startApp({ CHAT_LIMIT_PER_MINUTE: "3" });
  await openAndSelect(page, app.base);

  for (let n = 1; n <= 3; n++) {
    await ask(page, `Question number ${n}?`);
    await expect(page.getByTestId("ctx-answer")).toHaveCount(n, { timeout: 15_000 });
  }
  expect(upstream.requests).toHaveLength(3);

  await ask(page, "Question number 4?");
  const error = page.getByTestId("ctx-error");
  await expect(error).toBeVisible({ timeout: 10_000 });
  await expect(error).toContainText("Too many questions");
  const shown = ((await error.textContent()) ?? "").trim();
  expect(shown).toMatch(/try again in \d+ seconds?\b/);
  expect(shown.includes("HTTP 429"), "the panel shows the server's sentence, not a status code").toBe(false);
  await expect(page.getByTestId("ctx-retry"), "no Retry button on a rate-limit message").toHaveCount(0);
  expect(upstream.requests, "the fourth question never reached the upstream").toHaveLength(3);

  // The same refusal at the HTTP level: a status, a Retry-After header and the same sentence.
  const direct = await postContext(app.base, validBody());
  expect(direct.res.status).toBe(429);
  const retryAfter = direct.res.headers.get("retry-after") ?? "";
  expect(retryAfter).toMatch(/^\d+$/);
  expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);
  expect(Number(retryAfter)).toBeLessThanOrEqual(60);
  const sentence = (JSON.parse(direct.text) as { error: string }).error;
  expect(sentence).toBe(`Too many questions right now — try again in ${retryAfter} ${retryAfter === "1" ? "second" : "seconds"}.`);

  // Validation comes first: a malformed body is a 400 even while the limit is hit, and is never counted.
  const malformed = await postContext(app.base, validBody({ question: "" }));
  expect(malformed.res.status).toBe(400);

  await sleep(400);
  expect(telegram.messages, "a rate-limit 429 is expected behaviour: no alert").toHaveLength(0);
  expect(upstream.requests).toHaveLength(3);
  expectNoSecretsPrinted(app, "app");

  evidence.push(
    `app started with CHAT_LIMIT_PER_MINUTE=3; three questions in the panel were answered, the fourth showed "${shown}" inline (no Retry button) and the fake upstream saw only 3 requests; ` +
      `a direct POST then answered HTTP 429 with Retry-After ${retryAfter} and the same sentence; a malformed body answered 400; the fake Telegram received 0 messages`,
  );
});

test("the daily cap resets at midnight ET and at most two questions run at once", async () => {
  // Daily cap.
  const daily = await startApp({ CHAT_LIMIT_PER_DAY: "2", CHAT_LIMIT_PER_MINUTE: "100" });
  for (let n = 0; n < 2; n++) {
    const ok = await postContext(daily.base, validBody());
    expect(ok.res.status).toBe(200);
  }
  const blocked = await postContext(daily.base, validBody());
  expect(blocked.res.status).toBe(429);
  const message = (JSON.parse(blocked.text) as { error: string }).error;
  expect(message).toContain("Too many questions");
  expect(message).toContain("the daily limit is reached; it resets at midnight ET");
  const dailyRetry = Number(blocked.res.headers.get("retry-after"));
  expect(Number.isInteger(dailyRetry) && dailyRetry >= 1 && dailyRetry <= 25 * 3600).toBe(true);
  expect(upstream.requests).toHaveLength(2);

  // In-flight cap: two held questions, a third is refused, and finishing one frees a place.
  const busy = await startApp({ CHAT_LIMIT_PER_MINUTE: "100" });
  upstream.requests.length = 0;
  const release = upstream.gate();
  const first = fetch(`${busy.base}/api/context`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validBody()) });
  const second = fetch(`${busy.base}/api/context`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validBody()) });
  await expect.poll(() => upstream.requests.length, { timeout: 10_000 }).toBe(2);
  const third = await postContext(busy.base, validBody());
  expect(third.res.status).toBe(429);
  expect((JSON.parse(third.text) as { error: string }).error).toMatch(/^Too many questions right now — try again in \d+ seconds\.$/);
  expect(upstream.requests, "the third question never reached the upstream").toHaveLength(2);
  release();
  for (const pending of [first, second]) {
    const done = await pending;
    expect(done.status).toBe(200);
    expect(sseEvents(await done.text()).pop()).toBe("done");
  }
  const after = await postContext(busy.base, validBody());
  expect(after.res.status, "a finished question frees its place").toBe(200);

  await sleep(300);
  expect(telegram.messages).toHaveLength(0);
  evidence.push(
    `CHAT_LIMIT_PER_DAY=2: two questions answered, the third got HTTP 429 "…the daily limit is reached; it resets at midnight ET" with Retry-After ${dailyRetry}; ` +
      `with two questions held open upstream a third got HTTP 429 and did not reach the upstream, and once the two finished a new question was answered`,
  );
});

test("the limiter counts only admitted questions, resets its windows, and finds midnight ET across a clock change", async () => {
  const { createLimiter, limiterFromEnv } = await import("../../server/ratelimit");
  const at = (iso: string) => Date.parse(iso);

  // Per-minute window opens at the first counted question and lasts 60 seconds.
  let now = at("2026-10-17T16:00:00Z");
  const minute = createLimiter({ perMinute: 3, perDay: 1000, maxInFlight: 10, now: () => now });
  for (let n = 0; n < 3; n++) {
    const got = minute.admit();
    expect(got.ok).toBe(true);
    if (got.ok) got.release();
  }
  now += 10_000;
  const over = minute.admit();
  expect(over).toMatchObject({ ok: false, reason: "minute", retryAfterSeconds: 50, message: "Too many questions right now — try again in 50 seconds." });
  now += 50_000;
  const fresh = minute.admit();
  expect(fresh.ok, "a new window admits again").toBe(true);
  if (fresh.ok) fresh.release();

  // A refusal is not counted: with one place in flight, refused questions do not eat the minute's quota.
  now = at("2026-10-17T17:00:00Z");
  const single = createLimiter({ perMinute: 3, perDay: 1000, maxInFlight: 1, now: () => now });
  const held = single.admit();
  expect(held.ok).toBe(true);
  for (let n = 0; n < 5; n++) expect(single.admit()).toMatchObject({ ok: false, reason: "busy", retryAfterSeconds: 5 });
  if (held.ok) {
    held.release();
    held.release(); // releasing twice frees one place, not two
  }
  const b = single.admit();
  expect(b.ok).toBe(true);
  expect(single.admit(), "release is idempotent: still only one place").toMatchObject({ ok: false, reason: "busy" });
  if (b.ok) b.release();
  const c = single.admit();
  expect(c.ok, "the third admitted question still fits the quota of 3").toBe(true);
  if (c.ok) c.release();
  expect(single.admit()).toMatchObject({ ok: false, reason: "minute" });

  // Day boundary is midnight US Eastern.
  now = at("2026-10-18T03:59:30Z"); // 23:59:30 EDT on 17 Oct
  const day = createLimiter({ perMinute: 100, perDay: 2, maxInFlight: 10, now: () => now });
  for (let n = 0; n < 2; n++) {
    const got = day.admit();
    expect(got.ok).toBe(true);
    if (got.ok) got.release();
  }
  const capped = day.admit();
  expect(capped).toMatchObject({ ok: false, reason: "day", retryAfterSeconds: 30 });
  if (!capped.ok) expect(capped.message).toBe("Too many questions today — the daily limit is reached; it resets at midnight ET.");
  now = at("2026-10-18T04:00:00Z"); // 00:00:00 EDT on 18 Oct
  const nextDay = day.admit();
  expect(nextDay.ok, "midnight ET starts a new day").toBe(true);
  if (nextDay.ok) nextDay.release();

  // The night the clocks go back is 25 hours long: 00:30 EDT on 1 Nov is 24.5 hours before midnight.
  now = at("2026-11-01T04:30:00Z");
  const fall = createLimiter({ perMinute: 100, perDay: 1, maxInFlight: 10, now: () => now });
  const first = fall.admit();
  expect(first.ok).toBe(true);
  if (first.ok) first.release();
  expect(fall.admit()).toMatchObject({ ok: false, reason: "day", retryAfterSeconds: 88_200 });

  // Defaults and bad values: 6 a minute, 200 a day, 2 at once.
  now = at("2026-10-17T16:00:00Z");
  for (const env of [{}, { CHAT_LIMIT_PER_MINUTE: "abc", CHAT_LIMIT_PER_DAY: "-4" }, { CHAT_LIMIT_PER_MINUTE: "0" }]) {
    const byEnv = limiterFromEnv(env, () => now);
    for (let n = 0; n < 6; n++) {
      const got = byEnv.admit();
      expect(got.ok, `question ${n + 1} with ${JSON.stringify(env)}`).toBe(true);
      if (got.ok) got.release();
    }
    expect(byEnv.admit()).toMatchObject({ ok: false, reason: "minute" });
  }
  const perDay = limiterFromEnv({}, () => now);
  let admitted = 0;
  for (let n = 0; n < 205; n++) {
    now += 10_000; // 6 a minute at most, so the minute limit never gets in the way
    const got = perDay.admit();
    if (got.ok) {
      admitted++;
      got.release();
    }
  }
  expect(admitted, "the default daily cap is 200").toBe(200);

  evidence.push(
    `limiter with an injected clock: 4th question of a minute refused with retry 50 s, admitted again after the window; refused questions do not use up the quota; release is idempotent; ` +
      `day cap resets exactly at midnight ET (30 s to go at 23:59:30 EDT), and 24.5 h (88200 s) to go at 00:30 EDT on the 25-hour night of 1 Nov; bad env values fall back to 6/minute, 200/day`,
  );
});

test("a failed upstream call sends exactly one Telegram alert with no key material, and a repeat inside the window sends none", async ({ page }) => {
  upstream.mode = "http-500";
  const app = await startApp();
  await openAndSelect(page, app.base);
  await ask(page, CANARY_QUESTION);
  await expect(page.getByTestId("ctx-error")).toBeVisible({ timeout: 15_000 });
  const panel = ((await page.getByTestId("ctx-error").textContent()) ?? "").trim();
  expect(panel.length).toBeGreaterThan(10);

  await expect.poll(() => telegram.messages.length, { timeout: 10_000 }).toBe(1);
  const sent = telegram.messages[0];
  expect(sent.path, "sent through the bot API with the bot token in the path").toBe(`/bot${FAKE_BOT_TOKEN}/sendMessage`);
  expect(sent.chatId).toBe(FAKE_CHAT_ID);
  expect(sent.otherFields, "plain text: no parse_mode or other fields").toEqual([]);
  expect(sent.text.startsWith("Stock Analyzer: chat call failed — http 500 · AAPL ")).toBe(true);
  expect(sent.text).toContain("Provider error while answering"); // OpenRouter's own message is passed on
  expect(sent.text.length).toBeLessThanOrEqual(600);
  expect(sent.text.includes(KEY_PREFIX), "alert holds key material").toBe(false);
  expect(sent.text.includes(FAKE_KEY), "alert holds the key").toBe(false);
  expect(sent.text.includes(FAKE_BOT_TOKEN), "alert holds the bot token").toBe(false);
  expect(sent.text.includes(CANARY), "alert holds the user's question").toBe(false);
  expect(sent.text.includes("Bearer"), "alert holds an Authorization header").toBe(false);
  expect(sent.text.includes('"messages"'), "alert holds the request body").toBe(false);
  expect(/ ET\b/.test(sent.text), "the time is US Eastern").toBe(true);
  expect(panel.includes(CANARY) || panel.includes(PROVIDER_ECHO_KEY), "the panel shows no upstream text").toBe(false);

  // The same failure again inside the window: the panel shows it, Telegram hears nothing.
  await page.getByTestId("ctx-retry").click();
  await expect.poll(() => upstream.requests.length, { timeout: 10_000 }).toBe(2);
  await expect(page.getByTestId("ctx-error")).toBeVisible({ timeout: 10_000 });
  await sleep(700);
  expect(telegram.messages, "the repeat failure inside 15 minutes sends no second alert").toHaveLength(1);

  // The throttle is per kind: a different failure kind (an empty answer) is reported.
  upstream.mode = "empty";
  await ask(page, "And another question?");
  await expect.poll(() => upstream.requests.length, { timeout: 10_000 }).toBe(3);
  await expect.poll(() => telegram.messages.length, { timeout: 10_000 }).toBe(2);
  expect(telegram.messages[1].text.startsWith("Stock Analyzer: chat call failed — empty")).toBe(true);
  expect(telegram.messages[1].text.includes(KEY_PREFIX)).toBe(false);
  await sleep(300);
  expect(telegram.messages).toHaveLength(2);
  expectNoSecretsPrinted(app, "app");

  evidence.push(
    `fake upstream answered HTTP 500 with an error text that echoed the question and a key-shaped string: the panel showed its own error and the fake Telegram (the DevOps-Lead bot path /bot<token>/sendMessage, ` +
      `chat id = TELEGRAM_CHAT_ID) received exactly 1 message of ${sent.text.length} chars starting "Stock Analyzer: chat call failed — http 500 · AAPL", containing OpenRouter's own text but ` +
      `no key prefix, key, bot token, Bearer, request body or question text; Retry (a second 500 inside the window) sent no second message; an empty answer (a different kind) sent one more`,
  );
});

test("a 402 names the spending cap; a failing or missing Telegram never breaks the chat response", async () => {
  // 402: the key's spending cap.
  upstream.mode = "http-402";
  const capped = await startApp();
  const refused = await postContext(capped.base, validBody());
  expect(sseEvents(refused.text)).toEqual(["error"]);
  await expect.poll(() => telegram.messages.length, { timeout: 10_000 }).toBe(1);
  expect(telegram.messages[0].text).toContain("http 402");
  expect(telegram.messages[0].text).toContain("key spending cap reached?");
  expect(telegram.messages[0].text.includes(KEY_PREFIX)).toBe(false);

  // Telegram answers an error: the chat response is the normal error event and the server logs one plain line.
  telegram.messages.length = 0;
  telegram.failWith = 500;
  upstream.mode = "http-500";
  const failing = await startApp();
  const answer = await postContext(failing.base, validBody());
  expect(answer.res.status).toBe(200);
  expect(sseEvents(answer.text)).toEqual(["error"]);
  await expect.poll(() => telegram.messages.length, { timeout: 10_000 }).toBe(1);
  await expect.poll(() => failing.output().toLowerCase().split("\n").filter((l) => l.includes("telegram")).length, { timeout: 10_000 }).toBe(1);
  const line = failing.output().split("\n").find((l) => l.toLowerCase().includes("telegram")) ?? "";
  expect(line.includes(FAKE_BOT_TOKEN), "the log line holds the bot token").toBe(false);
  expect(line.includes("/bot"), "the log line holds the request URL").toBe(false);
  expect(/https?:\/\//i.test(line), "the log line holds a URL").toBe(false);
  expectNoSecretsPrinted(failing, "failing-telegram app");
  telegram.failWith = null;

  // Alerts not configured: the app runs, says so in /api/health, and a failure is only an error event.
  telegram.messages.length = 0;
  for (const overrides of [{ TELEGRAM_BOT_TOKEN: undefined }, { TELEGRAM_CHAT_ID: undefined }]) {
    const plain = await startApp(overrides);
    const health = (await (await fetch(`${plain.base}/api/health`)).json()) as { hasKey: boolean; alerts: unknown };
    expect(health.alerts).toBe(false);
    expect(health.hasKey).toBe(true);
    const result = await postContext(plain.base, validBody());
    expect(sseEvents(result.text)).toEqual(["error"]);
  }
  const configured = await startApp();
  const configuredHealth = await (await fetch(`${configured.base}/api/health`)).text();
  expect(JSON.parse(configuredHealth)).toMatchObject({ hasKey: true, alerts: true });
  expect(configuredHealth.includes(FAKE_BOT_TOKEN), "health holds the bot token").toBe(false);
  expect(configuredHealth.includes(FAKE_CHAT_ID), "health holds the chat id").toBe(false);
  await sleep(400);
  expect(telegram.messages, "no Telegram configured: nothing sent").toHaveLength(0);

  evidence.push(
    `HTTP 402 upstream -> alert text "http 402" plus "key spending cap reached?"; Telegram answering HTTP 500 -> the chat still returned its normal error event and the server logged exactly one plain line ` +
      `without the token or a URL; with the bot token or the chat id missing /api/health reports alerts=false, the app runs, and a failed call sent nothing; configured -> alerts=true (boolean only)`,
  );
});

// ---------------------------------------------------------------- the start script

interface StartScript {
  proc: Running;
  port: number;
  shimLog: string;
}

/** A stand-in `bws` first on PATH: answers by entry id, logs the ids it was asked for, never touches the real vault. */
function makeBwsStandIn(): { dir: string; log: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mcd-bws-"));
  const log = path.join(dir, "requested-ids.log");
  writeFileSync(log, "");
  const script = `#!/usr/bin/env bash
id="\${@: -1}"
echo "$id" >> "$SHIM_LOG"
case "$id" in
  ${STANDIN_IDS.openrouter}) printf '{"key":"%s","value":"%s"}' "\${SHIM_OPENROUTER_NAME}" "sk-or-v1-from-standin-bws" ;;
  ${STANDIN_IDS.botToken}) [ "\${SHIM_TELEGRAM}" = "down" ] && exit 1; printf '{"key":"DEVOPS_TELETOKEN","value":"%s"}' "987:standin-token" ;;
  ${STANDIN_IDS.chatId}) [ "\${SHIM_TELEGRAM}" = "down" ] && exit 1; printf '{"key":"Daniel_TELECHAT_ID","value":"%s"}' "777001" ;;
  *) exit 1 ;;
esac
`;
  writeFileSync(path.join(dir, "bws"), script);
  chmodSync(path.join(dir, "bws"), 0o755);
  return { dir, log };
}

async function runStartScript(shim: { dir: string; log: string }, extra: Record<string, string>): Promise<StartScript> {
  const port = await freePort();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${shim.dir}:${process.env.PATH ?? ""}`,
    SHIM_LOG: shim.log,
    SHIM_OPENROUTER_NAME: ENTRY_NAME,
    SHIM_TELEGRAM: "up",
    MCD_BWS_OPENROUTER_ID: STANDIN_IDS.openrouter,
    MCD_BWS_TELEGRAM_TOKEN_ID: STANDIN_IDS.botToken,
    MCD_BWS_TELEGRAM_CHAT_ID: STANDIN_IDS.chatId,
    PORT: String(port),
    ...extra,
  };
  for (const name of ["OPENROUTER_API_KEY", "OPENROUTER_BASE_URL", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "TELEGRAM_API_BASE", "BWS_ACCESS_TOKEN", "CHAT_LIMIT_PER_MINUTE", "CHAT_LIMIT_PER_DAY", "MARKET_PROVIDER"]) {
    if (!(name in extra)) delete env[name];
  }
  const proc = spawnGroup("./scripts/start.sh", [], env);
  proc.base = `http://127.0.0.1:${port}`;
  return { proc, port, shimLog: shim.log };
}

const requestedIds = (log: string) => readFileSync(log, "utf8").split("\n").filter(Boolean);

async function waitForExit(proc: Running, timeoutMs: number): Promise<number | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (proc.exited()) return proc.child.exitCode;
    await sleep(250);
  }
  return null;
}

test("start.sh refuses an entry with the wrong name, and starts with alerts off when the Telegram entries cannot be read", async () => {
  test.setTimeout(180_000);

  // The OpenRouter entry must be named Stock_Analyzer_OPENROUTERKEY.
  const wrong = makeBwsStandIn();
  const refused = await runStartScript(wrong, { SHIM_OPENROUTER_NAME: "openrouter_api" });
  const code = await waitForExit(refused.proc, 60_000);
  expect(code, "start.sh exits non-zero on a wrongly named entry").not.toBeNull();
  expect(code).not.toBe(0);
  expect(refused.proc.output().includes(KEY_PREFIX), "output holds a key").toBe(false);
  let listening = true;
  try {
    await fetch(`${refused.proc.base}/api/health`);
  } catch {
    listening = false;
  }
  expect(listening, "no server was started").toBe(false);
  expect(requestedIds(wrong.log)).toEqual([STANDIN_IDS.openrouter]);

  // Telegram entries unreadable: start anyway, alerts off, one plain line.
  const down = makeBwsStandIn();
  const started = await runStartScript(down, { SHIM_TELEGRAM: "down" });
  const health = await waitForHealth(started.proc, 120_000);
  expect(health.hasKey).toBe(true);
  expect(health.alerts).toBe(false);
  const output = started.proc.output();
  const lines = output.split("\n").filter((l) => /alert/i.test(l));
  expect(lines, "one plain line says alerts are off").toHaveLength(1);
  expect(output.includes(KEY_PREFIX), "output holds a key").toBe(false);
  expect(output.includes("987:standin-token"), "output holds a bot token").toBe(false);

  evidence.push(
    `scripts/start.sh with a stand-in bws that answers by entry id (ids passed in MCD_BWS_*): an entry named "openrouter_api" at the MCD_BWS_OPENROUTER_ID id made the script exit ${code} with no server started; ` +
      `with the Telegram entries unreadable the app started anyway (hasKey=true, alerts=false) and the script printed 1 plain line about alerts`,
  );
});

test("start.sh loads the key and the DevOps-Lead bot token and Daniel's chat id from BWS, and a failure alerts through them", async () => {
  test.setTimeout(180_000);
  const shim = makeBwsStandIn();
  const started = await runStartScript(shim, { OPENROUTER_BASE_URL: upstream.base, TELEGRAM_API_BASE: telegram.base });
  const health = await waitForHealth(started.proc, 120_000);
  expect(health).toMatchObject({ hasKey: true, alerts: true });

  const ids = requestedIds(shim.log);
  expect([...ids].sort()).toEqual([STANDIN_IDS.openrouter, STANDIN_IDS.botToken, STANDIN_IDS.chatId].sort());

  upstream.mode = "http-500";
  const failed = await postContext(started.proc.base, validBody());
  expect(sseEvents(failed.text)).toEqual(["error"]);
  await expect.poll(() => telegram.messages.length, { timeout: 10_000 }).toBe(1);
  const sent = telegram.messages[0];
  expect(sent.path).toBe("/bot987:standin-token/sendMessage");
  expect(sent.chatId).toBe("777001");
  expect(sent.text).toContain("chat call failed");
  expect(upstream.requests[0].authorization).toBe("Bearer sk-or-v1-from-standin-bws");
  expect(sent.text.includes(KEY_PREFIX), "alert holds key material").toBe(false);
  expect(sent.text.includes("987:standin-token"), "alert holds the bot token").toBe(false);
  const output = started.proc.output();
  expect(output.includes(KEY_PREFIX), "output holds a key").toBe(false);
  expect(output.includes("987:standin-token"), "output holds a bot token").toBe(false);

  evidence.push(
    `scripts/start.sh with a stand-in bws: it asked for exactly the three entry ids it was given in MCD_BWS_OPENROUTER_ID, MCD_BWS_TELEGRAM_TOKEN_ID and MCD_BWS_TELEGRAM_CHAT_ID; ` +
      `/api/health -> hasKey=true, alerts=true; a failed upstream call then reached the fake Telegram at the stand-in bot's path with the stand-in chat id, carrying the ` +
      `key read from ${ENTRY_NAME} to the upstream only; the script's output held neither the key nor the token`,
  );
});

test("start.sh against the real BWS: key from Stock_Analyzer_OPENROUTERKEY, alerts on, nothing secret printed", async () => {
  test.setTimeout(180_000);
  const bwsOnPath = spawnSync("bash", ["-c", "command -v bws"], { encoding: "utf8" }).status === 0;
  const hasToken = Boolean(process.env.BWS_ACCESS_TOKEN);
  const hasIds = Object.values(REAL_IDS).every(Boolean);
  if (!bwsOnPath || !hasToken || !hasIds) {
    const why = !bwsOnPath ? "the bws CLI is not on PATH" : !hasToken ? "BWS_ACCESS_TOKEN is not set" : "the MCD_BWS_* entry ids are not set";
    evidence.push(`SKIPPED: ${why} in this environment`);
    test.skip(true, "BWS is unavailable in this environment");
  }

  /** In-process only: the value is never printed, and a parse failure raises a generic error. */
  const entry = (id: string): { key: string; value: string } => {
    const got = spawnSync("bws", ["--color", "no", "secret", "get", id], { encoding: "utf8" });
    if (got.status !== 0) throw new Error(`bws could not read entry ${id}`);
    try {
      const parsed = JSON.parse(got.stdout) as { key?: unknown; value?: unknown };
      return { key: String(parsed.key), value: String(parsed.value ?? "") };
    } catch {
      throw new Error(`bws returned an unreadable record for entry ${id}`);
    }
  };
  const openrouter = entry(REAL_IDS.openrouter);
  const botToken = entry(REAL_IDS.botToken);
  expect(openrouter.key, "the BWS entry the script reads is named Stock_Analyzer_OPENROUTERKEY").toBe(ENTRY_NAME);
  expect(openrouter.value.startsWith(KEY_PREFIX)).toBe(true);
  expect(botToken.value.length).toBeGreaterThan(10);

  const port = await freePort();
  const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(port) };
  for (const name of ["OPENROUTER_API_KEY", "OPENROUTER_BASE_URL", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "TELEGRAM_API_BASE", "MARKET_PROVIDER"]) delete env[name];
  expect("OPENROUTER_API_KEY" in env, "the key is UNSET before the start script runs").toBe(false);
  const proc = spawnGroup("./scripts/start.sh", [], env);
  proc.base = `http://127.0.0.1:${port}`;
  const health = await waitForHealth(proc, 120_000);
  expect(health.hasKey, "/api/health reports a key loaded from BWS").toBe(true);
  expect(health.alerts, "/api/health reports the Telegram alert wired").toBe(true);

  const healthText = await (await fetch(`${proc.base}/api/health`)).text();
  const output = proc.output();
  expect(output.includes("http://127.0.0.1"), "the output we scanned is the script's real output").toBe(true);
  expect(output.includes(KEY_PREFIX), "output holds a key").toBe(false);
  expect(output.includes(openrouter.value), "output holds the OpenRouter key").toBe(false);
  expect(output.includes(botToken.value), "output holds the bot token").toBe(false);
  expect(healthText.includes(KEY_PREFIX), "health holds a key").toBe(false);
  expect(healthText.includes(openrouter.value), "health holds the OpenRouter key").toBe(false);
  expect(healthText.includes(botToken.value), "health holds the bot token").toBe(false);

  const lines = output.split("\n").filter((l) => l.trim()).length;
  evidence.push(
    `\`./scripts/start.sh\` with OPENROUTER_API_KEY and the TELEGRAM_* variables unset and the real BWS: the MCD_BWS_OPENROUTER_ID entry is named ${ENTRY_NAME} and the script (which refuses any other name) ` +
      `started the app -> /api/health hasKey=true, alerts=true (bot token and chat id read from the MCD_BWS_TELEGRAM_TOKEN_ID and MCD_BWS_TELEGRAM_CHAT_ID entries); ` +
      `the script's captured output (${lines} lines, including its start URL) and the health body hold neither the OpenRouter key nor the bot token (checked in-process against the real values, never printed); no chat call was made`,
  );
});
