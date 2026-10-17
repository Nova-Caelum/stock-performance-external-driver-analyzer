// The Node entry: local development and the specs. `./scripts/start.sh` loads the secrets from BWS and runs this.
// The routes are server/app.ts, the same ones the Cloudflare Worker (server/worker.ts) serves.
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAlerts, memoryThrottle } from "./alerts.js";
import { BASE_PATH, createApp } from "./app.js";
import { DEFAULT_OPENROUTER_BASE_URL } from "./context.js";
import { getProvider } from "./providers/index.js";
import { limiterFromEnv } from "./ratelimit.js";
import { createSearch } from "./search.js";

/** Vite's output: the client sits in the base-path folder, so request paths map straight onto files. */
const CLIENT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/client");
const CLIENT_INDEX = `${BASE_PATH.slice(1)}/index.html`;

function startup() {
  try {
    const port = Number(process.env.PORT ?? 3200);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid PORT "${process.env.PORT}". Use a number from 1 to 65535.`);
    }
    return { provider: getProvider(process.env.MARKET_PROVIDER), port };
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

const { provider, port } = startup();
const key = process.env.OPENROUTER_API_KEY ?? "";
const search = createSearch();
const app = createApp({
  provider,
  chat: { key, baseUrl: process.env.OPENROUTER_BASE_URL ?? DEFAULT_OPENROUTER_BASE_URL, model: process.env.OPENROUTER_MODEL },
  limiter: limiterFromEnv(process.env),
  alerts: createAlerts({
    token: process.env.TELEGRAM_BOT_TOKEN ?? "",
    chatId: process.env.TELEGRAM_CHAT_ID ?? "",
    apiBase: process.env.TELEGRAM_API_BASE,
    secrets: [key],
    throttle: memoryThrottle(),
  }),
  search,
});

app.get("/", (c) => c.redirect(`${BASE_PATH}/`, 301));

// The API also answers at its address from before the base path, /api/*, for local tools and scripts.
app.all("/api/*", (c) => {
  const url = new URL(c.req.url);
  url.pathname = `${BASE_PATH}${url.pathname}`;
  return app.fetch(new Request(url, c.req.raw), c.env);
});

if (existsSync(path.join(CLIENT_ROOT, CLIENT_INDEX))) {
  app.use(`${BASE_PATH}/*`, serveStatic({ root: CLIENT_ROOT }));
  app.get(`${BASE_PATH}/*`, serveStatic({ root: CLIENT_ROOT, path: CLIENT_INDEX })); // SPA fallback
}

serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
  console.log(`market-context-dashboard server on http://127.0.0.1:${info.port}${BASE_PATH}/ (provider: ${provider.id})`);
  search.warm(); // fetch the SEC ticker list in the background for the typo fallback
});
