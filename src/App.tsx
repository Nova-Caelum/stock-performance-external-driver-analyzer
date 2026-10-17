import { useCallback, useEffect, useState } from "react";
import { CaelosProvider, CaelosWordmark, Heading, Separator, Surface, Text } from "@nova-caelum/ui";
import { Watchlist } from "./components/Watchlist";
import { ContextChat } from "./components/ContextChat";
import { PriceChart, type Selection } from "./components/PriceChart";
import { useBars } from "./hooks/useBars";
import type { Bar, Range } from "./lib/api";

const NO_BARS: Bar[] = [];

/** Lucide "move-horizontal" (ISC), the same glyph family the UI package draws its icons from. */
function DragMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m18 8 4 4-4 4" />
      <path d="M2 12h20" />
      <path d="m6 8-4 4 4 4" />
    </svg>
  );
}

export function App() {
  const [symbol, setSymbol] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("1mo");
  const [selection, setSelection] = useState<Selection | null>(null);
  const barsState = useBars(symbol, range);
  const bars = barsState.data?.bars ?? NO_BARS;
  const interval = barsState.data?.interval ?? "1d";

  // A different ticker or range starts without a selected stretch.
  useEffect(() => setSelection(null), [symbol, range]);

  const clearSelection = useCallback(() => setSelection(null), []);

  return (
    <CaelosProvider theme="dark" className="mcd-root">
      <Surface as="div" layer="chrome" texture="plain" role="banner" className="mcd-header">
        <a href="https://novacaelum.com/" aria-label="Nova Caelum home">
          <CaelosWordmark size={36} decorative className="mcd-wordmark" data-testid="app-wordmark" />
        </a>
        <Separator orientation="vertical" className="mcd-header-rule" />
        <Heading as="h1" size="title" className="mcd-product" data-testid="app-title">
          {"Stock Performance \u2013 Driver Analysis"}
        </Heading>
        <Text variant="small" tone="dim" className="mcd-source">
          Market data from Yahoo Finance · proof of concept, not for trading
        </Text>
      </Surface>

      <Surface as="aside" layer="chrome" texture="plain" aria-label="Watchlist" className="mcd-sidebar">
        <Watchlist selected={symbol} onSelect={setSymbol} />
      </Surface>

      {/* Plain ground: a price plot must not sit on a decorative grid that its own gridlines do not match. */}
      <Surface as="main" layer="ground" texture="plain" className="mcd-workspace">
        {/* Above the chart card, not inside it: the one instruction the chart needs, said once. */}
        <p className="mcd-drag-hint" data-testid="drag-hint">
          <DragMark />
          <span>Drag across any stretch of the chart to see what drove it.</span>
        </p>
        <div className="mcd-stage">
          <PriceChart
            symbol={symbol}
            range={range}
            onRangeChange={setRange}
            bars={barsState}
            selection={selection}
            onRangeSelect={setSelection}
          />
          <aside data-testid="context-slot" aria-label="Selected window" className="mcd-context" data-open={selection ? "true" : undefined}>
            {selection && symbol ? (
              // The key starts a fresh thread for every new selection.
              <ContextChat
                key={`${symbol}:${selection.fromTime}:${selection.toTime}`}
                symbol={symbol}
                name={barsState.data?.name ?? symbol}
                range={range}
                interval={interval}
                bars={bars}
                selection={selection}
                onClose={clearSelection}
              />
            ) : null}
          </aside>
        </div>
      </Surface>
    </CaelosProvider>
  );
}
