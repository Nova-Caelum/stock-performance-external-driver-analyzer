import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Badge, Button, IconButton, Input, Row, ScrollArea, Text } from "@nova-caelum/ui";
import { menu } from "@nova-caelum/ui/recipes";
import { resolveSymbol, searchSymbols, type SearchResult } from "../lib/api";
import { useBars } from "../hooks/useBars";
import { formatChange, formatPrice } from "./PriceChart";

export const DEFAULT_TICKERS = ["AAPL", "NVDA", "MSFT", "SPY"];
export const WATCHLIST_STORAGE_KEY = "mcd.watchlist.v1";

/** Suggestions wait for a pause in typing this long. */
const SEARCH_DEBOUNCE_MS = 200;
const MAX_QUERY = 60;
/** What the server accepts as a ticker; anything else is treated as a company name. */
const TICKER_PATTERN = /^[A-Z0-9.\-^=]{1,12}$/;
const menuClasses = menu();

function loadTickers(): string[] {
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (raw === null) return DEFAULT_TICKERS;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) return parsed;
  } catch {
    // unreadable storage: fall back to the defaults
  }
  return DEFAULT_TICKERS;
}

/** Stroke-only close mark in currentColor (the host has no icon package of its own). */
function RemoveMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

interface WatchlistProps {
  selected: string | null;
  onSelect: (symbol: string | null) => void;
}

interface Suggestions {
  query: string;
  results: SearchResult[];
}

export function Watchlist({ selected, onSelect }: WatchlistProps) {
  const [tickers, setTickers] = useState<string[]>(loadTickers);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const timerRef = useRef<number | undefined>(undefined);
  const searchRef = useRef<AbortController | null>(null);
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  useEffect(() => {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(tickers));
  }, [tickers]);

  // The selected ticker must always be one that is on the list.
  useEffect(() => {
    if (selected === null || !tickers.includes(selected)) onSelect(tickers[0] ?? null);
  }, [tickers, selected, onSelect]);

  const cancelSearch = useCallback(() => {
    window.clearTimeout(timerRef.current);
    searchRef.current?.abort();
    searchRef.current = null;
  }, []);

  useEffect(() => cancelSearch, [cancelSearch]);

  /** Fetches suggestions for `query`; a reply for a query the field no longer holds is dropped. */
  const runSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    try {
      const results = await searchSymbols(query, controller.signal);
      if (!controller.signal.aborted && draftRef.current.trim() === query) {
        setSuggestions({ query, results });
        setActive(-1);
        setOpen(results.length > 0);
      }
      return results;
    } catch {
      return [];
    } finally {
      if (searchRef.current === controller) searchRef.current = null;
    }
  }, []);

  const scheduleSearch = (value: string) => {
    cancelSearch();
    const query = value.trim();
    setActive(-1);
    if (!query || query.length > MAX_QUERY) {
      setOpen(false);
      return;
    }
    timerRef.current = window.setTimeout(() => void runSearch(query), SEARCH_DEBOUNCE_MS);
  };

  const query = draft.trim();
  const results = suggestions && suggestions.query === query ? suggestions.results : [];
  const listOpen = open && results.length > 0;

  const closeList = () => {
    setOpen(false);
    setActive(-1);
  };

  const accept = (symbol: string) => {
    setTickers((list) => (list.includes(symbol) ? list : [...list, symbol]));
    setDraft("");
    setSuggestions(null);
    closeList();
    onSelect(symbol);
  };

  /** Adds a known symbol after checking the chart source has data for it. */
  const addSymbol = async (symbol: string) => {
    cancelSearch();
    closeList();
    setError(null);
    if (tickers.includes(symbol)) {
      accept(symbol);
      return;
    }
    setPending(true);
    try {
      const info = await resolveSymbol(symbol);
      if (!info) {
        setError(`No data for ${symbol}`);
        return;
      }
      accept(info.symbol.toUpperCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not check ${symbol}`);
    } finally {
      setPending(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !query) return;
    const highlighted = listOpen && active >= 0 ? results[active] : undefined;
    if (highlighted) {
      await addSymbol(highlighted.symbol);
      return;
    }
    cancelSearch();
    closeList();
    setError(null);
    const typed = query.toUpperCase();
    const looksLikeTicker = TICKER_PATTERN.test(typed);
    if (tickers.includes(typed)) {
      accept(typed);
      return;
    }
    setPending(true);
    try {
      // An exact ticker adds directly, as it always has.
      if (looksLikeTicker) {
        const info = await resolveSymbol(typed);
        if (info) {
          accept(info.symbol.toUpperCase());
          return;
        }
      }
      // Otherwise the best match for the name, if there is one.
      const matches = suggestions?.query === query ? suggestions.results : await searchSymbols(query).catch(() => []);
      const best = matches[0];
      const info = best ? await resolveSymbol(best.symbol) : null;
      if (info) {
        accept(info.symbol.toUpperCase());
        return;
      }
      setError(`No data for ${looksLikeTicker ? typed : `\u201c${query}\u201d`}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not check ${query}`);
    } finally {
      setPending(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      const down = event.key === "ArrowDown";
      if (!listOpen) {
        setOpen(true);
        setActive(down ? 0 : results.length - 1);
        return;
      }
      setActive((i) => (down ? (i + 1) % results.length : i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Escape" && listOpen) {
      event.preventDefault();
      closeList();
    }
  };

  const remove = (symbol: string) => {
    const index = tickers.indexOf(symbol);
    const next = tickers.filter((s) => s !== symbol);
    setTickers(next);
    if (symbol === selected) onSelect(next[Math.min(index, next.length - 1)] ?? null);
  };

  return (
    <div className="mcd-watchlist">
      <div className="mcd-watchlist-head">
        <Text variant="label">Watchlist</Text>
        <Text variant="small" tone="dim" className="mcd-count">
          {tickers.length}
        </Text>
      </div>

      <div className="mcd-add-wrap">
        <form className="mcd-add" onSubmit={submit} noValidate>
          <Input
            role="combobox"
            aria-label="Add a stock by ticker or company name"
            aria-autocomplete="list"
            aria-expanded={listOpen}
            aria-controls={listOpen ? listboxId : undefined}
            aria-activedescendant={listOpen && active >= 0 ? optionId(active) : undefined}
            // The Add button carries the verb; the brief's "Add a stock — ticker or company name" needs 229px
            // and the field has 157px beside the button at this sidebar width, so it would be cut off.
            placeholder="Ticker or company name"
            value={draft}
            invalid={Boolean(error)}
            aria-describedby={error ? "watchlist-error" : undefined}
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_QUERY}
            data-testid="watchlist-input"
            wrapperClassName="mcd-add-input"
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
              scheduleSearch(e.target.value);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            onBlur={closeList}
          />
          <Button type="submit" size="sm" variant="tonal" loading={pending} data-testid="watchlist-add" className="mcd-add-button">
            Add
          </Button>
        </form>

        {listOpen ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Matching stocks"
            data-testid="watchlist-suggestions"
            className={`${menuClasses.content} mcd-suggest`}
            // Pressing anywhere in the list (its scrollbar included) must not blur the field and close it.
            onMouseDown={(e) => e.preventDefault()}
          >
            {results.map((result, index) => (
              <li
                key={result.symbol}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                data-highlighted={index === active ? "" : undefined}
                data-symbol={result.symbol}
                data-testid={`watchlist-suggestion-${result.symbol}`}
                className={`${menuClasses.item} mcd-suggest-item`}
                onMouseMove={() => {
                  if (active !== index) setActive(index);
                }}
                onClick={() => void addSymbol(result.symbol)}
              >
                <span className="mcd-suggest-symbol">{result.symbol}</span>
                <span className="mcd-suggest-exchange">{result.exchange || typeLabel(result.type)}</span>
                <span className="mcd-suggest-name">{result.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? (
        <Text as="p" variant="small" role="alert" id="watchlist-error" data-testid="watchlist-error" className="mcd-add-error">
          {error}
        </Text>
      ) : null}

      <ScrollArea viewportLabel="Watchlist tickers" className="mcd-watchlist-scroll">
        {tickers.length === 0 ? (
          <Text as="p" variant="small" tone="muted" className="mcd-empty">
            Your watchlist is empty. Add a stock above.
          </Text>
        ) : (
          <ul className="mcd-rows">
            {tickers.map((symbol) => (
              <WatchlistRow
                key={symbol}
                symbol={symbol}
                selected={symbol === selected}
                onSelect={() => onSelect(symbol)}
                onRemove={() => remove(symbol)}
              />
            ))}
          </ul>
        )}
      </ScrollArea>

      <Text as="p" variant="small" tone="dim" className="mcd-watchlist-foot">
        Prices refresh every 5 minutes.
      </Text>
    </div>
  );
}

function typeLabel(type: SearchResult["type"]): string {
  return type === "ETF" ? "ETF" : type === "INDEX" ? "Index" : "";
}

interface WatchlistRowProps {
  symbol: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function WatchlistRow({ symbol, selected, onSelect, onRemove }: WatchlistRowProps) {
  // One light 1-day request per row on the same 5-minute cadence as the chart.
  const { data, error } = useBars(symbol, "1d");
  const change = data ? formatChange(data.regularMarketPrice, data.previousClose) : null;

  return (
    <li className="mcd-row" data-testid={`watchlist-row-${symbol}`} data-selected={selected || undefined}>
      <Row variant="list" selected={selected} onClick={onSelect} className="mcd-row-button">
        <span className="mcd-row-grid">
          <span className="mcd-row-symbol">{symbol}</span>
          <span className="mcd-row-price">{data ? formatPrice(data.regularMarketPrice) : error ? "n/a" : "…"}</span>
          <span className="mcd-row-name">{data?.name ?? (error ? "Price unavailable" : " ")}</span>
          <span className="mcd-row-change">
            {change ? (
              <Badge tone={change.trend === "down" ? "danger" : change.trend === "up" ? "sage" : "neutral"} className="mcd-row-badge">
                {change.pct}
              </Badge>
            ) : null}
          </span>
        </span>
      </Row>
      <IconButton
        variant="text"
        size="sm"
        label={`Remove ${symbol}`}
        icon={<RemoveMark />}
        data-testid={`watchlist-remove-${symbol}`}
        className="mcd-row-remove"
        onClick={onRemove}
      />
    </li>
  );
}
