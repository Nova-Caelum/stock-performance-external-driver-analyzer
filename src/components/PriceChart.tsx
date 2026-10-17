import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  MismatchDirection,
  TickMarkType,
  createChart,
  type IChartApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  BrushableAreaInteraction,
  createBrushableAreaSeries,
  type BrushableAreaRange,
  type OptionsAwareSeries,
  type BrushableAreaData,
  type BrushableAreaSeriesOptions,
} from "@tradingview/lwc-plugin-brushable-area-series";
import { Badge, Card, Chip, Heading, Loading, Text } from "@nova-caelum/ui";
import type { BarsResult, Range } from "../lib/api";
import { isIntraday, type BarsState } from "../hooks/useBars";
import { StockSummary } from "./StockSummary";

/** A brushed stretch of the chart, as UTC seconds of its first and last bar. */
export interface Selection {
  fromTime: number;
  toTime: number;
}

export const RANGE_OPTIONS: readonly { value: Range; label: string; span: string }[] = [
  { value: "1d", label: "1D", span: "today" },
  { value: "5d", label: "5D", span: "past 5 days" },
  { value: "1mo", label: "1M", span: "past month" },
  { value: "6mo", label: "6M", span: "past 6 months" },
  { value: "1y", label: "1Y", span: "past year" },
];

// ---- Formatting: every label is US/Eastern; timestamps stay UTC seconds. ----

const ET = "America/New_York";
const fmtTime = new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric", minute: "2-digit" });
const fmtWeekdayTime = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", hour: "numeric", minute: "2-digit" });
const fmtDayTime = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmtWeekdayDate = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", month: "short", day: "numeric" });
const fmtFullDate = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", month: "short", day: "numeric", year: "numeric" });
const fmtYear = new Intl.DateTimeFormat("en-US", { timeZone: ET, year: "numeric" });
const fmtMonth = new Intl.DateTimeFormat("en-US", { timeZone: ET, month: "short" });
const fmtDay = new Intl.DateTimeFormat("en-US", { timeZone: ET, day: "numeric" });
const fmtWeekdayDay = new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", day: "numeric" });

/** "Tue 22" (en-US would otherwise order it "22 Tue"). */
function weekdayDay(date: Date): string {
  const parts = fmtWeekdayDay.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("weekday")} ${pick("day")}`;
}
const fmtPrice = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSigned = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });

const ms = (seconds: number) => new Date(seconds * 1000);

export function formatPrice(value: number): string {
  return fmtPrice.format(value);
}

export function formatChange(price: number, reference: number): { abs: string; pct: string; trend: "up" | "down" | "flat" } {
  const diff = price - reference;
  const pct = reference ? (diff / reference) * 100 : 0;
  const trend = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return { abs: fmtSigned.format(diff), pct: `${fmtSigned.format(pct)}%`, trend };
}

/** One end of a window: "Fri, Oct 16, 10:35 AM ET", or a date alone for daily bars. */
export function formatBound(seconds: number, interval: string): string {
  return isIntraday(interval) ? `${fmtDayTime.format(ms(seconds))} ET` : fmtFullDate.format(ms(seconds));
}

/** "Fri, Oct 16, 10:35 AM ET to Mon, Oct 19, 3:55 PM ET". */
export function formatWindow(selection: Selection, interval: string): string {
  return `${formatBound(selection.fromTime, interval)} to ${formatBound(selection.toTime, interval)}`;
}

function lastBarLabel(data: BarsResult, live: boolean, fetchedAt: number | null): string {
  if (!isIntraday(data.interval)) return `Last bar ${fmtWeekdayDate.format(ms(data.lastBarTime))}`;
  if (live && fetchedAt) {
    return `Updated ${fmtTime.format(ms(fetchedAt))} ET · last bar ${fmtTime.format(ms(data.lastBarTime))}`;
  }
  return `Last bar ${fmtWeekdayTime.format(ms(data.lastBarTime))} ET`;
}

function tickLabel(time: Time, type: TickMarkType, intraday: boolean): string {
  const date = ms(time as number);
  switch (type) {
    case TickMarkType.Year:
      return fmtYear.format(date);
    case TickMarkType.Month:
      return fmtMonth.format(date);
    case TickMarkType.DayOfMonth:
      return intraday ? weekdayDay(date) : fmtDay.format(date);
    default:
      return fmtTime.format(date);
  }
}

// ---- Canvas colours come from the Caelos tokens on the chart's own element. ----

function rgba(color: string, alpha: number): string {
  const hex = color.trim().replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color; // already carries its own alpha
}

function readTokens(el: HTMLElement) {
  const css = getComputedStyle(el);
  const token = (name: string) => css.getPropertyValue(name).trim() || "gray";
  return {
    accent: token("--sys-accent"),
    accentHover: token("--sys-accent-hover"),
    text: token("--sys-text-secondary"), // 11px axis labels need AA contrast
    grid: token("--sys-hair-1"),
    crosshair: token("--sys-hair-3"),
    label: token("--sys-elevated-2"),
    font: css.fontFamily,
  };
}

type AreaSeries = OptionsAwareSeries<Time, BrushableAreaData<Time>, BrushableAreaSeriesOptions>;

export interface PriceChartProps {
  symbol: string | null;
  range: Range;
  onRangeChange: (range: Range) => void;
  bars: BarsState;
  /** The App's current selection; when it becomes null the brush is cleared. */
  selection: Selection | null;
  /** Called with the brushed window when a drag completes, and with null when it is cleared. */
  onRangeSelect: (selection: Selection | null) => void;
}

export function PriceChart({ symbol, range, onRangeChange, bars, selection, onRangeSelect }: PriceChartProps) {
  const { data, error, loading, isStale, fetchedAt } = bars;
  const plotRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<AreaSeries | null>(null);
  const brushRef = useRef<BrushableAreaInteraction | null>(null);
  const intradayRef = useRef(true);
  const viewKeyRef = useRef<string | null>(null);
  const latestRangeRef = useRef<BrushableAreaRange | null>(null);
  const emittedRef = useRef<Selection | null>(null);
  const onRangeSelectRef = useRef(onRangeSelect);
  onRangeSelectRef.current = onRangeSelect;

  const emit = (next: Selection | null) => {
    const prev = emittedRef.current;
    if (next === null && prev === null) return;
    if (next && prev && next.fromTime === prev.fromTime && next.toTime === prev.toTime) return;
    emittedRef.current = next;
    onRangeSelectRef.current(next);
  };

  // Create the chart once per mount; remove it on cleanup.
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const t = readTokens(el);
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: t.text,
        fontFamily: t.font,
        fontSize: 11,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: t.grid } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.06 } },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true, // opening the right-hand panel must not cut off recent bars
        tickMarkFormatter: (time: Time, type: TickMarkType) => tickLabel(time, type, intradayRef.current),
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: t.crosshair, labelBackgroundColor: t.label },
        horzLine: { color: t.crosshair, labelBackgroundColor: t.label },
      },
      localization: {
        timeFormatter: (time: Time) =>
          intradayRef.current ? `${fmtDayTime.format(ms(time as number))} ET` : fmtFullDate.format(ms(time as number)),
        priceFormatter: (price: number) => fmtPrice.format(price),
      },
      // A mouse drag selects a stretch instead of panning; the wheel still zooms and scrolls.
      handleScroll: { pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false, mouseWheel: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });
    const series = createBrushableAreaSeries(chart, {
      lineColor: t.accent,
      topColor: rgba(t.accent, 0.26),
      bottomColor: rgba(t.accent, 0),
      lineWidth: 2,
      priceLineVisible: false,
      priceLineColor: t.accent,
      lastValueVisible: true,
    });
    const brush = new BrushableAreaInteraction({
      style: { lineColor: t.accentHover, topColor: rgba(t.accentHover, 0.36), bottomColor: rgba(t.accentHover, 0.04) },
      outsideStyle: { lineColor: rgba(t.accent, 0.32), topColor: rgba(t.accent, 0.06), bottomColor: rgba(t.accent, 0) },
    });
    series.attachPrimitive(brush);
    brush.activeRange().subscribe((r) => {
      latestRangeRef.current = r;
      if (r === null) emit(null); // a click without a drag clears the selection
    });

    chartRef.current = chart;
    seriesRef.current = series;
    brushRef.current = brush;
    return () => {
      chartRef.current = null;
      seriesRef.current = null;
      brushRef.current = null;
      viewKeyRef.current = null;
      chart.remove();
    };
    // `emit` reads only refs, so the first render's copy stays correct.
  }, []);

  // New data: replace the series. A refresh of the same symbol and range keeps the user's view.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    if (!data) {
      series.setData([]);
      brushRef.current?.clear();
      viewKeyRef.current = null;
      return;
    }
    const key = `${data.symbol}:${data.range}`;
    const sameView = viewKeyRef.current === key;
    const visible = sameView ? chart.timeScale().getVisibleRange() : null;
    intradayRef.current = isIntraday(data.interval);
    chart.applyOptions({ timeScale: { timeVisible: intradayRef.current } });
    series.setData(data.bars.map((bar) => ({ time: bar.time as UTCTimestamp, value: bar.close })));
    if (sameView && visible) {
      chart.timeScale().setVisibleRange(visible);
    } else {
      brushRef.current?.clear();
      chart.timeScale().fitContent();
    }
    viewKeyRef.current = key;
  }, [data]);

  // The App cleared the selection (e.g. the panel was closed): clear the brush too.
  useEffect(() => {
    if (selection === null && brushRef.current?.range()) brushRef.current.clear();
    if (selection === null) emittedRef.current = null;
  }, [selection]);

  // The plugin's own listeners sit on the chart's element inside this one, so these run after them.
  const commitDrag = () => {
    const r = latestRangeRef.current;
    const series = seriesRef.current;
    if (!r || !series) return;
    const fromTime = r.fromTime ?? series.dataByIndex(r.from, MismatchDirection.NearestRight)?.time ?? null;
    const toTime = r.toTime ?? series.dataByIndex(r.to, MismatchDirection.NearestLeft)?.time ?? null;
    if (typeof fromTime !== "number" || typeof toTime !== "number" || fromTime >= toTime) return;
    emit({ fromTime, toTime });
  };

  const live = Boolean(data) && !isStale;
  const span = RANGE_OPTIONS.find((o) => o.value === range)?.span ?? "";
  const change = data ? formatChange(data.regularMarketPrice, data.previousClose) : null;

  return (
    <Card variant="glass" className="mcd-chart-card" data-testid="chart-card">
      <div className="mcd-chart-head">
        <div className="mcd-chart-id">
          <div className="mcd-chart-title">
            {symbol ? <span className="mcd-ticker">{symbol}</span> : null}
            <Heading as="h2" size="title" className="mcd-chart-name">
              {data?.name ?? (symbol ? " " : "No ticker selected")}
            </Heading>
          </div>
          {data && change ? (
            <div className="mcd-quote">
              <span className="mcd-price">{formatPrice(data.regularMarketPrice)}</span>
              <span className="mcd-currency">{data.currency}</span>
              <span className="mcd-change" data-trend={change.trend}>
                {change.abs} ({change.pct})
              </span>
              <Text variant="small" tone="dim">
                {span}
              </Text>
            </div>
          ) : null}
        </div>
        {data ? (
          <div className="mcd-chart-status">
            <Badge data-testid="chart-badge" tone={live ? "ready" : "neutral"} className="mcd-badge">
              {live ? <Badge variant="dot" tone="ready" aria-hidden="true" /> : null}
              {live ? "Live" : "Market closed"}
            </Badge>
            <Text variant="small" tone="muted" data-testid="chart-last-bar" className="mcd-last-bar">
              {lastBarLabel(data, live, fetchedAt)}
            </Text>
          </div>
        ) : null}
      </div>

      {symbol ? <StockSummary key={symbol} symbol={symbol} bars={data && data.symbol === symbol ? data : null} /> : null}

      <div className="mcd-chart-toolbar">
        <div role="group" aria-label="Chart range" className="mcd-ranges">
          {RANGE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              variant="filter"
              selected={option.value === range}
              data-testid={`range-${option.value}`}
              title={`Show ${option.span}`}
              onClick={() => onRangeChange(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        {error && data ? (
          <Text variant="small" tone="dim" role="status">
            Refresh failed, showing the last good data
          </Text>
        ) : null}
      </div>

      {/* The chart owns its element's children, so overlays are siblings rather than children. */}
      <div className="mcd-plot-wrap" onMouseUp={commitDrag} onMouseLeave={commitDrag} onTouchEnd={commitDrag}>
        <div className="mcd-plot" data-testid="chart" ref={plotRef} />
        {!symbol ? (
          <div className="mcd-plot-overlay">
            <Text tone="muted">Add a ticker to see its chart.</Text>
          </div>
        ) : !data && loading ? (
          <div className="mcd-plot-overlay">
            <Loading>Loading {symbol}…</Loading>
          </div>
        ) : !data && error ? (
          <div className="mcd-plot-overlay" role="alert">
            <Text tone="muted">
              Could not load {symbol}: {error}
            </Text>
          </div>
        ) : data && data.bars.length === 0 ? (
          <div className="mcd-plot-overlay">
            <Text tone="muted">No bars for this range.</Text>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

