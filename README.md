# Stock Performance - External Driver Analyzer

A stock watchlist with live price charts. Drag across any stretch of a chart and ask what drove it: the answer comes from dated web news for that window, with its sources linked. Built by Nova Caelum as a client demo on the Caelos design system.

**Proof of concept, not for trading.** Market data comes from Yahoo Finance, a keyless, unofficial source that is rate limited and not licensed for commercial use. Nothing here is investment advice.

Live:

- https://caelos.app/marketforces-dashboard/
- https://novacaelum.com/marketforces-dashboard/

## How it is built

- `src/`: the React 19 client, built by Vite with base path `/marketforces-dashboard/` into `dist/client/marketforces-dashboard/`.
- `server/app.ts`: the API (Hono), shared by two entries:
  - `server/worker.ts`: the Cloudflare Worker that serves the live site. Path routes on `caelos.app/marketforces-dashboard*` and `novacaelum.com/marketforces-dashboard*` send the app's paths to it and leave the rest of both sites alone. Built files are served from the Worker's static assets; the Worker answers the API.
  - `server/index.ts`: a Node server for local development.
- `server/limiter-do.ts`: a Durable Object that keeps the chat's rate limits for every Worker instance at once.
- `vendor/nova-caelum-ui/`: a compiled build of Nova Caelum's design system, included so the demo builds (see its `NOTICE.md`).

The chat calls `deepseek/deepseek-v4.1-flash` through OpenRouter with the `web` plugin (Parallel engine, `turbo` mode, 6 results). The OpenRouter key stays on the server and never reaches the browser.

## Cost controls

`POST /marketforces-dashboard/api/context` is the only route that spends money. A question over a limit gets HTTP 429 with a `Retry-After` header and a sentence the panel shows as it is:

- At most `CHAT_LIMIT_PER_MINUTE` questions a minute from one client, and at most `CHAT_LIMIT_PER_DAY` a day from everyone (the day ends at midnight US Eastern). A refused question does not use up the allowance.
- On Cloudflare the counts live in the Durable Object, so every Worker instance sees the same ones. If the Durable Object cannot be reached, the chat answers 503 "Chat is temporarily unavailable." rather than run without limits.
- The Node server for local development keeps the same limits in its own memory (its minute limit counts every client together) and streams at most 2 answers at once.

A chat call that produces no answer sends one plain-text Telegram alert, at most once per kind of failure every 15 minutes. The alert never carries the key, the bot token, the request or the question. With the Telegram secrets unset, alerts are off and `/api/health` reports `alerts: false`.

## Secrets

Set these as Worker secrets (`corepack pnpm exec wrangler secret put <NAME>`, value on stdin) and, for local development, in `.dev.vars` (copy `.dev.vars.example`). They are never in this repository.

| Name | Required | Meaning |
|---|---|---|
| `OPENROUTER_API_KEY` | yes | The app's own OpenRouter key; give it a spending cap. Without it the chat answers 503 and prices still work. |
| `TELEGRAM_BOT_TOKEN` | no | The bot that sends failure alerts. |
| `TELEGRAM_CHAT_ID` | no | The chat the alerts go to. |

The deploy workflow needs two GitHub repository secrets: `CLOUDFLARE_API_TOKEN` (a token that can deploy Workers and edit Worker routes on both zones) and `CLOUDFLARE_ACCOUNT_ID`.

## Configuration

Plain settings live in `wrangler.jsonc` under `vars` (and in the environment for the Node server):

| Variable | Default | Meaning |
|---|---|---|
| `CHAT_LIMIT_PER_MINUTE` | `6` | Questions one client may ask per minute. A whole number of 1 or more; anything else is the default. |
| `CHAT_LIMIT_PER_DAY` | `200` | Questions everyone together may ask per US-Eastern day. Same rule. |
| `OPENROUTER_MODEL` | `deepseek/deepseek-v4.1-flash` | The model the chat asks. |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter's API. Changed only by tests. |
| `MARKET_PROVIDER` | `yahoo` | `yahoo` or `schwab`. `schwab` is a stub that answers 501 "not configured". |

## Local development

Needs Node 22 and pnpm through Corepack.

```sh
corepack pnpm install
cp .dev.vars.example .dev.vars   # then put a real OpenRouter key in it
corepack pnpm build
corepack pnpm dev:worker         # the Worker on the local Cloudflare runtime: http://localhost:8787/marketforces-dashboard/
```

Or the Node server, with Vite's dev server in front of it:

```sh
OPENROUTER_API_KEY=... corepack pnpm dev    # http://localhost:5173/marketforces-dashboard/
```

`scripts/start.sh` is a convenience for machines with the Bitwarden Secrets Manager CLI (`bws`): it reads the key and the Telegram credentials from the BWS entries named by `MCD_BWS_OPENROUTER_ID`, `MCD_BWS_TELEGRAM_TOKEN_ID` and `MCD_BWS_TELEGRAM_CHAT_ID`, builds the client and serves it on http://127.0.0.1:3200/marketforces-dashboard/.

## Test

```sh
corepack pnpm typecheck   # the client, the Node server and the specs; then the Worker against Cloudflare's runtime types
corepack pnpm test        # Playwright specs; each writes a PASS/FAIL file to $EVIDENCE_DIR (default ./evidence)
```

The specs use fake OpenRouter and Telegram servers and call real Yahoo and the SEC ticker list. `tests/e2e/worker-local.spec.ts` runs the Worker under `wrangler dev` and checks the pages, the data routes and the rate limit there. The one end-to-end check that asks the real model is opt-in: `WHOLE_PATH=1 corepack pnpm exec playwright test tests/e2e/whole-path.spec.ts`.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: install, typecheck, build, `wrangler deploy`. A run that fails before the deploy step changes nothing on Cloudflare. To deploy by hand: `corepack pnpm build && corepack pnpm exec wrangler deploy`.

## Rights

Source visible, all rights reserved. © Nova Caelum. No licence is granted to use, copy, modify or redistribute this code or the Caelos design system.
