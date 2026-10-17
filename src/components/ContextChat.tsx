import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  Card,
  Chip,
  CompactError,
  ConversationColumn,
  ConversationMessage,
  IconButton,
  InlineSource,
  MessageProse,
  RetryButton,
  RippleLoader,
  ScrollArea,
  Text,
  TextArea,
  UserMessage,
} from "@nova-caelum/ui";
import { API_BASE, type Bar, type Range } from "../lib/api";
import { formatEt, formatFigures, selectionStats, type SelectionStats } from "../lib/stats";
import type { Selection } from "./PriceChart";

const SUGGESTIONS = ["What drove this move?", "Any news or earnings in this window?", "How did the sector and market do?"] as const;

/** The server refuses longer threads; whole question-and-answer pairs keep the list starting on a user turn. */
const MAX_HISTORY_TURNS = 10;
const MAX_QUESTION_CHARS = 1000;

interface Source {
  url: string;
  title: string;
}

interface Turn {
  id: number;
  question: string;
  answer: string;
  sources: Source[];
  status: "streaming" | "done" | "error";
  error: string | null;
  /** False for a rate-limit refusal: the answer is to wait, not to press Retry. */
  retryable: boolean;
}

interface WireTurn {
  role: "user" | "assistant";
  content: string;
}

// ---- The /api/context stream ----

interface ServerEvent {
  event: string;
  data: Record<string, unknown>;
}

function parseBlock(block: string): ServerEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
  }
  if (data.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(data.join("\n"));
    return typeof parsed === "object" && parsed !== null ? { event, data: parsed as Record<string, unknown> } : null;
  } catch {
    return null;
  }
}

/** Server-sent events from a POST response (EventSource cannot POST). */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ServerEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const parsed = parseBlock(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (parsed) yield parsed;
      }
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error) return body.error;
  } catch {
    // not JSON
  }
  return `The chat request failed (HTTP ${res.status}).`;
}

/** Links only from http(s): the server already filters, and an href is the one place a bad scheme would run. */
function toSources(items: unknown): Source[] {
  if (!Array.isArray(items)) return [];
  const out: Source[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const { url, title } = item as { url?: unknown; title?: unknown };
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) continue;
    out.push({ url, title: typeof title === "string" && title ? title : url });
  }
  return out;
}

function toHistory(turns: readonly Turn[]): WireTurn[] {
  const wire = turns
    .filter((t) => t.status === "done")
    .flatMap<WireTurn>((t) => [
      { role: "user", content: t.question },
      { role: "assistant", content: t.answer },
    ]);
  return wire.slice(-MAX_HISTORY_TURNS);
}

// ---- The panel ----

/** Stroke-only marks in currentColor (the host has no icon package of its own). */
function CloseMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SendMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export interface ContextChatProps {
  symbol: string;
  name: string;
  range: Range;
  /** Bar interval of `bars`: daily windows are dates, intraday windows carry a time of day. */
  interval: string;
  bars: Bar[];
  selection: Selection;
  onClose: () => void;
}

export function ContextChat({ symbol, name, range, interval, bars, selection, onClose }: ContextChatProps) {
  const stats = useMemo(() => selectionStats(bars, selection.fromTime, selection.toTime), [bars, selection.fromTime, selection.toTime]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.status === "streaming");

  useEffect(() => () => inFlight.current?.abort(), []);

  // Keep the newest words in view while the answer streams in.
  useEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  /** Sends `question` with the thread so far (`prior`) and the exact stats object this panel is showing. */
  const run = useCallback(
    async (question: string, prior: Turn[], shown: SelectionStats) => {
      const id = ++nextId.current;
      const controller = new AbortController();
      inFlight.current = controller;
      const patch = (change: (turn: Turn) => Turn) => setTurns((list) => list.map((t) => (t.id === id ? change(t) : t)));
      const fail = (message: string, retryable = true) => patch((t) => ({ ...t, status: "error", error: message, retryable }));
      setTurns([...prior, { id, question, answer: "", sources: [], status: "streaming", error: null, retryable: true }]);

      try {
        const res = await fetch(`${API_BASE}/context`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol,
            name,
            range,
            fromTime: selection.fromTime,
            toTime: selection.toTime,
            stats: shown,
            question,
            history: toHistory(prior),
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          fail(await readError(res), res.status !== 429); // 429: the server says how long to wait
          return;
        }
        let finished = false;
        for await (const { event, data } of readEvents(res.body)) {
          if (event === "delta" && typeof data.text === "string") {
            const text = data.text;
            patch((t) => ({ ...t, answer: t.answer + text }));
          } else if (event === "sources") {
            patch((t) => ({ ...t, sources: toSources(data.items) }));
          } else if (event === "done") {
            finished = true;
            patch((t) => ({ ...t, status: "done" }));
          } else if (event === "error") {
            finished = true;
            fail(typeof data.message === "string" && data.message ? data.message : "The chat service failed. Try again.");
          }
        }
        if (!finished) fail("The answer was interrupted. Try again.");
      } catch {
        if (!controller.signal.aborted) fail("Could not reach the app server. Try again.");
      }
    },
    [symbol, name, range, selection.fromTime, selection.toTime],
  );

  const ask = (raw: string): boolean => {
    const question = raw.trim().slice(0, MAX_QUESTION_CHARS);
    if (!question || busy || !stats) return false;
    void run(question, turns, stats);
    return true;
  };

  const retry = (failed: Turn) => {
    if (busy || !stats) return;
    void run(failed.question, turns.filter((t) => t.id !== failed.id), stats);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ask(draft)) setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (ask(draft)) setDraft("");
    }
  };

  const figures = stats ? formatFigures(stats) : null;
  const daily = !/^\d+(m|h)$/.test(interval);
  const clock = { time: !daily };
  const trend = stats ? (stats.changePct > 0 ? "up" : stats.changePct < 0 ? "down" : "flat") : "flat";

  return (
    <Card variant="glass" className="mcd-chat" data-testid="ctx-panel" role="region" aria-label={`${symbol} selected window`}>
      <div className="mcd-chat-head">
        <div className="mcd-chat-id">
          <span className="mcd-ticker">{symbol}</span>
          <Text className="mcd-chat-name" tone="muted">
            {name}
          </Text>
          <IconButton label="Close" icon={<CloseMark />} variant="text" size="sm" onClick={onClose} data-testid="ctx-close" className="mcd-chat-close" />
        </div>
        {stats && figures ? (
          <>
            <Text as="div" variant="small" tone="muted" data-testid="ctx-window" className="mcd-chat-window">
              {`${formatEt(stats.start, clock)} – ${formatEt(stats.end, clock)}${daily ? "" : " ET"}`}
            </Text>
            <dl className="mcd-chat-stats">
              <div>
                <dt>Change</dt>
                <dd data-testid="ctx-change" data-trend={trend}>
                  {figures.change}
                </dd>
              </div>
              <div>
                <dt>High</dt>
                <dd data-testid="ctx-high">{figures.high}</dd>
              </div>
              <div>
                <dt>Low</dt>
                <dd data-testid="ctx-low">{figures.low}</dd>
              </div>
              <div>
                <dt>Volume</dt>
                <dd data-testid="ctx-volume">{figures.volume}</dd>
              </div>
            </dl>
          </>
        ) : (
          <Text as="p" variant="small" tone="muted" role="status" data-testid="ctx-too-narrow">
            Drag across at least two bars to ask about a stretch.
          </Text>
        )}
      </div>

      <ScrollArea viewportLabel="Conversation about the selected window" viewportRef={viewport} className="mcd-chat-scroll">
        {turns.length === 0 ? (
          <div className="mcd-chat-empty">
            <Text as="p" variant="small" tone="muted">
              Ask what drove this stretch. Answers draw on news and commentary dated around these days.
            </Text>
            <div className="mcd-chat-suggestions" role="group" aria-label="Suggested questions">
              {SUGGESTIONS.map((suggestion) => (
                <Chip key={suggestion} variant="category" disabled={!stats} onClick={() => ask(suggestion)} data-testid="ctx-suggestion">
                  {suggestion}
                </Chip>
              ))}
            </div>
          </div>
        ) : (
          <ConversationColumn className="mcd-chat-thread">
            {turns.map((turn) => (
              <div key={turn.id} className="mcd-chat-turn">
                <UserMessage value={turn.question} data-testid="ctx-user-message" />
                {turn.status === "streaming" && !turn.answer ? (
                  <div className="mcd-chat-working" role="status" data-testid="ctx-working">
                    <RippleLoader label="Searching the news" />
                    <Text variant="small" tone="muted">
                      Searching dated sources…
                    </Text>
                  </div>
                ) : turn.answer ? (
                  <ConversationMessage agentName="Analyst" data-testid="ctx-answer">
                    <MessageProse>
                      {turn.answer.split(/\n{2,}/).map((paragraph, i) => (
                        <p key={i} className="mcd-chat-paragraph">
                          {paragraph}
                        </p>
                      ))}
                    </MessageProse>
                    {turn.sources.length > 0 ? (
                      <ol className="mcd-chat-sources" aria-label="Sources">
                        {turn.sources.map((source) => (
                          <li key={source.url}>
                            <InlineSource href={source.url} target="_blank" rel="noreferrer noopener" data-testid="ctx-source">
                              {source.title}
                            </InlineSource>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </ConversationMessage>
                ) : null}
                {turn.status === "error" ? (
                  <CompactError
                    data-testid="ctx-error"
                    action={turn.retryable ? <RetryButton onClick={() => retry(turn)} disabled={busy || !stats} data-testid="ctx-retry" /> : undefined}
                  >
                    {turn.error}
                  </CompactError>
                ) : null}
              </div>
            ))}
          </ConversationColumn>
        )}
      </ScrollArea>

      <form className="mcd-chat-form" onSubmit={submit}>
        <TextArea
          aria-label="Ask a question about this stretch"
          placeholder="Ask about this stretch"
          rows={1}
          value={draft}
          maxLength={MAX_QUESTION_CHARS}
          disabled={!stats}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          data-testid="ctx-input"
          wrapperClassName="mcd-chat-input"
        />
        <IconButton
          type="submit"
          label="Send question"
          icon={<SendMark />}
          variant="primary"
          size="sm"
          disabled={!stats || busy || draft.trim().length === 0}
          data-testid="ctx-send"
          className="mcd-chat-send"
        />
      </form>
    </Card>
  );
}
