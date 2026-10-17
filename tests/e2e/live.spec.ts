import { test, expect, type Request } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeEvidence } from "../../scripts/evidence.mjs";

// Live checks against the deployed Worker. Opt-in: they call the real site, Yahoo and the model.
//   LIVE=1 corepack pnpm exec playwright test tests/e2e/live.spec.ts
// Each test writes one evidence file (EVIDENCE_DIR). Runs in file order; the burst test runs last
// because it spends this client's per-minute question budget.

test.skip(process.env.LIVE !== "1", "opt-in: set LIVE=1 (calls the live site and spends a few model calls)");
test.describe.configure({ mode: "serial" });

const PRIMARY = "https://caelos.app/marketforces-dashboard/";
const SECONDARY = "https://novacaelum.com/marketforces-dashboard/";
const REPO = "Nova-Caelum/stock-performance-external-driver-analyzer";
const KEY_PREFIX = "sk-or-";
const TICKER = process.env.LIVE_TICKER ?? "AMD";

test("WHOLE-PATH live: caelos.app page -> add ticker -> drag -> streamed, cited answer; novacaelum.com serves the same app", async ({ page }) => {
  test.setTimeout(240_000);
  const lines: string[] = [];
  let passed = false;
  try {
    const run = JSON.parse(execFileSync("gh", ["run", "list", "--repo", REPO, "--workflow", "Deploy", "--limit", "1", "--json", "conclusion,headSha,event,createdAt"], { encoding: "utf8" }))[0];
    expect(run.conclusion).toBe("success");
    lines.push(`latest GitHub Actions Deploy run: ${run.event} ${run.headSha.slice(0, 7)} at ${run.createdAt} -> ${run.conclusion}`);

    const requests: Request[] = [];
    page.on("request", (r) => requests.push(r));
    await page.goto(PRIMARY);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByTestId("app-title")).toHaveText("Stock Performance – Driver Analysis");
    const bars = page.waitForResponse((r) => r.url().includes(`/marketforces-dashboard/api/bars/${TICKER}?range=1mo`) && r.status() === 200, { timeout: 30_000 });
    await page.getByTestId("watchlist-input").fill(TICKER);
    await page.getByTestId("watchlist-input").press("Enter");
    const row = page.getByTestId(`watchlist-row-${TICKER}`);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click();
    const barsJson = (await (await bars).json()) as { bars: unknown[] };
    expect(barsJson.bars.length).toBeGreaterThan(20);
    await expect(page.getByTestId("chart")).toBeVisible();
    lines.push(`${PRIMARY}: added ${TICKER} through the watchlist; chart drew ${barsJson.bars.length} live bars from /marketforces-dashboard/api/bars`);
    await page.waitForTimeout(500);

    const box = await page.getByTestId("chart").boundingBox();
    if (!box) throw new Error("chart has no box");
    const y = box.y + box.height * 0.5;
    await page.mouse.move(box.x + box.width * 0.35, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, y, { steps: 10 });
    await page.mouse.up();
    await expect(page.getByTestId("ctx-window")).toBeVisible({ timeout: 10_000 });
    const windowLabel = ((await page.getByTestId("ctx-window").textContent()) ?? "").trim();

    const response = page.waitForResponse((r) => r.url().endsWith("/marketforces-dashboard/api/context"), { timeout: 30_000 });
    await page.getByTestId("ctx-suggestion").first().click();
    expect((await response).headers()["content-type"] ?? "").toContain("text/event-stream");
    const answer = page.getByTestId("ctx-answer").first();
    await expect(answer).not.toBeEmpty({ timeout: 120_000 });
    await expect(page.getByTestId("ctx-source").first()).toBeVisible({ timeout: 150_000 });
    const sourceCount = await page.getByTestId("ctx-source").count();
    const text = ((await answer.textContent()) ?? "").replace(/\s+/g, " ").trim();
    lines.push(`dragged across the chart ("${windowLabel}"), asked the first suggestion; streamed answer ${text.length} chars with ${sourceCount} source link(s)`);
    lines.push(`answer excerpt: "${text.slice(0, 300)}${text.length > 300 ? "…" : ""}"`);

    const leaked = requests.filter((r) => "authorization" in r.headers() || r.url().includes(KEY_PREFIX) || (r.postData() ?? "").includes(KEY_PREFIX)).length;
    expect(leaked).toBe(0);
    lines.push(`${requests.length} browser requests: none carried an Authorization header or key text`);

    const second = await page.request.get(SECONDARY);
    expect(second.status()).toBe(200);
    expect(await second.text()).toContain("Stock Performance – Driver Analysis");
    const secondBars = await page.request.get(`${SECONDARY}api/bars/${TICKER}?range=5d`);
    expect(secondBars.status()).toBe(200);
    lines.push(`${SECONDARY} -> 200 with the app's title; ${SECONDARY}api/bars/${TICKER} -> 200`);
    await page.screenshot({ path: `${process.env.EVIDENCE_DIR ?? "evidence"}/live-whole-path.png` });
    passed = true;
  } finally {
    writeEvidence("live-whole-path", "LIVE_WHOLE_PATH", passed, lines);
  }
});

test("neighbours: both existing sites still answer with their own pages", async ({ request }) => {
  const lines: string[] = [];
  let passed = false;
  try {
    for (const [url, own] of [["https://caelos.app/", "Caelos"], ["https://novacaelum.com/", "Nova Caelum"]] as const) {
      const r = await request.get(url);
      const body = await r.text();
      expect(r.status()).toBe(200);
      expect(body).toContain(own);
      expect(body).not.toContain("Stock Performance – Driver Analysis");
      const title = /<title>([^<]*)<\/title>/i.exec(body)?.[1] ?? "";
      lines.push(`${url} -> ${r.status()}, title "${title}" (not the dashboard)`);
    }
    const app = await request.get("https://caelos.app/marketforces-dashboard/api/health");
    expect(app.status()).toBe(200);
    lines.push(`only /marketforces-dashboard reaches the new Worker: /marketforces-dashboard/api/health -> ${app.status()} ${await app.text()}`);
    passed = true;
  } finally {
    writeEvidence("neighbors", "NEIGHBORS", passed, lines);
  }
});

test("public repo: public, titled, and free of key material and local paths", async () => {
  const lines: string[] = [];
  let passed = false;
  try {
    const repo = JSON.parse(execFileSync("gh", ["repo", "view", REPO, "--json", "visibility,url"], { encoding: "utf8" }));
    expect(repo.visibility).toBe("PUBLIC");
    const readme = execFileSync("gh", ["api", `repos/${REPO}/readme`, "--jq", ".content"], { encoding: "utf8" });
    expect(Buffer.from(readme, "base64").toString("utf8")).toContain("Stock Performance - External Driver Analyzer");
    const tmp = execFileSync("mktemp", ["-d"], { encoding: "utf8" }).trim();
    execFileSync("git", ["clone", "-q", `https://github.com/${REPO}.git`, `${tmp}/r`]);
    const history = execFileSync("git", ["-C", `${tmp}/r`, "log", "-p", "--all"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    const pattern = /sk-or-v1-[A-Za-z0-9]{20,}|\b\d{8,10}:[A-Za-z0-9_-]{30,}\b|\/Users\/|NovaCaelum_Obs|AgentSecretBase/;
    expect(pattern.test(history)).toBe(false);
    const commits = execFileSync("git", ["-C", `${tmp}/r`, "rev-list", "--all", "--count"], { encoding: "utf8" }).trim();
    lines.push(`${repo.url}: visibility ${repo.visibility}; README carries "Stock Performance - External Driver Analyzer"`);
    lines.push(`git log -p over all ${commits} commits: no OpenRouter key pattern, no Telegram token pattern, no local vault path`);
    passed = true;
  } finally {
    writeEvidence("public-repo", "PUBLIC_REPO", passed, lines);
  }
});

test("live controls: no key in the bundle, alert configured, burst beyond the minute limit -> 429", async ({ request }) => {
  test.setTimeout(180_000);
  const lines: string[] = [];
  let passed = false;
  try {
    const html = await (await request.get(PRIMARY)).text();
    const assets = [...html.matchAll(/(?:src|href)="(\/marketforces-dashboard\/assets\/[^"]+)"/g)].map((m) => m[1]);
    expect(assets.length).toBeGreaterThan(0);
    for (const a of assets) expect((await (await request.get(`https://caelos.app${a}`)).text()).includes(KEY_PREFIX)).toBe(false);
    lines.push(`index.html + ${assets.length} live asset file(s): no key-prefix text`);

    const health = (await (await request.get(`${PRIMARY}api/health`)).json()) as { hasKey: boolean; alerts: boolean };
    expect(health.hasKey).toBe(true);
    expect(health.alerts).toBe(true);
    lines.push(`/api/health -> hasKey=${health.hasKey}, alerts=${health.alerts}`);

    const now = Math.floor(Date.now() / 1000);
    const body = {
      symbol: "AAPL", name: "Apple Inc.", range: "1mo", fromTime: now - 9 * 86400, toTime: now - 2 * 86400,
      stats: { start: now - 9 * 86400, end: now - 2 * 86400, open: 330, close: 340, changePct: 3.03, high: 345, low: 328, volume: 1000000, barCount: 50 },
      question: "One-line answer: what drove this?", history: [],
    };
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const r = await request.post(`${PRIMARY}api/context`, { data: body, timeout: 90_000 });
      statuses.push(r.status());
      if (r.status() === 429) {
        lines.push(`429 body: ${(await r.text()).slice(0, 120)}; Retry-After ${r.headers()["retry-after"]}`);
        break;
      }
      await r.body();
    }
    lines.push(`burst of POST /api/context from one client: ${statuses.join(", ")}`);
    expect(statuses).toContain(429);
    passed = true;
  } finally {
    writeEvidence("live-controls", "LIVE_CONTROLS", passed, lines);
  }
});
