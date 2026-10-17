#!/usr/bin/env bash
# Local convenience: loads the app's own OpenRouter key and the alert bot's Telegram token and chat id from Bitwarden
# Secrets Manager (BWS) into the server process only, builds the client, and serves the Node server on
# http://127.0.0.1:${PORT:-3200}/marketforces-dashboard/.
#
# The BWS entry ids come from the environment, not from this file:
#   MCD_BWS_OPENROUTER_ID      the entry named Stock_Analyzer_OPENROUTERKEY (the app's own key, with a spending cap)
#   MCD_BWS_TELEGRAM_TOKEN_ID  the alert bot's token
#   MCD_BWS_TELEGRAM_CHAT_ID   the chat the alerts go to
# A value already in OPENROUTER_API_KEY / TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID is used as it is.
set -euo pipefail
cd "$(dirname "$0")/.."

# Entry ids are not secrets, values are and are never printed.
OPENROUTER_ENTRY_ID="${MCD_BWS_OPENROUTER_ID:-}"
OPENROUTER_ENTRY_NAME="Stock_Analyzer_OPENROUTERKEY"
TELEGRAM_TOKEN_ENTRY_ID="${MCD_BWS_TELEGRAM_TOKEN_ID:-}"
TELEGRAM_CHAT_ENTRY_ID="${MCD_BWS_TELEGRAM_CHAT_ID:-}"

# bws_value <what it is> <entry id> [required key name]: the entry's value on stdout. On failure, one plain line on stderr.
bws_value() {
  /usr/bin/python3 - "$1" "$2" "${3:-}" <<'PYVAL'
import json
import shutil
import subprocess
import sys

what, entry_id, required_name = sys.argv[1:4]
bws = shutil.which("bws")
if not bws:
    sys.exit(f"BWS CLI is required to load the {what}.")
# --color no: bws emits ANSI-coloured JSON when FORCE_COLOR or CLICOLOR_FORCE is set (test runners set it), which breaks json.loads.
result = subprocess.run([bws, "--color", "no", "secret", "get", entry_id], capture_output=True, text=True)
if result.returncode:
    sys.exit(f"Could not retrieve the {what} from BWS. Check BWS authentication.")
try:
    secret = json.loads(result.stdout)
    if (required_name and secret.get("key") != required_name) or not secret.get("value"):
        raise ValueError("Unexpected credential")
except (ValueError, AttributeError):
    sys.exit(f"BWS returned an invalid {what} credential record.")
sys.stdout.write(secret["value"])
PYVAL
}

key="${OPENROUTER_API_KEY:-}"
if [[ -z "$key" ]]; then
  if [[ -z "$OPENROUTER_ENTRY_ID" ]]; then
    echo "Set MCD_BWS_OPENROUTER_ID to the BWS entry id of $OPENROUTER_ENTRY_NAME (or set OPENROUTER_API_KEY)." >&2
    exit 1
  fi
  key="$(bws_value "OpenRouter API key" "$OPENROUTER_ENTRY_ID" "$OPENROUTER_ENTRY_NAME")"
fi

# Alerts are optional: without the bot token or the chat id the app still starts, and says so.
telegram_token="${TELEGRAM_BOT_TOKEN:-}"
telegram_chat="${TELEGRAM_CHAT_ID:-}"
if [[ -z "$telegram_token" || -z "$telegram_chat" ]]; then
  if [[ -n "$TELEGRAM_TOKEN_ENTRY_ID" && -n "$TELEGRAM_CHAT_ENTRY_ID" ]] \
    && telegram_token="$(bws_value "Telegram bot token" "$TELEGRAM_TOKEN_ENTRY_ID" 2>/dev/null)" \
    && telegram_chat="$(bws_value "Telegram chat id" "$TELEGRAM_CHAT_ENTRY_ID" 2>/dev/null)"; then
    :
  else
    telegram_token=""
    telegram_chat=""
    echo "Telegram alerts are off: the bot token or chat id could not be read from BWS."
  fi
fi

# The server needs only the OpenRouter key and the alert credentials, never the BWS access token.
unset BWS_ACCESS_TOKEN

corepack pnpm build

echo "Stock Performance – Driver Analysis: http://127.0.0.1:${PORT:-3200}/marketforces-dashboard/"
# Inline assignment: the credentials reach the server process only, not the build or this shell's exports.
OPENROUTER_API_KEY="$key" TELEGRAM_BOT_TOKEN="$telegram_token" TELEGRAM_CHAT_ID="$telegram_chat" exec corepack pnpm start
