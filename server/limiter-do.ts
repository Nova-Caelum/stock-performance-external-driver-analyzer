// The chat's limits on Cloudflare, shared by every isolate of the Worker: one Durable Object instance (SQLite-backed)
// holds the per-client minute windows, the US-Eastern day's count and when each kind of alert last went out.
//
// The rules are the Node limiter's (server/ratelimit.ts), keyed per client for the minute: at most `perMinute`
// questions a minute from one address, at most `perDay` a day from everyone. A refused question is not counted, and
// refusals carry the same Retry-After and the same words. Each method runs synchronously against SQLite with no
// await inside, so it is atomic with respect to every other request to the object.
import { DurableObject } from "cloudflare:workers";
import type { AlertThrottle, FailureKind } from "./alerts.js";
import { DAY_MESSAGE, MINUTE_MS, etDay, secondsToMidnightEt, tryAgain, type ChatLimiter as Limiter, type Limits, type Refusal } from "./ratelimit.js";

const INSTANCE = "global";

export class ChatLimiter extends DurableObject<unknown> {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS minute_window (client TEXT PRIMARY KEY, opened INTEGER NOT NULL, count INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS day_count (day TEXT PRIMARY KEY, count INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS alert_sent (kind TEXT PRIMARY KEY, at INTEGER NOT NULL);
    `);
  }

  /** Counts the question and answers null, or answers why it is refused. */
  admit(client: string, { perMinute, perDay }: Limits): Refusal | null {
    const sql = this.ctx.storage.sql;
    const t = Date.now();

    const today = etDay(t);
    sql.exec("DELETE FROM day_count WHERE day <> ?", today);
    const [day] = sql.exec<{ count: number }>("SELECT count FROM day_count WHERE day = ?", today).toArray();
    if ((day?.count ?? 0) >= perDay) {
      return { ok: false, reason: "day", retryAfterSeconds: secondsToMidnightEt(t), message: DAY_MESSAGE };
    }

    sql.exec("DELETE FROM minute_window WHERE opened <= ?", t - MINUTE_MS); // windows that have closed
    const [window] = sql.exec<{ opened: number; count: number }>("SELECT opened, count FROM minute_window WHERE client = ?", client).toArray();
    if (window && window.count >= perMinute) {
      const seconds = Math.ceil((window.opened + MINUTE_MS - t) / 1000);
      return { ok: false, reason: "minute", retryAfterSeconds: seconds, message: tryAgain(seconds) };
    }

    if (window) sql.exec("UPDATE minute_window SET count = count + 1 WHERE client = ?", client);
    else sql.exec("INSERT INTO minute_window (client, opened, count) VALUES (?, ?, 1)", client, t);
    sql.exec("INSERT INTO day_count (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1", today);
    return null;
  }

  /** True when no alert of this kind went out in the last `windowMs`; records this one as sent. */
  claimAlert(kind: FailureKind, windowMs: number): boolean {
    const sql = this.ctx.storage.sql;
    const t = Date.now();
    const [last] = sql.exec<{ at: number }>("SELECT at FROM alert_sent WHERE kind = ?", kind).toArray();
    if (last && t - last.at < windowMs) return false;
    sql.exec("INSERT INTO alert_sent (kind, at) VALUES (?, ?) ON CONFLICT(kind) DO UPDATE SET at = excluded.at", kind, t);
    return true;
  }

  /** Forgets a claimed alert that was not delivered, so the next failure may try again. */
  releaseAlert(kind: FailureKind): void {
    this.ctx.storage.sql.exec("DELETE FROM alert_sent WHERE kind = ?", kind);
  }
}

/**
 * The app's limiter and alert throttle, backed by the one shared instance. A failed call to the object rejects:
 * the chat route turns that into 503 (fail closed), the alert sender into no alert.
 */
export function sharedLimits(namespace: DurableObjectNamespace<ChatLimiter>, limits: Limits): { limiter: Limiter; throttle: AlertThrottle } {
  const stub = () => namespace.getByName(INSTANCE);
  return {
    limiter: {
      async admit(client) {
        const refusal = await stub().admit(client, limits);
        return refusal ?? { ok: true, release() {} }; // nothing to release: answers in flight are not counted here
      },
    },
    throttle: {
      claim: (kind, windowMs) => stub().claimAlert(kind, windowMs),
      release: (kind) => stub().releaseAlert(kind),
    },
  };
}
