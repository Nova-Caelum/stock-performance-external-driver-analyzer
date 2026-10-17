// POST /api/context: explains a stretch of a price chart from dated web sources, streamed back as server-sent events.
//
// The browser sends the question and the figures it displays; this route validates their shape, asks OpenRouter
// (DeepSeek V4.1 Flash + the `web` plugin on the Parallel search engine) and relays the answer as `delta`, `sources`,
// `done` or `error` events. The API key comes from the server's configuration and appears only in the outbound
// Authorization header: it is never logged, echoed, or put in a response.
//
// Cost controls: a question over the limit (server/ratelimit.ts, or server/limiter-do.ts on Cloudflare) is refused
// with HTTP 429 before anything is sent upstream; a limiter that cannot be reached refuses every question with 503
// (fail closed: an unreachable limit must never mean no limit); and every call that does not produce an answer is
// reported to Daniel (server/alerts.ts).
import type { Context } from "hono";
import { streamSSE, type SSEStreamingApi } from "hono/streaming";
import { formatEt, formatFigures, type SelectionStats } from "../src/lib/stats.js";
import type { Alerts, ChatFailure } from "./alerts.js";
import { RANGES, type Range } from "./providers/types.js";
import type { Admission, ChatLimiter } from "./ratelimit.js";

export const DEFAULT_MODEL = "deepseek/deepseek-v4.1-flash";
export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
/** Reasoning shares this budget: at 500 the probe returned empty content, so keep it well above that. */
// Reasoning tokens count against this budget; at 1500 DeepSeek occasionally spent it all and returned no text (probe 2026-10-17).
const MAX_TOKENS = 4000;
const WEB_RESULTS = 6;
/** Parallel's cheapest search mode: $0.001 a request, English, about 200 ms. */
const SEARCH_MODE = "turbo";
const UPSTREAM_TIMEOUT_MS = 120_000;
/** How much of a failed response is read for OpenRouter's own error text, and for how long. */
const ERROR_BODY_MAX_CHARS = 4096;
const ERROR_BODY_TIMEOUT_MS = 2000;

const SYMBOL_PATTERN = /^[A-Z0-9.\-^=]{1,12}$/; // same pattern as server/app.ts
const MAX_BODY_CHARS = 100_000;
const MAX_NAME_CHARS = 120;
const MAX_QUESTION_CHARS = 1000;
const MAX_HISTORY_TURNS = 10;
const MAX_TURN_CHARS = 8000;

const NO_KEY_MESSAGE = "Chat is temporarily unavailable.";
const LIMITER_DOWN_MESSAGE = "Chat is temporarily unavailable.";

export interface ChatConfig {
  /** The OpenRouter key; empty when none is configured. */
  key: string;
  /** OpenRouter's API base, replaced in tests. */
  baseUrl: string;
  /** The OpenRouter model; DEFAULT_MODEL when omitted. */
  model?: string;
}

interface ChatDeps {
  chat: ChatConfig;
  limiter: ChatLimiter;
  alerts: Alerts;
}

const SYSTEM_PROMPT = [
  "You are a markets analyst explaining what likely drove a stock's price over a specific window.",
  "Use web sources dated inside the window or shortly before it, and cite them inline as [n], numbered in the order you use them.",
  "Keep reported facts apart from inference: say what the sources report, and label your own reading of it as inference.",
  "If the sources do not cover the window, say so plainly instead of guessing.",
  "Keep answers under 200 words unless the user asks for more.",
  "Write plain sentences and short paragraphs. The reader sees raw text, so use no markdown headings, tables, bold or bullet lists.",
  "Never give investment advice: no buy, sell or hold recommendations and no price targets.",
].join("\n");

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface ContextRequest {
  symbol: string;
  name: string;
  range: Range;
  fromTime: number;
  toTime: number;
  stats: SelectionStats;
  question: string;
  history: Turn[];
}

type Parsed = { ok: true; value: ContextRequest } | { ok: false; error: string };

// ---- Validation ----

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const STAT_KEYS = ["start", "end", "open", "close", "changePct", "high", "low", "volume", "barCount"] as const;

function parseRequest(raw: unknown): Parsed {
  const bad = (error: string): Parsed => ({ ok: false, error });
  if (!isRecord(raw)) return bad("Request body must be a JSON object");

  const symbol = typeof raw.symbol === "string" ? raw.symbol.toUpperCase() : "";
  if (!SYMBOL_PATTERN.test(symbol)) return bad("Invalid symbol");

  const name = typeof raw.name === "string" ? raw.name.replace(/\s+/g, " ").trim() : "";
  if (!name || name.length > MAX_NAME_CHARS) return bad(`name must be 1 to ${MAX_NAME_CHARS} characters`);

  const range = raw.range;
  if (typeof range !== "string" || !(RANGES as readonly string[]).includes(range)) {
    return bad(`Invalid range. Use one of: ${RANGES.join(", ")}`);
  }

  const { fromTime, toTime } = raw;
  if (!isFiniteNumber(fromTime) || !isFiniteNumber(toTime)) return bad("fromTime and toTime must be finite numbers");
  if (fromTime >= toTime) return bad("fromTime must be before toTime");

  if (!isRecord(raw.stats)) return bad("stats must be an object");
  const stats = {} as Record<(typeof STAT_KEYS)[number], number>;
  for (const key of STAT_KEYS) {
    const value = raw.stats[key];
    if (!isFiniteNumber(value)) return bad(`stats.${key} must be a finite number`);
    stats[key] = value;
  }

  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (question.length < 1 || question.length > MAX_QUESTION_CHARS) return bad(`question must be 1 to ${MAX_QUESTION_CHARS} characters`);

  if (!Array.isArray(raw.history) || raw.history.length > MAX_HISTORY_TURNS) {
    return bad(`history must be a list of at most ${MAX_HISTORY_TURNS} turns`);
  }
  const history: Turn[] = [];
  for (const turn of raw.history as unknown[]) {
    if (!isRecord(turn) || (turn.role !== "user" && turn.role !== "assistant")) return bad("Each history turn needs role user or assistant");
    if (typeof turn.content !== "string" || turn.content.length < 1 || turn.content.length > MAX_TURN_CHARS) {
      return bad(`Each history turn needs content of 1 to ${MAX_TURN_CHARS} characters`);
    }
    history.push({ role: turn.role, content: turn.content });
  }

  return { ok: true, value: { symbol, name, range: range as Range, fromTime, toTime, stats, question, history } };
}

// ---- The upstream request ----

/** Daily bars are stamped at the session open, so a time of day says nothing about them. */
const isDailyRange = (range: Range) => range === "6mo" || range === "1y"; // mirrors the provider's interval table

const etDate = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });
const longDate = (seconds: number) => etDate.format(new Date(seconds * 1000));

function contextBlock(req: ContextRequest): string {
  const figures = formatFigures(req.stats);
  const clock = { time: !isDailyRange(req.range), year: true };
  return [
    "Context for the question. These are the same figures the user sees on screen; do not recompute them.",
    `Symbol: ${req.symbol}`,
    `Name: ${req.name}`,
    "Time zone: America/New_York",
    `Window start: ${formatEt(req.stats.start, clock)}${clock.time ? " ET" : ""}`,
    `Window end: ${formatEt(req.stats.end, clock)}${clock.time ? " ET" : ""}`,
    `Bars in window: ${figures.barCount}`,
    `Open: ${figures.open}`,
    `Close: ${figures.close}`,
    `Change: ${figures.change}`,
    `High: ${figures.high}`,
    `Low: ${figures.low}`,
    `Volume: ${figures.volume}`,
  ].join("\n");
}

/** The selected window the way the panel shows it: dates only for daily bars, with the time zone otherwise. */
function windowLabel(req: ContextRequest): string {
  const clock = { time: !isDailyRange(req.range) };
  return `${formatEt(req.stats.start, clock)} – ${formatEt(req.stats.end, clock)}${clock.time ? " ET" : ""}`;
}

function upstreamBody(req: ContextRequest, model: string) {
  const from = longDate(req.stats.start);
  const to = longDate(req.stats.end);
  return {
    model,
    stream: true,
    max_tokens: MAX_TOKENS,
    reasoning: { effort: "low" },
    plugins: [
      {
        id: "web",
        engine: "parallel",
        mode: SEARCH_MODE,
        max_results: WEB_RESULTS,
        search_prompt: `News and market commentary about ${req.symbol} (${req.name}) published between ${from} and ${to} (US Eastern):`,
      },
    ],
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextBlock(req) },
      ...req.history,
      // The last user message is what the search is run on: it must name the ticker and the dates whichever chip was clicked.
      // Ticker and dates first: the search runs on this message, and leading with them pulled dated news (A/B 2026-10-17: 5-6 in-window dates vs 1-2).
      { role: "user", content: `${req.symbol} (${req.name}) stock news from ${from} to ${to}, US Eastern. ${req.question}` },
    ],
  };
}

function statusMessage(status: number): string {
  if (status === 401 || status === 403) return "The chat service did not accept the server's credentials.";
  if (status === 402) return "The chat service has no credit left.";
  if (status === 429) return "The chat service is busy. Try again shortly.";
  return "The chat service is unavailable. Try again shortly.";
}

// ---- Relaying the stream ----

interface Source {
  url: string;
  title: string;
}

/** A url_citation annotation as a link the browser may follow: http(s) only, with a readable title. */
function toSource(annotation: unknown): Source | null {
  if (!isRecord(annotation) || annotation.type !== "url_citation" || !isRecord(annotation.url_citation)) return null;
  const { url, title } = annotation.url_citation;
  if (typeof url !== "string") return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const label = typeof title === "string" ? title.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  return { url: parsed.href, title: label || parsed.hostname };
}

type Send = (event: "delta" | "sources" | "done" | "error", data: unknown) => Promise<void>;

interface Relayed {
  text: string;
  sources: Source[];
  failed: boolean;
  /** OpenRouter's own words for a failure reported inside the stream: for the alert only, never for the browser. */
  errorMessage?: string;
  errorCode?: number;
}

/** Reads OpenRouter's SSE body line by line, forwarding content deltas as they arrive. */
async function relay(body: ReadableStream<Uint8Array>, send: Send): Promise<Relayed> {
  const out: Relayed = { text: "", sources: [], failed: false };
  const seen = new Set<string>();
  const collect = (annotations: unknown) => {
    if (!Array.isArray(annotations)) return;
    for (const annotation of annotations) {
      const source = toSource(annotation);
      if (source && !seen.has(source.url)) {
        seen.add(source.url);
        out.sources.push(source);
      }
    }
  };

  /** Returns true when the upstream said it is finished. */
  const handleLine = async (line: string): Promise<boolean> => {
    if (!line.startsWith("data:")) return false; // comments (": OPENROUTER PROCESSING"), event names, blanks
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") return true;
    let chunk: unknown;
    try {
      chunk = JSON.parse(payload);
    } catch {
      return false;
    }
    if (!isRecord(chunk)) return false;
    if (chunk.error) {
      out.failed = true;
      if (isRecord(chunk.error)) {
        if (typeof chunk.error.message === "string") out.errorMessage = chunk.error.message;
        if (typeof chunk.error.code === "number") out.errorCode = chunk.error.code;
      }
      return true;
    }
    const choice = Array.isArray(chunk.choices) && isRecord(chunk.choices[0]) ? chunk.choices[0] : undefined;
    if (!choice) return false;
    const delta = isRecord(choice.delta) ? choice.delta : undefined;
    // `reasoning` deltas are the model thinking aloud: never shown.
    if (delta && typeof delta.content === "string" && delta.content) {
      out.text += delta.content;
      await send("delta", { text: delta.content });
    }
    collect(delta?.annotations);
    collect(isRecord(choice.message) ? choice.message.annotations : undefined); // the final, non-delta shape
    if (choice.finish_reason === "error") {
      out.failed = true;
      return true;
    }
    return false;
  };

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (await handleLine(line)) return out;
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) await handleLine(buffer.replace(/\r$/, ""));
  } finally {
    void reader.cancel().catch(() => {});
  }
  return out;
}

/** OpenRouter's own error text from a failed response (`{ error: { message } }`), or "" when there is none. */
async function readUpstreamError(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const timer = setTimeout(() => void reader.cancel().catch(() => {}), ERROR_BODY_TIMEOUT_MS);
  try {
    const decoder = new TextDecoder();
    let text = "";
    while (text.length < ERROR_BODY_MAX_CHARS) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    const parsed: unknown = JSON.parse(text);
    const error = isRecord(parsed) ? parsed.error : undefined;
    if (typeof error === "string") return error;
    return isRecord(error) && typeof error.message === "string" ? error.message : "";
  } catch {
    return ""; // not JSON, cut short, or timed out
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => {});
  }
}

/** Why a fetch failed, for the alert: the system error code when there is one, never the message (it can name the URL). */
function fetchErrorLabel(err: unknown): string {
  if (err instanceof Error && isRecord(err.cause) && typeof err.cause.code === "string") return err.cause.code;
  return err instanceof Error ? err.name : "error";
}

/** Asks the model and relays its answer; reports every way that can end without one. */
async function answerQuestion(stream: SSEStreamingApi, { chat, alerts }: ChatDeps, req: ContextRequest): Promise<void> {
  const send: Send = (event, data) => stream.writeSSE({ event, data: JSON.stringify(data) });
  const fail = (message: string) => send("error", { message });
  /** Tells Daniel; runs on its own and never holds up or breaks the answer. */
  const alert = (failure: Pick<ChatFailure, "kind" | "status" | "message">) =>
    void alerts.chatFailure({ ...failure, symbol: req.symbol, window: windowLabel(req), redact: [req.question] });
  const cancel = new AbortController();
  stream.onAbort(() => cancel.abort()); // the browser went away: stop spending

  let upstream: Response;
  try {
    upstream = await fetch(`${chat.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${chat.key}`, "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(upstreamBody(req, chat.model || DEFAULT_MODEL)),
      signal: AbortSignal.any([cancel.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
    });
  } catch (err) {
    if (cancel.signal.aborted) return;
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    console.error(`context: upstream request ${timedOut ? "timed out" : "failed"}`);
    alert({ kind: timedOut ? "timeout" : "network", message: fetchErrorLabel(err) });
    await fail(timedOut ? "The chat service took too long to answer. Try again." : "Could not reach the chat service. Try again shortly.");
    return;
  }

  if (!upstream.ok || !upstream.body) {
    console.error(`context: upstream HTTP ${upstream.status}`);
    alert({ kind: "http", status: upstream.status, message: await readUpstreamError(upstream) });
    await fail(statusMessage(upstream.status));
    return;
  }

  let relayed: Relayed;
  try {
    relayed = await relay(upstream.body, send);
  } catch (err) {
    if (cancel.signal.aborted) return;
    console.error(`context: upstream stream broke (${err instanceof Error ? err.name : "error"})`);
    alert({ kind: "stream", message: fetchErrorLabel(err) });
    await fail("The answer was interrupted. Try again.");
    return;
  }
  if (relayed.failed) {
    console.error("context: upstream reported an error in the stream");
    alert({ kind: "stream", status: relayed.errorCode, message: relayed.errorMessage });
    await fail("The chat service stopped partway through the answer. Try again.");
    return;
  }
  if (!relayed.text.trim()) {
    alert({ kind: "empty" });
    await fail("The model returned an empty answer. Try again.");
    return;
  }
  if (relayed.sources.length > 0) await send("sources", { items: relayed.sources });
  await send("done", {});
}

function streamAnswer(c: Context, deps: ChatDeps, req: ContextRequest, release: () => void): Response {
  return streamSSE(c, async (stream) => {
    try {
      await answerQuestion(stream, deps, req);
    } finally {
      release(); // success, failure or the browser leaving: the place in the queue is free again
    }
  });
}

/** Who is asking, for a per-client limit: the address Cloudflare saw. The Node server's limiter ignores it. */
const clientOf = (c: Context) => c.req.header("CF-Connecting-IP") ?? "unknown";

export function createContextHandler(deps: ChatDeps) {
  return async function contextHandler(c: Context): Promise<Response> {
    const text = await c.req.text();
    if (text.length > MAX_BODY_CHARS) return c.json({ error: "Request body is too large" }, 400);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return c.json({ error: "Request body must be valid JSON" }, 400);
    }
    const parsed = parseRequest(raw);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);

    if (!deps.chat.key) return c.json({ error: NO_KEY_MESSAGE }, 503);

    // Only a question that is about to call the model counts against the limits.
    let admission: Admission;
    try {
      admission = await deps.limiter.admit(clientOf(c));
    } catch (err) {
      console.error(`context: rate limiter unavailable (${err instanceof Error ? err.name : "error"})`);
      return c.json({ error: LIMITER_DOWN_MESSAGE }, 503);
    }
    if (!admission.ok) {
      c.header("Retry-After", String(admission.retryAfterSeconds));
      return c.json({ error: admission.message }, 429);
    }
    return streamAnswer(c, deps, parsed.value, admission.release);
  };
}
