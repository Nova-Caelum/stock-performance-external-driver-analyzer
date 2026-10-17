// Limits on POST /api/context, the only route that spends money: questions per minute, questions per day (the day
// ends at midnight US Eastern), and how many answers may be streaming at once. In memory, for this server process:
// the Node entry's limiter. On Cloudflare the same limits are kept for every isolate by server/limiter-do.ts, which
// takes its day arithmetic and its refusal messages from here, so both answer a refused question in the same words.
//
// `admit()` is asked once per question that passed validation and is about to call the model. A refused question
// is not counted, so being refused never uses up the allowance.

export interface LimiterOptions {
  perMinute: number;
  perDay: number;
  maxInFlight: number;
  /** Milliseconds since the epoch; replaced in tests. */
  now?: () => number;
}

export type Refusal = { ok: false; reason: "minute" | "day" | "busy"; retryAfterSeconds: number; message: string };

export type Admission =
  | { ok: true; /** Call when the answer has finished, failed or been abandoned. Safe to call twice. */ release: () => void }
  | Refusal;

/** What the chat route asks before calling the model. `client` identifies the asker; a limiter may ignore it. */
export interface ChatLimiter {
  admit(client: string): Admission | Promise<Admission>;
}

export interface Limits {
  perMinute: number;
  perDay: number;
}

/** The configuration the limits are read from. */
type LimitVars = { CHAT_LIMIT_PER_MINUTE?: string; CHAT_LIMIT_PER_DAY?: string };

const DEFAULT_PER_MINUTE = 6;
const DEFAULT_PER_DAY = 200;
const MAX_IN_FLIGHT = 2;

export const MINUTE_MS = 60_000;
const BUSY_RETRY_SECONDS = 5;
export const DAY_MESSAGE = "Too many questions today — the daily limit is reached; it resets at midnight ET.";

const etDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
export const etDay = (ms: number) => etDate.format(ms); // "2026-10-17"

/** Whole seconds until the Eastern date changes. Searches for the change, so a 23- or 25-hour day is counted as it is. */
export function secondsToMidnightEt(nowMs: number): number {
  const today = etDay(nowMs);
  let same = nowMs; // still `today`
  let later = nowMs + 26 * 3_600_000; // a different date: no day is longer than 25 hours
  while (later - same > 1) {
    const middle = Math.floor((same + later) / 2);
    if (etDay(middle) === today) same = middle;
    else later = middle;
  }
  return Math.max(1, Math.ceil((later - nowMs) / 1000));
}

export const tryAgain = (seconds: number) => `Too many questions right now — try again in ${seconds} ${seconds === 1 ? "second" : "seconds"}.`;

export function createLimiter({ perMinute, perDay, maxInFlight, now = Date.now }: LimiterOptions) {
  let windowStart = 0; // when the current minute window opened (at its first counted question)
  let windowCount = 0;
  let day = "";
  let dayCount = 0;
  let inFlight = 0;

  return {
    admit(): Admission {
      const t = now();

      const today = etDay(t);
      if (today !== day) {
        day = today;
        dayCount = 0;
      }
      if (dayCount >= perDay) {
        return { ok: false, reason: "day", retryAfterSeconds: secondsToMidnightEt(t), message: DAY_MESSAGE };
      }

      const windowOpen = windowCount > 0 && t - windowStart < MINUTE_MS;
      if (windowOpen && windowCount >= perMinute) {
        const seconds = Math.ceil((windowStart + MINUTE_MS - t) / 1000);
        return { ok: false, reason: "minute", retryAfterSeconds: seconds, message: tryAgain(seconds) };
      }

      if (inFlight >= maxInFlight) {
        return { ok: false, reason: "busy", retryAfterSeconds: BUSY_RETRY_SECONDS, message: tryAgain(BUSY_RETRY_SECONDS) };
      }

      if (windowOpen) windowCount++;
      else {
        windowStart = t;
        windowCount = 1;
      }
      dayCount++;
      inFlight++;
      let released = false;
      return {
        ok: true,
        release() {
          if (released) return;
          released = true;
          inFlight--;
        },
      };
    },
  };
}

/** A whole number of at least 1; anything else (unset, "abc", "0", "-4") is the default. */
function limitFrom(raw: string | undefined, fallback: number): number {
  const text = (raw ?? "").trim();
  return /^\d+$/.test(text) && Number(text) >= 1 ? Number(text) : fallback;
}

/** CHAT_LIMIT_PER_MINUTE (default 6) and CHAT_LIMIT_PER_DAY (default 200). */
export function limitsFromEnv(env: LimitVars): Limits {
  return {
    perMinute: limitFrom(env.CHAT_LIMIT_PER_MINUTE, DEFAULT_PER_MINUTE),
    perDay: limitFrom(env.CHAT_LIMIT_PER_DAY, DEFAULT_PER_DAY),
  };
}

/** The Node server's limiter: the limits from `env`, two answers at once. */
export function limiterFromEnv(env: LimitVars, now?: () => number) {
  return createLimiter({ ...limitsFromEnv(env), maxInFlight: MAX_IN_FLIGHT, now });
}
