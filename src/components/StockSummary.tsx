import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, Text } from "@nova-caelum/ui";
import { getSummary, type BarsResult, type StockSummary as Summary } from "../lib/api";
import { formatPrice } from "./PriceChart";

// One fetch per symbol per page session; the server caches for six hours as well.
const loaded = new Map<string, Summary>();

const fmtPe = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 5012516765696 -> "$5.01T"; non-dollar listings carry their currency code instead. */
export function formatMarketCap(value: number, currency = "USD"): string {
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
  ];
  const [divisor, suffix] = units.find(([d]) => Math.abs(value) >= d) ?? [1, ""];
  const scaled = `${(value / divisor).toFixed(2)}${suffix}`;
  return currency === "USD" ? `$${scaled}` : `${scaled} ${currency}`;
}

interface Figure {
  label: string;
  value: string | null;
  testId: string;
}

function profileFigures(summary: Summary, currency: string): Figure[] {
  const sector = [summary.sector, summary.industry].filter(Boolean).join(" · ");
  const dividend =
    summary.dividendYield === null ? null : summary.dividendYield === 0 ? "None" : `${fmtPct.format(summary.dividendYield * 100)}%`;
  const range =
    summary.fiftyTwoWeekLow !== null && summary.fiftyTwoWeekHigh !== null
      ? `${formatPrice(summary.fiftyTwoWeekLow)} – ${formatPrice(summary.fiftyTwoWeekHigh)}`
      : null;
  return [
    { label: "Sector", value: sector || null, testId: "summary-sector" },
    { label: "Market cap", value: summary.marketCap === null ? null : formatMarketCap(summary.marketCap, currency), testId: "summary-marketcap" },
    { label: "P/E", value: summary.trailingPE === null ? null : fmtPe.format(summary.trailingPE), testId: "summary-pe" },
    { label: "Dividend yield", value: dividend, testId: "summary-dividend" },
    { label: "52-week range", value: range, testId: "summary-52w" },
  ];
}

/** When the profile cannot be fetched, the chart's own data still says something. */
function chartFigures(bars: BarsResult | null): Figure[] {
  if (!bars || bars.bars.length === 0) return [];
  const high = Math.max(...bars.bars.map((b) => b.high));
  const low = Math.min(...bars.bars.map((b) => b.low));
  return [
    { label: "Previous close", value: bars.previousClose ? formatPrice(bars.previousClose) : null, testId: "summary-prev-close" },
    { label: "Range high", value: formatPrice(high), testId: "summary-range-high" },
    { label: "Range low", value: formatPrice(low), testId: "summary-range-low" },
  ];
}

function Figures({ figures }: { figures: Figure[] }) {
  return (
    <dl className="mcd-summary-figures">
      {figures.map((f) => (
        <div key={f.label} className="mcd-summary-figure">
          <dt>{f.label}</dt>
          <dd data-testid={f.testId} data-empty={f.value === null || undefined}>
            {f.value ?? "n/a"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface StockSummaryProps {
  symbol: string;
  /** The chart's data for this symbol, for the currency and the fallback figures. */
  bars: BarsResult | null;
}

type State = { status: "loading" } | { status: "ready"; summary: Summary } | { status: "failed" };

export function StockSummary({ symbol, bars }: StockSummaryProps) {
  const [state, setState] = useState<State>(() => {
    const hit = loaded.get(symbol);
    return hit ? { status: "ready", summary: hit } : { status: "loading" };
  });
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setExpanded(false);
    const hit = loaded.get(symbol);
    if (hit) {
      setState({ status: "ready", summary: hit });
      return;
    }
    setState({ status: "loading" });
    const controller = new AbortController();
    getSummary(symbol, controller.signal)
      .then((summary) => {
        loaded.set(symbol, summary);
        setState({ status: "ready", summary });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "failed" });
      });
    return () => controller.abort();
  }, [symbol]);

  const description = state.status === "ready" ? state.summary.description : null;

  // "More" appears only when the clamped description actually hides text; re-checked on resize.
  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el) {
      setOverflows(false);
      return;
    }
    const measure = () => setOverflows(expanded || el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [description, expanded]);

  if (state.status === "loading") {
    return (
      <section className="mcd-summary" data-testid="summary-loading" aria-busy="true" aria-label={`Loading the profile of ${symbol}`}>
        <div className="mcd-summary-skeleton">
          <span />
          <span />
        </div>
        <div className="mcd-summary-skeleton mcd-summary-skeleton-figures">
          <span />
        </div>
      </section>
    );
  }

  if (state.status === "failed") {
    return (
      <section className="mcd-summary" data-testid="summary" data-state="unavailable" aria-label={`${symbol} figures`}>
        <Text as="p" variant="small" tone="dim" className="mcd-summary-unavailable">
          Profile unavailable
        </Text>
        <Figures figures={chartFigures(bars)} />
      </section>
    );
  }

  const { summary } = state;
  return (
    <section className="mcd-summary" data-testid="summary" aria-label={`About ${summary.name}`}>
      {description ? (
        <div className="mcd-summary-about">
          <p
            ref={descRef}
            id={`summary-${symbol}`}
            className="mcd-summary-description"
            data-testid="summary-description"
            data-expanded={expanded || undefined}
          >
            {description}
          </p>
          {overflows ? (
            <Button
              variant="text"
              size="sm"
              className="mcd-summary-more"
              aria-expanded={expanded}
              aria-controls={`summary-${symbol}`}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Less" : "More"}
            </Button>
          ) : null}
        </div>
      ) : (
        <Text as="p" variant="small" tone="dim" data-testid="summary-description" className="mcd-summary-unavailable">
          No company profile for {symbol}
        </Text>
      )}
      <Figures figures={profileFigures(summary, bars?.currency ?? "USD")} />
    </section>
  );
}
