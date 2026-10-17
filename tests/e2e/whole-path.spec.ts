import { test, expect, type Request } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeEvidence } from "../../scripts/evidence.mjs";

// WHOLE-PATH: the one documented start command, real Yahoo data, the real web-grounded model.
// Opt-in because it spends OpenRouter credit (well under one cent on DeepSeek V4.1 Flash): WHOLE_PATH=1 corepack pnpm exec playwright test tests/e2e/whole-path.spec.ts
// Fails if any piece between the watchlist and the cited answer is disconnected.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR ?? path.join(ROOT, "evidence");
const TICKER = process.env.WHOLE_PATH_TICKER ?? "AMD";
const KEY_PREFIX = "sk-or-";
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

test.skip(process.env.WHOLE_PATH !== "1", "opt-in: set WHOLE_PATH=1 (spends OpenRouter credit)");

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

function startDocumentedCommand(port: number) {
  const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(port) };
  delete env.OPENROUTER_API_KEY; // the key must come from BWS through the start script
  delete env.OPENROUTER_BASE_URL; // the real OpenRouter
  delete env.MARKET_PROVIDER; // the default provider (Yahoo)
  let log = "";
  const child = spawn("./scripts/start.sh", [], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"], detached: true });
  child.stdout?.on("data", (d) => (log += String(d)));
  child.stderr?.on("data", (d) => (log += String(d)));
  let exited = false;
  child.once("exit", () => (exited = true));
  return { child, output: () => log, exited: () => exited };
}

function stop(child: ChildProcess) {
  if (child.pid && child.exitCode === null) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

async function waitForHealth(base: string, exited: () => boolean): Promise<{ provider: string; hasKey: boolean }> {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    if (exited()) throw new Error("start.sh exited before the server was ready");
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return (await res.json()) as { provider: string; hasKey: boolean };
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server not ready within 150s");
}

/** Every calendar date (US Eastern) from `from` to `to`, as {month index, day, iso}. */
function datesInWindow(fromSec: number, toSec: number) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  const out = new Map<string, { m: number; d: number }>();
  for (let t = fromSec; t <= toSec + 86_400; t += 3_600) {
    if (t > toSec && out.size) {
      const iso = fmt.format(new Date(toSec * 1000));
      if (!out.has(iso)) out.set(iso, { m: Number(iso.slice(5, 7)) - 1, d: Number(iso.slice(8, 10)) });
      break;
    }
    const iso = fmt.format(new Date(t * 1000));
    out.set(iso, { m: Number(iso.slice(5, 7)) - 1, d: Number(iso.slice(8, 10)) });
  }
  return out;
}

/** Dates the answer names that fall inside the window: "October 9", "Oct. 9", "Oct 9", "9 October", "10/9", "2026-10-09". */
function inWindowDatesNamed(answer: string, window: Map<string, { m: number; d: number }>): string[] {
  const text = answer.toLowerCase();
  const found = new Set<string>();
  for (const [iso, { m, d }] of window) {
    const full = MONTHS[m];
    const month = [full, `${full.slice(0, 3)}\\.?`, ...(m === 8 ? ["sept\\.?"] : [])].join("|");
    const patterns = [
      new RegExp(`\\b(${month})\\s+${d}(st|nd|rd|th)?\\b`),
      new RegExp(`\\b${d}(st|nd|rd|th)?\\s+(of\\s+)?(${month})`),
      new RegExp(`\\b0?${m + 1}/0?${d}\\b`),
      new RegExp(`\\b${iso}\\b`),
    ];
    if (patterns.some((re) => re.test(text))) found.add(iso);
  }
  return [...found];
}

test("WHOLE-PATH: start command -> add ticker -> live chart -> drag -> streamed, cited, date-scoped answer", async ({ page }) => {
  test.setTimeout(300_000);
  const lines: string[] = [];
  let passed = false;
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const run = startDocumentedCommand(port);
  try {
    // 1. The one documented command boots the app with the key from BWS and Yahoo as the provider.
    const health = await waitForHealth(base, run.exited);
    expect(health.hasKey, "the start script loaded the key from BWS").toBe(true);
    expect(health.provider).toBe("yahoo");
    lines.push(`\`./scripts/start.sh\` (OPENROUTER_API_KEY unset, PORT=<free>) -> /api/health provider=${health.provider}, hasKey=${health.hasKey}`);

    const browserRequests: Request[] = [];
    page.on("request", (r) => browserRequests.push(r));

    // 2. Add a ticker through the watchlist UI.
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByTestId("watchlist-input").fill(TICKER);
    await page.getByTestId("watchlist-input").press("Enter");
    const row = page.getByTestId(`watchlist-row-${TICKER}`);
    await expect(row).toBeVisible({ timeout: 20_000 });
    lines.push(`added ${TICKER} through the watchlist input; row watchlist-row-${TICKER} appeared`);

    // 3. Select it; the chart renders bars fetched live from Yahoo through the app's own server.
    const barsResponse = page.waitForResponse((r) => r.url().includes(`/api/bars/${TICKER}?range=1mo`) && r.status() === 200, { timeout: 30_000 });
    await row.click();
    const bars = (await (await barsResponse).json()) as { bars: unknown[]; lastBarTime: number; name: string; range: string };
    expect(bars.bars.length, "live Yahoo bars arrived through /api/bars").toBeGreaterThan(20);
    await expect(page.getByTestId("chart")).toBeVisible();
    await expect(page.getByTestId("chart-last-bar")).not.toBeEmpty();
    lines.push(`chart for ${TICKER} (${bars.name}) rendered from /api/bars/${TICKER}?range=${bars.range}: ${bars.bars.length} bars, last bar ${new Date(bars.lastBarTime * 1000).toISOString()}`);
    await page.waitForTimeout(500);

    // 4. Drag across the chart; the chat panel opens scoped to that window.
    const box = await page.getByTestId("chart").boundingBox();
    if (!box) throw new Error("chart has no bounding box");
    const y = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width * 0.35, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, y, { steps: 10 });
    await page.mouse.up();
    await expect(page.getByTestId("ctx-window")).toBeVisible({ timeout: 10_000 });
    const windowLabel = ((await page.getByTestId("ctx-window").textContent()) ?? "").trim();
    lines.push(`dragged 35% -> 65% across the chart; panel opened: "${windowLabel}"`);

    // 5. Ask a question; the real web-grounded model streams back an answer.
    const contextRequest = page.waitForRequest((r) => r.url().endsWith("/api/context") && r.method() === "POST");
    const contextResponse = page.waitForResponse((r) => r.url().endsWith("/api/context"), { timeout: 30_000 });
    await page.getByTestId("ctx-suggestion").first().click();
    const sent = JSON.parse((await contextRequest).postData() ?? "{}") as { stats: { start: number; end: number }; question: string };
    const response = await contextResponse;
    expect(response.headers()["content-type"] ?? "", "the answer is streamed as server-sent events").toContain("text/event-stream");

    const answer = page.getByTestId("ctx-answer").first();
    await expect(answer).not.toBeEmpty({ timeout: 120_000 });
    const firstSeen = ((await answer.textContent()) ?? "").length;

    // 6. The answer carries at least one source link and names dates inside the selected range.
    // Sources arrive as the stream's last event, after the full text, so their arrival marks the end of the answer.
    const sources = page.getByTestId("ctx-source");
    await expect(sources.first()).toBeVisible({ timeout: 150_000 });
    await expect(page.getByTestId("ctx-error")).toHaveCount(0);
    const answerText = ((await answer.textContent()) ?? "").trim();
    lines.push(`asked "${sent.question}"; response content-type text/event-stream; answer text first seen at ${firstSeen} chars, final ${answerText.length} chars`);
    const sourceCount = await sources.count();
    expect(sourceCount, "at least one source link").toBeGreaterThan(0);
    const hrefs = await sources.evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    lines.push(`${sourceCount} source link(s): ${hrefs.slice(0, 4).join(" · ")}`);

    const window = datesInWindow(sent.stats.start, sent.stats.end);
    const named = inWindowDatesNamed(answerText, window);
    lines.push(`window dates (ET): ${[...window.keys()].join(", ")}; dates the answer names inside it: ${named.join(", ") || "none"}`);
    expect(named.length, "the answer names at least one date inside the selected range").toBeGreaterThan(0);

    // Key custody along the whole path: no browser request carried key material.
    const leaked = browserRequests.filter((r) => {
      const h = r.headers();
      return "authorization" in h || r.url().includes(KEY_PREFIX) || (r.postData() ?? "").includes(KEY_PREFIX);
    }).length;
    expect(leaked, "browser requests carrying key material").toBe(0);
    expect(run.output().includes(KEY_PREFIX), "start script output holds key material").toBe(false);
    lines.push(`${browserRequests.length} browser requests checked: none carried an Authorization header or key-prefix text; start script output clean`);

    lines.push(`answer excerpt: "${answerText.slice(0, 400).replace(/\s+/g, " ")}${answerText.length > 400 ? "…" : ""}"`);
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "whole-path.png") });
    lines.push(`screenshot: ${path.join(SCREENSHOT_DIR, "whole-path.png")}`);
    passed = true;
  } finally {
    stop(run.child);
    writeEvidence("whole-path", "WHOLE_PATH", passed, lines);
  }
});
