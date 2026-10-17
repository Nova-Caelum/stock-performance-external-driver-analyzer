import { test, expect, type Page } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeEvidence } from "../../scripts/evidence.mjs";

// Daniel's round-two review: name search (with typo tolerance), a per-stock summary, a drag hint above
// the chart card, the Caelos wordmark alone in a bigger header, and the new title.
// Runs against the built app on a free port, with real Yahoo and the real SEC ticker list.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TSX = path.join(ROOT, "node_modules/.bin/tsx");
const STORAGE_KEY = "mcd.watchlist.v1";
const TITLE = "Stock Performance \u2013 Driver Analysis"; // en dash, Daniel's words
const SUGGEST_TIMEOUT = 15_000;
const EXPECTED_TESTS = 5;

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

function run(args: string[]) {
  const result = spawnSync("corepack", ["pnpm", ...args], { cwd: ROOT, encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}`.trim().slice(-2000) };
}

/** Types a query into the add field and waits for the named suggestion; returns the suggestion list text. */
async function expectSuggestion(page: Page, query: string, symbol: string): Promise<string> {
  const input = page.getByTestId("watchlist-input");
  await input.fill(query);
  const suggestion = page.getByTestId(`watchlist-suggestion-${symbol}`);
  await expect(suggestion).toBeVisible({ timeout: SUGGEST_TIMEOUT });
  await expect(input).toHaveAttribute("role", "combobox");
  await expect(input).toHaveAttribute("aria-expanded", "true");
  const list = page.getByTestId("watchlist-suggestions");
  await expect(list).toHaveAttribute("role", "listbox");
  return ((await list.innerText()) ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
}

async function closeSuggestions(page: Page) {
  const input = page.getByTestId("watchlist-input");
  await input.press("Escape");
  await expect(page.getByTestId("watchlist-suggestions")).toHaveCount(0);
  await input.fill("");
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const build = run(["build"]);
  if (build.status !== 0) throw new Error(`corepack pnpm build failed:\n${build.output}`);
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
  writeEvidence("round2", "ROUND2", passed, evidence);
});

test("the search and summary routes answer from Yahoo with the SEC list as the typo fallback", async () => {
  for (const bad of ["", "%20%20", "x".repeat(61)]) {
    const res = await fetch(`${server!.base}/api/search?q=${bad}`);
    expect(res.status, `q="${decodeURIComponent(bad)}"`).toBe(400);
  }
  evidence.push("GET /api/search with an empty, blank or 61-character q -> 400");

  const name = (await (await fetch(`${server!.base}/api/search?q=apple`)).json()) as {
    results: { symbol: string; name: string; exchange: string; type: string }[];
  };
  expect(name.results.length).toBeGreaterThan(0);
  expect(name.results.length).toBeLessThanOrEqual(8);
  expect(name.results.map((r) => r.symbol)).toContain("AAPL");
  for (const r of name.results) expect(["EQUITY", "ETF", "INDEX"]).toContain(r.type);
  evidence.push(`GET /api/search?q=apple -> ${name.results.length} results, all EQUITY/ETF/INDEX: ${name.results.map((r) => r.symbol).join(", ")}`);

  for (const [typo, symbol] of [
    ["microsft", "MSFT"],
    ["mcrosoft", "MSFT"],
    ["nvdia", "NVDA"],
  ] as const) {
    const body = (await (await fetch(`${server!.base}/api/search?q=${typo}`)).json()) as { results: { symbol: string; name: string }[] };
    expect(body.results.map((r) => r.symbol), typo).toContain(symbol);
    const hit = body.results.find((r) => r.symbol === symbol);
    evidence.push(`GET /api/search?q=${typo} (Yahoo has no answer for the typo) -> ${symbol} "${hit?.name}" from the SEC fallback`);
  }

  const res = await fetch(`${server!.base}/api/summary/AAPL`);
  expect(res.status).toBe(200);
  const summary = (await res.json()) as Record<string, unknown>;
  expect(typeof summary.description).toBe("string");
  for (const key of ["marketCap", "trailingPE", "dividendYield", "fiftyTwoWeekLow", "fiftyTwoWeekHigh"]) {
    expect(typeof summary[key], key).toBe("number");
  }
  expect(summary.sector).toBeTruthy();
  evidence.push(
    `GET /api/summary/AAPL -> 200 (cookie + crumb handshake): sector=${summary.sector}, industry=${summary.industry}, ` +
      `marketCap=${summary.marketCap}, trailingPE=${summary.trailingPE}, dividendYield=${summary.dividendYield}, ` +
      `52w=${summary.fiftyTwoWeekLow}-${summary.fiftyTwoWeekHigh}`,
  );

  const unknown = await fetch(`${server!.base}/api/summary/ZZZZQQ`);
  expect(unknown.status).toBe(404);
  evidence.push("GET /api/summary/ZZZZQQ -> 404");
});

test("typing a company name or a misspelling offers the stock, and picking it adds it", async ({ page }) => {
  // Start from an empty list so AAPL is genuinely added, not a default.
  await page.addInitScript((key) => window.localStorage.setItem(key, "[]"), STORAGE_KEY);
  await page.goto(server!.base);
  await expect(page.getByTestId("watchlist-row-AAPL")).toHaveCount(0);
  await expect(page.getByTestId("watchlist-input")).toHaveAttribute("placeholder", "Ticker or company name");

  const apple = await expectSuggestion(page, "apple", "AAPL");
  evidence.push(`typed "apple" -> watchlist-suggestion-AAPL visible; listbox reads "${apple}"`);
  await page.getByTestId("watchlist-suggestion-AAPL").click();
  await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("watchlist-suggestions")).toHaveCount(0);
  await expect(page.getByTestId("watchlist-input")).toHaveValue("");
  evidence.push("clicked watchlist-suggestion-AAPL -> watchlist-row-AAPL present, suggestions closed, field cleared");

  const berkshire = await expectSuggestion(page, "berkshire", "BRK-B");
  evidence.push(`typed "berkshire" -> watchlist-suggestion-BRK-B visible; listbox reads "${berkshire}"`);
  await closeSuggestions(page);

  const microsft = await expectSuggestion(page, "microsft", "MSFT");
  evidence.push(`typed the typo "microsft" -> watchlist-suggestion-MSFT visible; listbox reads "${microsft}"`);
  await closeSuggestions(page);

  const nvdia = await expectSuggestion(page, "nvdia", "NVDA");
  evidence.push(`typed the typo "nvdia" -> watchlist-suggestion-NVDA visible; listbox reads "${nvdia}"`);

  // Keyboard: arrow onto the NVDA option and press Enter.
  const input = page.getByTestId("watchlist-input");
  const options = page.getByTestId("watchlist-suggestions").getByRole("option");
  const symbols = await options.evaluateAll((els) => els.map((el) => el.getAttribute("data-symbol")));
  const steps = symbols.indexOf("NVDA") + 1;
  for (let i = 0; i < steps; i++) await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /.+/);
  await expect(page.getByTestId("watchlist-suggestion-NVDA")).toHaveAttribute("aria-selected", "true");
  await input.press("Enter");
  await expect(page.getByTestId("watchlist-row-NVDA")).toBeVisible({ timeout: 15_000 });
  evidence.push(`ArrowDown x${steps} -> NVDA option aria-selected, Enter -> watchlist-row-NVDA added`);

  // A plain ticker still adds directly with Enter; nonsense still refuses.
  await input.fill("ZZZZQQ");
  await input.press("Enter");
  await expect(page.getByTestId("watchlist-error")).toContainText("No data for ZZZZQQ", { timeout: 15_000 });
  evidence.push('typed ZZZZQQ + Enter -> watchlist-error "No data for ZZZZQQ" (no suggestions, no ticker)');
});

test("a selected stock shows a summary of what the company does and its key figures", async ({ page }) => {
  await page.addInitScript((key) => window.localStorage.setItem(key, JSON.stringify(["MSFT", "AAPL"])), STORAGE_KEY);
  await page.goto(server!.base);
  await page.getByTestId("watchlist-row-AAPL").getByRole("button", { name: /^AAPL/ }).click();
  await expect(page.getByRole("heading", { level: 2 })).toContainText("Apple", { timeout: 15_000 });

  const summary = page.getByTestId("summary");
  await expect(summary).toBeVisible({ timeout: 20_000 });
  const fields: Record<string, string> = {};
  for (const id of ["summary-description", "summary-sector", "summary-marketcap", "summary-pe", "summary-dividend", "summary-52w"]) {
    const el = page.getByTestId(id);
    await expect(el, id).toBeVisible({ timeout: 20_000 });
    await expect(el, id).toHaveText(/\S/);
    fields[id] = ((await el.innerText()) ?? "").replace(/\s+/g, " ").trim();
  }
  expect(fields["summary-description"].length).toBeGreaterThan(40);
  expect(fields["summary-marketcap"]).toMatch(/^\$\d+(\.\d+)?[TBM]$/);
  expect(fields["summary-pe"]).toMatch(/\d/);
  expect(fields["summary-dividend"]).toMatch(/%$/);
  expect(fields["summary-52w"]).toMatch(/\d.*\d/);
  evidence.push(
    `selected AAPL -> summary visible: description "${fields["summary-description"].slice(0, 90)}…", ` +
      `sector "${fields["summary-sector"]}", market cap "${fields["summary-marketcap"]}", P/E "${fields["summary-pe"]}", ` +
      `dividend "${fields["summary-dividend"]}", 52-week "${fields["summary-52w"]}"`,
  );
});

test("the drag instruction sits above the chart card", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((key) => window.localStorage.setItem(key, JSON.stringify(["AAPL"])), STORAGE_KEY);
  await page.goto(server!.base);
  const hint = page.getByTestId("drag-hint");
  await expect(hint).toBeVisible();
  const text = ((await hint.innerText()) ?? "").trim();
  expect(text.length).toBeGreaterThan(10);
  const hintBox = await hint.boundingBox();
  const cardBox = await page.getByTestId("chart-card").boundingBox();
  if (!hintBox || !cardBox) throw new Error("hint or chart card has no box");
  expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(cardBox.y);
  // Said once: the old in-card hint is gone.
  await expect(page.getByTestId("chart-card").getByText(/drag across/i)).toHaveCount(0);
  evidence.push(
    `drag-hint "${text}" visible; its bottom edge ${Math.round(hintBox.y + hintBox.height)}px is above the chart card's top edge ${Math.round(cardBox.y)}px; no drag text inside the card`,
  );
});

test("the header shows the Caelos wordmark alone, at least 32px tall, and the new title", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(server!.base);
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();

  const svgs = banner.locator("svg");
  await expect(svgs).toHaveCount(1);
  const wordmark = svgs.first();
  await expect(wordmark).toBeVisible();
  await expect(wordmark).toHaveAttribute("viewBox", "0 0 2750 800"); // CaelosWordmark, not the icon or the lockup
  await expect(banner.locator('svg[viewBox="0 0 1024 1024"], svg[viewBox="0 0 1100 330"]')).toHaveCount(0);
  const box = await wordmark.boundingBox();
  if (!box) throw new Error("wordmark has no box");
  expect(box.height).toBeGreaterThanOrEqual(32);

  const title = page.getByTestId("app-title");
  await expect(title).toHaveText(TITLE);
  await expect(page.getByText("Market Context")).toHaveCount(0);
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("Market Context");
  evidence.push(
    `header: one svg (viewBox 0 0 2750 800, the CaelosWordmark) ${Math.round(box.width)}x${Math.round(box.height)}px, ` +
      `no icon or lockup svg; app-title = "${await title.innerText()}"; no "Market Context" text on the page`,
  );
});
