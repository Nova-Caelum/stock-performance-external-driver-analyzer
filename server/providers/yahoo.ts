// Yahoo Finance chart provider (proof-of-concept source: keyless, unofficial, not for commercial use).
import {
  NotFoundError,
  UpstreamError,
  type Bar,
  type BarsResult,
  type MarketDataProvider,
  type Range,
  type StockSummary,
  type SymbolInfo,
} from "./types.js";

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const TIMEOUT_MS = 8_000;
const USER_AGENT = "Mozilla/5.0"; // Yahoo answers 429 to full browser UA strings without cookies (verified 2026-10-17)

const INTERVAL: Record<Range, string> = {
  "1d": "5m",
  "5d": "15m",
  "1mo": "60m",
  "6mo": "1d",
  "1y": "1d",
};

interface YahooMeta {
  symbol?: string;
  longName?: string;
  shortName?: string;
  currency?: string;
  exchangeName?: string;
  fullExchangeName?: string;
  exchangeTimezoneName?: string;
  regularMarketPrice?: number;
  regularMarketTime?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  currentTradingPeriod?: { regular?: { start?: number; end?: number } };
}

interface YahooResult {
  meta?: YahooMeta;
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
}

interface YahooResponse {
  chart?: { result?: YahooResult[] | null; error?: { code?: string; description?: string } | null };
}

async function fetchChart(symbol: string, range: Range): Promise<YahooResult> {
  const url = `${BASE_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${INTERVAL[range]}&includePrePost=false`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new UpstreamError(timedOut ? "Yahoo request timed out" : "Yahoo request failed");
  }

  if (res.status === 404) throw new NotFoundError(`No data for ${symbol}`);
  if (!res.ok) throw new UpstreamError(`Yahoo returned HTTP ${res.status}`);

  // A rate-limit or error page can come back as non-JSON; that is an upstream failure, not a crash.
  let body: YahooResponse;
  try {
    body = (await res.json()) as YahooResponse;
  } catch {
    throw new UpstreamError("Yahoo returned an unreadable response");
  }

  const result = body.chart?.result?.[0];
  if (!result) {
    if (body.chart?.error?.code === "Not Found") throw new NotFoundError(`No data for ${symbol}`);
    throw new UpstreamError("Yahoo returned no chart data");
  }
  return result;
}

function toBars(result: YahooResult): Bar[] {
  const times = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0];
  if (!q) return [];

  const bars: Bar[] = [];
  for (let i = 0; i < times.length; i++) {
    const open = q.open?.[i];
    const high = q.high?.[i];
    const low = q.low?.[i];
    const close = q.close?.[i];
    if (open == null || high == null || low == null || close == null) continue;
    const time = times[i];
    if (bars.length > 0 && time <= bars[bars.length - 1].time) continue; // ascending and unique
    bars.push({ time, open, high, low, close, volume: q.volume?.[i] ?? 0 });
  }
  return bars;
}

function marketState(meta: YahooMeta, nowSeconds: number): "open" | "closed" {
  const regular = meta.currentTradingPeriod?.regular;
  if (regular?.start == null || regular?.end == null) return "closed";
  return nowSeconds >= regular.start && nowSeconds <= regular.end ? "open" : "closed";
}

async function getBars(symbol: string, range: Range): Promise<BarsResult> {
  const result = await fetchChart(symbol, range);
  const meta = result.meta ?? {};
  const bars = toBars(result);
  const last = bars[bars.length - 1];
  const nowSeconds = Math.floor(Date.now() / 1000);

  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    currency: meta.currency ?? "USD",
    exchangeTimezone: meta.exchangeTimezoneName ?? "America/New_York",
    interval: INTERVAL[range],
    range,
    regularMarketPrice: meta.regularMarketPrice ?? last?.close ?? 0,
    previousClose: meta.chartPreviousClose ?? meta.previousClose ?? 0,
    lastBarTime: last?.time ?? meta.regularMarketTime ?? 0,
    marketState: marketState(meta, nowSeconds),
    bars,
    fetchedAt: nowSeconds,
  };
}

async function resolveSymbol(symbol: string): Promise<SymbolInfo | null> {
  try {
    const result = await fetchChart(symbol, "1d");
    const meta = result.meta ?? {};
    return {
      symbol: meta.symbol ?? symbol,
      name: meta.longName ?? meta.shortName ?? symbol,
      exchange: meta.fullExchangeName ?? meta.exchangeName ?? "",
      currency: meta.currency ?? "USD",
    };
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

// ---- Company summary: quoteSummary needs a session cookie and a matching crumb (verified 2026-10-17). ----

const COOKIE_URL = "https://fc.yahoo.com"; // answers 404, but sets the session cookie
const CRUMB_URL = "https://query1.finance.yahoo.com/v1/test/getcrumb";
const SUMMARY_URL = "https://query2.finance.yahoo.com/v10/finance/quoteSummary";
const SUMMARY_MODULES = "assetProfile,summaryDetail,price";

interface YahooSession {
  cookie: string;
  crumb: string;
}

let session: YahooSession | null = null;
let handshaking: Promise<YahooSession> | null = null;

async function yahooFetch(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      headers: { "User-Agent": USER_AGENT, ...(init.headers as Record<string, string> | undefined) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new UpstreamError(timedOut ? "Yahoo request timed out" : "Yahoo request failed");
  }
}

async function handshake(): Promise<YahooSession> {
  // The cookie is set on the first response itself, so do not follow a redirect past it.
  const first = await yahooFetch(COOKIE_URL, { redirect: "manual" });
  const cookie = first.headers
    .getSetCookie()
    .map((line) => line.split(";")[0].trim())
    .filter((pair) => pair.includes("="))
    .join("; ");
  if (!cookie) throw new UpstreamError("Yahoo set no session cookie");

  const res = await yahooFetch(CRUMB_URL, { headers: { Cookie: cookie } });
  if (!res.ok) throw new UpstreamError(`Yahoo crumb returned HTTP ${res.status}`);
  const crumb = (await res.text()).trim();
  if (!crumb || crumb.length > 64 || /[\s<{]/.test(crumb)) throw new UpstreamError("Yahoo returned no usable crumb");
  return { cookie, crumb };
}

/** One shared handshake at a time; `fresh` discards the cached session first. */
async function getSession(fresh = false): Promise<YahooSession> {
  if (fresh) session = null;
  if (session) return session;
  handshaking ??= handshake().finally(() => {
    handshaking = null;
  });
  session = await handshaking;
  return session;
}

interface YahooValue {
  raw?: unknown;
}

interface YahooSummaryResult {
  assetProfile?: {
    longBusinessSummary?: string;
    sector?: string;
    industry?: string;
    website?: string;
    fullTimeEmployees?: number;
  };
  summaryDetail?: Record<string, YahooValue | undefined>;
  price?: { longName?: string | null; shortName?: string | null; marketCap?: YahooValue; symbol?: string };
}

interface YahooSummaryResponse {
  quoteSummary?: { result?: YahooSummaryResult[] | null; error?: { code?: string; description?: string } | null };
}

/** Yahoo sends a missing figure as `{}`, so only a finite `raw` number counts. */
function num(value: YahooValue | number | undefined | null): number | null {
  const raw = typeof value === "number" ? value : value?.raw;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function text(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : null;
}

async function fetchSummary(symbol: string, current: YahooSession): Promise<Response> {
  const url = `${SUMMARY_URL}/${encodeURIComponent(symbol)}?modules=${SUMMARY_MODULES}&crumb=${encodeURIComponent(current.crumb)}`;
  return yahooFetch(url, { headers: { Cookie: current.cookie, Accept: "application/json" } });
}

async function getSummary(symbol: string): Promise<StockSummary> {
  let res = await fetchSummary(symbol, await getSession());
  // A crumb expires with its cookie: shake hands again once, then give up.
  if (res.status === 401 || res.status === 403) res = await fetchSummary(symbol, await getSession(true));
  if (res.status === 404) throw new NotFoundError(`No data for ${symbol}`);
  if (!res.ok) throw new UpstreamError(`Yahoo quoteSummary returned HTTP ${res.status}`);

  let body: YahooSummaryResponse;
  try {
    body = (await res.json()) as YahooSummaryResponse;
  } catch {
    throw new UpstreamError("Yahoo returned an unreadable summary");
  }
  const result = body.quoteSummary?.result?.[0];
  if (!result) {
    if (body.quoteSummary?.error?.code === "Not Found") throw new NotFoundError(`No data for ${symbol}`);
    throw new UpstreamError("Yahoo returned no summary");
  }

  const profile = result.assetProfile ?? {};
  const detail = result.summaryDetail ?? {};
  const employees = num(profile.fullTimeEmployees);
  return {
    symbol: result.price?.symbol ?? symbol,
    name: text(result.price?.longName) ?? text(result.price?.shortName) ?? symbol,
    description: text(profile.longBusinessSummary),
    sector: text(profile.sector),
    industry: text(profile.industry),
    website: text(profile.website),
    employees: employees !== null && employees > 0 ? employees : null,
    marketCap: num(detail.marketCap) ?? num(result.price?.marketCap),
    trailingPE: num(detail.trailingPE),
    // Funds report their distribution yield as `yield` rather than `dividendYield`.
    dividendYield: num(detail.dividendYield) ?? num(detail.yield),
    fiftyTwoWeekLow: num(detail.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: num(detail.fiftyTwoWeekHigh),
  };
}

export const yahooProvider: MarketDataProvider = { id: "yahoo", getBars, resolveSymbol, getSummary };
