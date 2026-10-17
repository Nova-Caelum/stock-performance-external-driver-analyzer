/// <reference types="vite/client" />
// Typed client for the app's own /api routes. Types come from the server so the two cannot drift.
import type { BarsResult, Range, StockSummary, SymbolInfo } from "../../server/providers/types";
import type { SearchResult } from "../../server/search";

export type { Bar, BarsResult, Range, StockSummary, SymbolInfo } from "../../server/providers/types";
export type { SearchResult } from "../../server/search";

/** The app's own API, under the path the app is served at (Vite's `base`, e.g. "/marketforces-dashboard/"). */
export const API_BASE = `${import.meta.env.BASE_URL}api`;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error) return body.error;
  } catch {
    // not JSON
  }
  return `Request failed (HTTP ${res.status})`;
}

export async function getBars(symbol: string, range: Range, signal?: AbortSignal): Promise<BarsResult> {
  const res = await fetch(`${API_BASE}/bars/${encodeURIComponent(symbol)}?range=${range}`, { signal });
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  return (await res.json()) as BarsResult;
}

/** Resolves a ticker to its exchange listing; `null` when the provider has no data for it. */
export async function resolveSymbol(symbol: string, signal?: AbortSignal): Promise<SymbolInfo | null> {
  const res = await fetch(`${API_BASE}/symbol/${encodeURIComponent(symbol)}`, { signal });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  return (await res.json()) as SymbolInfo;
}

/** Stocks, ETFs and indexes matching a ticker or company name (typos tolerated); at most 8. */
export async function searchSymbols(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  const body = (await res.json()) as { results?: SearchResult[] };
  return body.results ?? [];
}

/** What the company does and its headline figures. */
export async function getSummary(symbol: string, signal?: AbortSignal): Promise<StockSummary> {
  const res = await fetch(`${API_BASE}/summary/${encodeURIComponent(symbol)}`, { signal });
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  return (await res.json()) as StockSummary;
}
