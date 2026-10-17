// Window statistics and the one way their figures are written down.
// Pure and free of DOM and React: the chat panel shows these strings and the server puts the very same
// strings in the model's prompt, so "the figures on screen are the figures the model saw" holds by construction.
import type { Bar } from "./api";

export interface SelectionStats {
  /** UTC seconds of the first bar inside the window */
  start: number;
  /** UTC seconds of the last bar inside the window */
  end: number;
  open: number;
  close: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  barCount: number;
}

/** Figures for the bars with `fromTime <= time <= toTime`; `null` when fewer than two bars fall inside. */
export function selectionStats(bars: readonly Bar[], fromTime: number, toTime: number): SelectionStats | null {
  let first: Bar | undefined;
  let last: Bar | undefined;
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;
  let barCount = 0;
  for (const bar of bars) {
    if (bar.time < fromTime || bar.time > toTime) continue;
    first ??= bar;
    last = bar;
    high = Math.max(high, bar.high);
    low = Math.min(low, bar.low);
    volume += bar.volume;
    barCount++;
  }
  if (barCount < 2 || !first || !last) return null;
  return {
    start: first.time,
    end: last.time,
    open: first.open,
    close: last.close,
    // A zero open has no percentage change; 0 keeps every figure finite.
    changePct: first.open > 0 ? ((last.close - first.open) / first.open) * 100 : 0,
    high,
    low,
    volume,
    barCount,
  };
}

// ---- Written figures ----

const fmtPrice = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSignedPct = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });
const fmtWhole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export interface StatFigures {
  change: string;
  open: string;
  close: string;
  high: string;
  low: string;
  volume: string;
  barCount: string;
}

/** "+3.12%", "215.40", "1,234,567": one rendering per figure. */
export function formatFigures(stats: SelectionStats): StatFigures {
  return {
    change: `${fmtSignedPct.format(stats.changePct)}%`,
    open: fmtPrice.format(stats.open),
    close: fmtPrice.format(stats.close),
    high: fmtPrice.format(stats.high),
    low: fmtPrice.format(stats.low),
    volume: fmtWhole.format(stats.volume),
    barCount: fmtWhole.format(stats.barCount),
  };
}

const etParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** US/Eastern, assembled from parts so the separators are plain spaces: "Mon 6 Oct 9:30 AM", "Mon 6 Oct 2026". */
export function formatEt(seconds: number, { time = true, year = false } = {}): string {
  const p = Object.fromEntries(etParts.formatToParts(new Date(seconds * 1000)).map((part) => [part.type, part.value]));
  const date = `${p.weekday} ${p.day} ${p.month}${year ? ` ${p.year}` : ""}`;
  return time ? `${date} ${p.hour}:${p.minute} ${p.dayPeriod}` : date;
}
