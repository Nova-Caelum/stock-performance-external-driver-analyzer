export const RANGES = ["1d", "5d", "1mo", "6mo", "1y"] as const;
export type Range = (typeof RANGES)[number];

/** time = UTC seconds */
export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BarsResult {
  symbol: string;
  name: string;
  currency: string;
  exchangeTimezone: string;
  interval: string;
  range: Range;
  regularMarketPrice: number;
  previousClose: number;
  lastBarTime: number;
  marketState: "open" | "closed";
  bars: Bar[];
  /** UTC seconds, like every other timestamp in this payload */
  fetchedAt: number;
}

export interface SymbolInfo {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
}

/** What the company does and its headline figures. Numbers are raw; null when the source omits them
 *  (ETFs and indexes carry no company profile). */
export interface StockSummary {
  symbol: string;
  name: string;
  description: string | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  employees: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  /** A fraction: 0.0031 is 0.31%. */
  dividendYield: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
}

export interface MarketDataProvider {
  readonly id: "yahoo" | "schwab";
  getBars(symbol: string, range: Range): Promise<BarsResult>;
  resolveSymbol(symbol: string): Promise<SymbolInfo | null>;
  /** Throws NotFoundError for an unknown symbol. */
  getSummary(symbol: string): Promise<StockSummary>;
}

export class NotFoundError extends Error {}
export class NotConfiguredError extends Error {}
export class UpstreamError extends Error {}
