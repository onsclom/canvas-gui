#!/usr/bin/env bash
# Launch a headless Chrome with a CDP port for scripts/shot.ts.
# Usage: bash scripts/chrome.sh [port]   (default 9222)
PORT="${1:-9222}"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
rm -rf "/tmp/cdp-profile-$PORT"
exec "$CHROME" --headless=new --disable-gpu --no-sandbox \
  --remote-debugging-port="$PORT" \
  --user-data-dir="/tmp/cdp-profile-$PORT" \
  --no-first-run --no-default-browser-check --mute-audio about:blank
