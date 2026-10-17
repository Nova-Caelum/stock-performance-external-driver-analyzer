// GET /api/search?q= : find a stock by ticker or company name.
// Yahoo's search answers names ("apple" -> AAPL) but returns nothing for a misspelling ("microsft"),
// so when it has no usable result a local typo-tolerant match runs over the SEC's list of US tickers.
//
// The SEC list is fetched through `fetchSecList`, so each runtime decides how it is kept: the Node server asks the
// SEC directly, the Worker keeps the response in the Cache API so a cold isolate does not download it again.
import type { Context } from "hono";

export type SearchType = "EQUITY" | "ETF" | "INDEX";

export interface SearchResult {
  symbol: string;
  name: string;
  /** Display name of the listing exchange; empty for SEC-list matches, which carry none. */
  exchange: string;
  type: SearchType;
}

const MAX_RESULTS = 8;
const MAX_QUERY = 60;
const TIMEOUT_MS = 8_000;
const QUERY_TTL_MS = 10 * 60 * 1000;
const QUERY_CACHE_LIMIT = 500;
const SEC_REFRESH_MS = 24 * 60 * 60 * 1000;
const SEC_RETRY_MS = 15 * 60 * 1000;

const YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search";
const YAHOO_USER_AGENT = "Mozilla/5.0"; // full browser UA strings get HTTP 429 (verified 2026-10-17)
export const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_USER_AGENT = "Nova Caelum demo agents@novacaelum.com"; // the SEC asks for a named contact
const SEC_TIMEOUT_MS = 15_000;
const KEEP_TYPES = new Set<string>(["EQUITY", "ETF", "INDEX"]);
const SYMBOL_PATTERN = /^[A-Z0-9.\-^=]{1,12}$/;

// ---- Yahoo search ----

interface YahooQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
  exchDisp?: string;
}

/** Usable Yahoo results, or null when Yahoo could not be asked (timeout, rate limit, bad body). */
async function yahooSearch(query: string): Promise<SearchResult[] | null> {
  const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=${MAX_RESULTS}&newsCount=0`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": YAHOO_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { quotes?: YahooQuote[] };
    const results: SearchResult[] = [];
    for (const quote of body.quotes ?? []) {
      const symbol = quote.symbol?.toUpperCase();
      if (!symbol || !SYMBOL_PATTERN.test(symbol) || !KEEP_TYPES.has(quote.quoteType ?? "")) continue;
      if (results.some((r) => r.symbol === symbol)) continue;
      results.push({
        symbol,
        name: (quote.longname ?? quote.shortname ?? symbol).trim(),
        exchange: (quote.exchDisp ?? quote.exchange ?? "").trim(),
        type: quote.quoteType as SearchType,
      });
    }
    return results.slice(0, MAX_RESULTS);
  } catch {
    return null;
  }
}

// ---- SEC ticker list: loaded once, refreshed at most daily, empty if it cannot be fetched ----

/** The SEC's ticker list straight from the SEC. */
export function fetchSecTickers(): Promise<Response> {
  return fetch(SEC_TICKERS_URL, {
    headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(SEC_TIMEOUT_MS),
  });
}

interface SecEntry {
  ticker: string;
  /** Lower-case, no punctuation: compared against the query. */
  compactTicker: string;
  name: string;
  words: string[];
  /** All words joined, so "jp morgan" can meet "jpmorgan". */
  joined: string;
}

const STOP_WORDS = new Set(["inc", "corp", "co", "ltd", "plc", "the", "com", "holdings", "group"]);

/** Lower-case words with punctuation and the legal-form words removed; "class a" goes too. */
export function normaliseWords(value: string): string[] {
  const words = value
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const kept: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i] === "class" && words[i + 1]?.length === 1) {
      i++;
      continue;
    }
    if (!STOP_WORDS.has(words[i])) kept.push(words[i]);
  }
  return kept;
}

/** "MICROSOFT CORP" -> "Microsoft Corp"; titles that already carry lower case are kept as filed. */
function displayName(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed.toLowerCase().replace(/(^|[\s\-/(&.])([a-z])/g, (_m, lead: string, letter: string) => lead + letter.toUpperCase());
}

/** The SEC file's rows as search entries, in the file's order (largest company first), one per ticker. */
function parseSecList(body: Record<string, { ticker?: unknown; title?: unknown }>): SecEntry[] {
  // The file's keys are "0", "1", ... in size order (largest company first); keep that order.
  const rows = Object.keys(body)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => body[key]);
  const entries: SecEntry[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (typeof row?.ticker !== "string" || typeof row.title !== "string") continue;
    const ticker = row.ticker.toUpperCase();
    if (!SYMBOL_PATTERN.test(ticker) || seen.has(ticker)) continue;
    seen.add(ticker);
    const words = normaliseWords(row.title);
    entries.push({
      ticker,
      compactTicker: ticker.toLowerCase().replace(/[^a-z0-9]/g, ""),
      name: displayName(row.title),
      words,
      joined: words.join(""),
    });
  }
  return entries;
}

// ---- Typo-tolerant scoring ----

/** Optimal-string-alignment Damerau-Levenshtein distance, giving up past `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** Edits allowed for a query word: none under 4 letters, 1 for 4-6, 2 for longer. */
function allowedEdits(word: string): number {
  if (word.length < 4) return 0;
  return word.length <= 6 ? 1 : 2;
}

const EXACT = 100;
const PREFIX = 80;
const FUZZY = 60; // minus 10 per edit

/** How well one query word meets one candidate word; 0 when it does not. */
function wordScore(query: string, candidate: string): number {
  if (query === candidate) return EXACT;
  if (query.length >= 2 && candidate.startsWith(query)) return PREFIX;
  const max = allowedEdits(query);
  if (max === 0) return 0;
  const d = editDistance(query, candidate, max);
  return d <= max ? FUZZY - 10 * d : 0;
}

function scoreEntry(entry: SecEntry, queryWords: string[], compactQuery: string): number {
  let best = 0;

  // The ticker itself: exact or prefix, or a near miss for tickers typed with a slip.
  if (compactQuery) {
    const ticker = wordScore(compactQuery, entry.compactTicker);
    if (ticker > 0) best = ticker + 5; // a ticker hit outranks the same-strength name hit
  }

  // Every query word must meet some title word.
  if (queryWords.length > 0 && entry.words.length > 0) {
    let total = 0;
    for (const qw of queryWords) {
      let wordBest = 0;
      for (const tw of entry.words) wordBest = Math.max(wordBest, wordScore(qw, tw));
      if (wordBest === 0) {
        total = 0;
        break;
      }
      total += wordBest;
    }
    if (total > 0) best = Math.max(best, total / queryWords.length);
  }

  // The query run together against the title run together ("jp morgan" / "JPMorgan Chase").
  if (queryWords.length > 1 && compactQuery.length >= 4) best = Math.max(best, wordScore(compactQuery, entry.joined));

  return best;
}

function secMatches(secEntries: readonly SecEntry[], query: string): SearchResult[] {
  const queryWords = normaliseWords(query);
  const compactQuery = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!compactQuery) return [];
  const scored: { score: number; index: number }[] = [];
  secEntries.forEach((entry, index) => {
    const score = scoreEntry(entry, queryWords, compactQuery);
    if (score > 0) scored.push({ score, index });
  });
  // Best score first; ties go to the larger company, which comes earlier in the SEC file.
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, MAX_RESULTS).map(({ index }) => ({
    symbol: secEntries[index].ticker,
    name: secEntries[index].name,
    exchange: "",
    type: "EQUITY" as const,
  }));
}

// ---- Route ----

export interface Search {
  /** GET /api/search?q= */
  handler(c: Context): Promise<Response>;
  /** Starts loading the SEC list so the first misspelling does not pay for the download. Never throws. */
  warm(): void;
}

/** Search with its own caches: the SEC list (loaded through `fetchSecList`) and recent answers. */
export function createSearch(fetchSecList: () => Promise<Response> = fetchSecTickers): Search {
  let secEntries: SecEntry[] = [];
  let secLoadedAt = 0;
  let secFailedAt = 0;
  let secLoading: Promise<void> | null = null;

  async function loadSecList(): Promise<void> {
    try {
      const res = await fetchSecList();
      if (!res.ok) throw new Error(`SEC returned HTTP ${res.status}`);
      const body = (await res.json()) as Record<string, { ticker?: unknown; title?: unknown }>;
      const entries = parseSecList(body);
      if (entries.length === 0) throw new Error("SEC list was empty");
      secEntries = entries;
      secLoadedAt = Date.now();
      secFailedAt = 0;
    } catch (err) {
      secFailedAt = Date.now();
      console.error(`SEC ticker list unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Starts a load when the list is missing or a day old; a recent failure waits before retrying. */
  function refreshSecList(): Promise<void> {
    const now = Date.now();
    const due = secEntries.length === 0 ? now - secFailedAt >= SEC_RETRY_MS || secFailedAt === 0 : now - secLoadedAt >= SEC_REFRESH_MS;
    if (due && !secLoading) {
      secLoading = loadSecList().finally(() => {
        secLoading = null;
      });
    }
    return secLoading ?? Promise.resolve();
  }

  const queryCache = new Map<string, { expires: number; results: SearchResult[] }>();

  function remember(key: string, results: SearchResult[]) {
    if (queryCache.size >= QUERY_CACHE_LIMIT) {
      const oldest = queryCache.keys().next().value;
      if (oldest !== undefined) queryCache.delete(oldest);
    }
    queryCache.set(key, { expires: Date.now() + QUERY_TTL_MS, results });
  }

  async function search(query: string): Promise<SearchResult[]> {
    const key = query.toLowerCase().replace(/\s+/g, " ");
    const hit = queryCache.get(key);
    if (hit && hit.expires > Date.now()) return hit.results;

    const yahoo = await yahooSearch(query);
    if (yahoo && yahoo.length > 0) {
      remember(key, yahoo);
      return yahoo;
    }

    await refreshSecList();
    const fallback = secMatches(secEntries, query);
    // Cache only a real answer: a Yahoo outage or a missing SEC list should be retried, not remembered.
    if (yahoo !== null && secEntries.length > 0) remember(key, fallback);
    return fallback;
  }

  return {
    async handler(c) {
      const query = (c.req.query("q") ?? "").trim();
      if (query.length < 1 || query.length > MAX_QUERY) {
        return c.json({ error: `Search needs 1 to ${MAX_QUERY} characters` }, 400);
      }
      return c.json({ results: await search(query) });
    },
    warm() {
      void refreshSecList();
    },
  };
}
