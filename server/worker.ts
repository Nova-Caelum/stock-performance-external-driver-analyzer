// The Cloudflare Worker entry: the app at /marketforces-dashboard on caelos.app and novacaelum.com (wrangler.jsonc).
//
// Requests reach this code only where the assets router sends them (`assets.run_worker_first`): the API, the bare
// base path (301 to the trailing slash), and paths under the base path that match no built file. Every built file
// is served by Cloudflare straight from the assets directory, dist/client, whose marketforces-dashboard/ folder
// mirrors the URLs.
import { createAlerts } from "./alerts.js";
import { BASE_PATH, createApp } from "./app.js";
import { DEFAULT_OPENROUTER_BASE_URL } from "./context.js";
import { ChatLimiter, sharedLimits } from "./limiter-do.js";
import { getProvider } from "./providers/index.js";
import { limitsFromEnv } from "./ratelimit.js";
import { createSearch, fetchSecTickers, SEC_TICKERS_URL } from "./search.js";

export { ChatLimiter }; // the Durable Object class must be exported by the Worker's main module

interface Env {
  ASSETS: Fetcher;
  CHAT_LIMITER: DurableObjectNamespace<ChatLimiter>;
  // Secrets (wrangler secret put; .dev.vars locally).
  OPENROUTER_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  // Plain vars (wrangler.jsonc).
  OPENROUTER_BASE_URL?: string;
  OPENROUTER_MODEL?: string;
  CHAT_LIMIT_PER_MINUTE?: string;
  CHAT_LIMIT_PER_DAY?: string;
  MARKET_PROVIDER?: string;
}

const SEC_CACHE_SECONDS = 24 * 60 * 60;

/** The SEC list, kept a day in this data centre's cache so a cold isolate does not download it again. */
async function cachedSecTickers(): Promise<Response> {
  const cache = caches.default;
  const hit = await cache.match(SEC_TICKERS_URL).catch(() => undefined);
  if (hit) return hit;
  const res = await fetchSecTickers();
  if (!res.ok) return res;
  const body = await res.arrayBuffer();
  const headers = { "Content-Type": "application/json", "Cache-Control": `max-age=${SEC_CACHE_SECONDS}` };
  await cache.put(SEC_TICKERS_URL, new Response(body, { headers })).catch(() => {}); // no cache: fetched again next time
  return new Response(body, { headers });
}

/** A path under the base path with no file extension is a client view; anything else that reached here is missing. */
const isClientView = (pathname: string) => !/\.[^/]*$/.test(pathname);

function build(env: Env) {
  const key = env.OPENROUTER_API_KEY ?? "";
  const { limiter, throttle } = sharedLimits(env.CHAT_LIMITER, limitsFromEnv(env));
  const app = createApp({
    provider: getProvider(env.MARKET_PROVIDER),
    chat: { key, baseUrl: env.OPENROUTER_BASE_URL || DEFAULT_OPENROUTER_BASE_URL, model: env.OPENROUTER_MODEL },
    limiter,
    alerts: createAlerts({ token: env.TELEGRAM_BOT_TOKEN ?? "", chatId: env.TELEGRAM_CHAT_ID ?? "", secrets: [key], throttle }),
    search: createSearch(cachedSecTickers),
  });
  // SPA fallback: the client's index.html for any view under the base path.
  app.get(`${BASE_PATH}/*`, (c) => (isClientView(new URL(c.req.url).pathname) ? env.ASSETS.fetch(new URL(`${BASE_PATH}/`, c.req.url)) : c.notFound()));
  return app;
}

let app: ReturnType<typeof build> | undefined; // one per isolate: its caches and the Yahoo session live as long as it does

export default {
  fetch(request, env, ctx) {
    app ??= build(env);
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
