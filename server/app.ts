// The app's routes, shared by both entries: server/index.ts (Node, local) and server/worker.ts (Cloudflare Worker).
//
// Everything lives under BASE_PATH, the path the app is mounted at on caelos.app and novacaelum.com. `createApp`
// answers the API (BASE_PATH/api/*) and the bare BASE_PATH; each entry adds how it serves the built client, which
// Vite builds into dist/client/marketforces-dashboard/ so its URLs and its files line up on both.
//
// Nothing here reads the environment: each entry builds the dependencies from its own configuration.
import { Hono } from "hono";
import type { Alerts } from "./alerts.js";
import { createContextHandler, type ChatConfig } from "./context.js";
import { createSearch, type Search } from "./search.js";
import type { ChatLimiter } from "./ratelimit.js";
import {
  NotConfiguredError,
  NotFoundError,
  RANGES,
  UpstreamError,
  type BarsResult,
  type MarketDataProvider,
  type Range,
  type StockSummary,
} from "./providers/types.js";

export const BASE_PATH = "/marketforces-dashboard";
const API = `${BASE_PATH}/api`;

const CACHE_TTL_MS = 60_000;
const SUMMARY_TTL_MS = 6 * 60 * 60 * 1000;
const SYMBOL_PATTERN = /^[A-Z0-9.\-^=]{1,12}$/;

export interface AppDeps {
  provider: MarketDataProvider;
  chat: ChatConfig;
  limiter: ChatLimiter;
  alerts: Alerts;
  /** Stock search; one that asks the SEC directly for its typo fallback when omitted. */
  search?: Search;
}

function parseSymbol(raw: string): string | null {
  const symbol = raw.toUpperCase();
  return SYMBOL_PATTERN.test(symbol) ? symbol : null;
}

function isRange(value: string): value is Range {
  return (RANGES as readonly string[]).includes(value);
}

export function createApp({ provider, chat, limiter, alerts, search = createSearch() }: AppDeps): Hono {
  const app = new Hono();
  // In memory for this process or isolate: losing them costs one upstream call.
  const cache = new Map<string, { expires: number; value: BarsResult }>();
  const summaryCache = new Map<string, { expires: number; value: StockSummary }>();

  app.get(BASE_PATH, (c) => c.redirect(`${BASE_PATH}/${new URL(c.req.url).search}`, 301));

  app.get(`${API}/health`, (c) => c.json({ provider: provider.id, hasKey: chat.key.length > 0, alerts: alerts.enabled }));

  app.get(`${API}/bars/:symbol`, async (c) => {
    const symbol = parseSymbol(c.req.param("symbol"));
    if (!symbol) return c.json({ error: "Invalid symbol" }, 400);
    const range = c.req.query("range") ?? "5d";
    if (!isRange(range)) return c.json({ error: `Invalid range. Use one of: ${RANGES.join(", ")}` }, 400);

    const key = `${provider.id}:${symbol}:${range}`;
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return c.json(hit.value);

    const value = await provider.getBars(symbol, range);
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
    return c.json(value);
  });

  app.get(`${API}/symbol/:symbol`, async (c) => {
    const symbol = parseSymbol(c.req.param("symbol"));
    if (!symbol) return c.json({ error: "Invalid symbol" }, 400);
    const info = await provider.resolveSymbol(symbol);
    if (!info) return c.json({ error: `No data for ${symbol}` }, 404);
    return c.json(info);
  });

  app.get(`${API}/search`, (c) => search.handler(c));

  app.get(`${API}/summary/:symbol`, async (c) => {
    const symbol = parseSymbol(c.req.param("symbol"));
    if (!symbol) return c.json({ error: "Invalid symbol" }, 400);
    const key = `${provider.id}:${symbol}`;
    const hit = summaryCache.get(key);
    if (hit && hit.expires > Date.now()) return c.json(hit.value);

    const value = await provider.getSummary(symbol);
    summaryCache.set(key, { expires: Date.now() + SUMMARY_TTL_MS, value });
    return c.json(value);
  });

  app.post(`${API}/context`, createContextHandler({ chat, limiter, alerts }));

  app.all(`${API}/*`, (c) => c.json({ error: "Not found" }, 404));

  app.onError((err, c) => {
    if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
    if (err instanceof NotConfiguredError) return c.json({ error: err.message }, 501);
    if (err instanceof UpstreamError) {
      console.error(`upstream error: ${err.message}`);
      return c.json({ error: "Market data provider is unavailable, try again shortly" }, 502);
    }
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
