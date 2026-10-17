import { useEffect, useState } from "react";
import { getBars, type BarsResult, type Range } from "../lib/api";

/** Chart data re-fetches on this cadence, in place, without reloading the page. */
export const REFRESH_MS = 5 * 60 * 1000;

/** Intraday bars older than this are not live, whatever the market state says. */
export const STALE_AFTER_SECONDS = 20 * 60;

/** A daily bar is stamped at the session open, so it is current for the whole session. */
const DAILY_STALE_AFTER_SECONDS = 24 * 60 * 60;

/** Staleness is re-evaluated on this cadence even when no new data arrives. */
const CLOCK_TICK_MS = 60 * 1000;

export interface BarsState {
  data: BarsResult | null;
  error: string | null;
  loading: boolean;
  /** UTC seconds of the newest bar, or null before the first good response. */
  lastBarTime: number | null;
  /** The market is closed, or the newest bar is stale (20 minutes intraday, one session for daily bars). False without data. */
  isStale: boolean;
  /** UTC seconds when this client last received good data. */
  fetchedAt: number | null;
}

interface Snapshot {
  key: string;
  data: BarsResult | null;
  error: string | null;
  loading: boolean;
  fetchedAt: number | null;
}

/** Intraday intervals carry a time of day; daily and longer bars are dates. */
export function isIntraday(interval: string): boolean {
  return /^\d+(m|h)$/.test(interval);
}

export function isStaleBars(data: BarsResult, nowMs: number): boolean {
  const limit = isIntraday(data.interval) ? STALE_AFTER_SECONDS : DAILY_STALE_AFTER_SECONDS;
  return data.marketState === "closed" || nowMs / 1000 - data.lastBarTime > limit;
}

/**
 * Fetches bars on mount and whenever `symbol` or `range` changes, then every `intervalMs`.
 * A failed refresh keeps the last good data for the same symbol and range.
 */
export function useBars(symbol: string | null, range: Range, { intervalMs = REFRESH_MS } = {}): BarsState {
  const key = symbol ? `${symbol}:${range}` : "";
  const [snapshot, setSnapshot] = useState<Snapshot>({ key, data: null, error: null, loading: Boolean(symbol), fetchedAt: null });
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!symbol) {
      setSnapshot({ key, data: null, error: null, loading: false, fetchedAt: null });
      return;
    }
    let disposed = false;
    let controller: AbortController | null = null;

    // A different symbol or range must never show the previous one's bars.
    setSnapshot((prev) => (prev.key === key ? { ...prev, loading: true } : { key, data: null, error: null, loading: true, fetchedAt: null }));

    const load = async () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      setSnapshot((prev) => ({ ...prev, loading: true }));
      try {
        const data = await getBars(symbol, range, current.signal);
        if (disposed || current.signal.aborted) return;
        setSnapshot({ key, data, error: null, loading: false, fetchedAt: Math.floor(Date.now() / 1000) });
      } catch (err) {
        if (disposed || current.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Could not load prices";
        setSnapshot((prev) => ({ ...prev, error: message, loading: false }));
      }
    };

    void load();
    const timer = setInterval(() => void load(), intervalMs);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(timer);
    };
  }, [key, symbol, range, intervalMs]);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const current = snapshot.key === key ? snapshot : { key, data: null, error: null, loading: Boolean(symbol), fetchedAt: null };
  const data = current.data;
  return {
    data,
    error: current.error,
    loading: current.loading,
    lastBarTime: data ? data.lastBarTime : null,
    isStale: data ? isStaleBars(data, Date.now()) : false,
    fetchedAt: current.fetchedAt,
  };
}
