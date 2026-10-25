#!/usr/bin/env bash
# Renders assets/social/og-image.html to og-image.png (1200x630) with headless Chrome.
set -euo pipefail
cd "$(dirname "$0")/../.."
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
port=8769
python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1 &
server=$!
trap 'kill "$server"' EXIT
sleep 1
"$chrome" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=5000 \
  --screenshot="$PWD/assets/social/og-image.png" \
  "http://127.0.0.1:$port/assets/social/og-image.html"
