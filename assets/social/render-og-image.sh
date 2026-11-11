#!/usr/bin/env bash
# Renders assets/social/<name>.html to <name>.png (1200x630) with headless Chrome.
#   assets/social/render-og-image.sh            # og-image (home and blog)
#   assets/social/render-og-image.sh praxis-og  # /praxis
set -euo pipefail
cd "$(dirname "$0")/../.."
name="${1:-og-image}"
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
port=8769
python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1 &
server=$!
trap 'kill "$server"' EXIT
sleep 1
"$chrome" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=5000 \
  --screenshot="$PWD/assets/social/$name.png" \
  "http://127.0.0.1:$port/assets/social/$name.html"
