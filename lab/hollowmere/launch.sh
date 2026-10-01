#!/bin/bash
# One-click Hollowmere launcher (repo copy): deps → build → serve → open.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin:$PATH"
PORT=5917
URL="http://127.0.0.1:$PORT"

if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  npm install --no-audit --no-fund || exit 1
fi

if [ ! -f dist/index.html ] || [ -n "$(find src index.html -newer dist/index.html -type f 2>/dev/null | head -1)" ]; then
  npm run build || exit 1
fi

if ! lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  nohup node scripts/serve.mjs dist >/tmp/hollowmere-serve.log 2>&1 &
  for _ in $(seq 1 30); do
    curl -fs "$URL/__alive" >/dev/null 2>&1 && break
    sleep 0.1
  done
fi

CHROME="/Applications/Google Chrome.app"
if [ -d "$CHROME" ]; then
  open -na "Google Chrome" --args --app="$URL" --user-data-dir="$HOME/.hollowmere-chrome" \
    --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required
else
  open "$URL"
fi
