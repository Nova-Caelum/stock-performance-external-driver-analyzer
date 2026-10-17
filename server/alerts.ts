// A Telegram message to Daniel when a chat call does not produce an answer, through the DevOps-Lead bot.
//
// The token and chat id come from the server's configuration (scripts/start.sh loads them from BWS for the Node
// server; on Cloudflare they are Worker secrets) and are used only to send: neither appears in the message, in a log
// line, or in /api/health (which reports a boolean). With either missing, nothing is sent. A failure to send is
// logged as one plain line and never reaches the chat response.
//
// At most one message per kind of failure every 15 minutes. The throttle is passed in: in memory for the Node server,
// the shared Durable Object on Cloudflare, so isolates do not each send their own.
import { formatEt } from "../src/lib/stats.js";

export type FailureKind = "http" | "network" | "timeout" | "stream" | "empty";

export interface ChatFailure {
  kind: FailureKind;
  /** HTTP status (or the code in an error event), when there is one. */
  status?: number;
  symbol: string;
  /** The selected window as the panel shows it, e.g. "Mon 5 Oct 9:30 AM – Wed 7 Oct 3:30 PM ET". */
  window: string;
  /** OpenRouter's own error text when it gave any, otherwise a short code for what went wrong. Cut and scrubbed here. */
  message?: string;
  /** Text that must never leave the server in an alert, such as the user's question. */
  redact?: readonly string[];
}

const DEFAULT_API_BASE = "https://api.telegram.org";
const THROTTLE_MS = 15 * 60_000;
const SEND_TIMEOUT_MS = 5_000;
const MAX_DETAIL_CHARS = 200;
const MAX_TEXT_CHARS = 600;
const MIN_REDACTED_CHARS = 4;

/** Decides whether an alert of a kind may go out now. */
export interface AlertThrottle {
  /** True when no alert of this kind went out in the last `windowMs`; records this one as sent. */
  claim(kind: FailureKind, windowMs: number): boolean | Promise<boolean>;
  /** Forgets a claimed alert that was not delivered, so the next failure may try again. */
  release(kind: FailureKind): void | Promise<void>;
}

export interface AlertsConfig {
  token: string;
  chatId: string;
  /** Telegram's API, replaced in tests. */
  apiBase?: string;
  /** Values that must never appear in a message, such as the OpenRouter key. */
  secrets?: readonly string[];
  throttle: AlertThrottle;
}

export interface Alerts {
  /** Whether a bot token and a chat id are configured. */
  readonly enabled: boolean;
  /** Tells Daniel a chat call failed. Resolves to whether a message was sent; never rejects, so callers may `void` it. */
  chatFailure(failure: ChatFailure): Promise<boolean>;
}

/** The throttle for one process: a map of when each kind was last sent. */
export function memoryThrottle(): AlertThrottle {
  const lastSent = new Map<FailureKind, number>();
  return {
    claim(kind, windowMs) {
      const now = Date.now();
      const previous = lastSent.get(kind);
      if (previous !== undefined && now - previous < windowMs) return false;
      lastSent.set(kind, now); // before the send, so two failures at once send one message
      return true;
    },
    release(kind) {
      lastSent.delete(kind);
    },
  };
}

/** OpenRouter's error text with the request, the key and the bot token taken out, on one line, at most 200 characters. */
function scrubDetail(raw: string, secrets: readonly string[]): string {
  if (/"(messages|plugins)"\s*:/.test(raw)) return ""; // the request body echoed back: none of it leaves
  let text = raw;
  for (const secret of secrets) {
    if (secret.length >= MIN_REDACTED_CHARS) text = text.split(secret).join("[redacted]");
  }
  return text
    .replace(/sk-or-[\w-]*/gi, "[key]")
    .replace(/Bearer\s+\S+/gi, "[credential]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DETAIL_CHARS);
}

function composeText(failure: ChatFailure, detail: string): string {
  const status = failure.status ? ` ${failure.status}` : "";
  const hint = failure.status === 402 ? " — key spending cap reached?" : "";
  const when = `${formatEt(Date.now() / 1000)} ET`;
  const head = `Stock Analyzer: chat call failed — ${failure.kind}${status} · ${failure.symbol} ${failure.window} · ${when}${hint}`;
  return (detail ? `${head}\nDetail: ${detail}` : head).slice(0, MAX_TEXT_CHARS);
}

async function send(apiBase: string, token: string, chatId: string, text: string): Promise<boolean> {
  const base = apiBase.replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    void res.body?.cancel().catch(() => {}); // the reply can echo the request URL, which holds the token: never read
    if (res.ok) return true;
    console.error(`alerts: Telegram send failed (HTTP ${res.status})`);
  } catch (err) {
    // The error's message and cause can name the URL; only its class is logged.
    console.error(`alerts: Telegram send failed (${err instanceof Error ? err.name : "error"})`);
  }
  return false;
}

export function createAlerts({ token, chatId, apiBase, secrets = [], throttle }: AlertsConfig): Alerts {
  const enabled = Boolean(token && chatId);
  return {
    enabled,
    async chatFailure(failure) {
      try {
        if (!enabled || !(await throttle.claim(failure.kind, THROTTLE_MS))) return false;
        const detail = scrubDetail(failure.message ?? "", [...(failure.redact ?? []), token, ...secrets]);
        const sent = await send(apiBase || DEFAULT_API_BASE, token, chatId, composeText(failure, detail));
        if (!sent) await throttle.release(failure.kind); // nothing was delivered, so the next failure may try again
        return sent;
      } catch {
        return false; // a throttle that cannot be reached means no alert, never a broken chat response
      }
    },
  };
}
