#!/usr/bin/env bash
# Expone el servidor local con un Cloudflare Quick Tunnel y pinta el QR.
# Uso: npm run tunnel            (puerto 3000)
#      PORT=4000 npm run tunnel
# Límite conocido: 200 peticiones en vuelo por túnel (luego responde 429).
set -euo pipefail

PORT="${PORT:-3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$(mktemp -t tunnel.XXXXXX)"

command -v cloudflared >/dev/null || { echo "Falta cloudflared: brew install cloudflared" >&2; exit 1; }

curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1 \
  || echo "Aviso: no responde nada en localhost:${PORT} (¿npm run smoke?)" >&2

cloudflared tunnel --no-autoupdate --url "http://localhost:${PORT}" >"$LOG" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null; rm -f "$LOG"' EXIT INT TERM

URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)"
  [ -n "$URL" ] && break
  kill -0 $PID 2>/dev/null || { cat "$LOG" >&2; exit 1; }
  sleep 0.5
done
[ -n "$URL" ] || { echo "No se obtuvo URL del túnel:" >&2; cat "$LOG" >&2; exit 1; }

echo "$URL" > "$ROOT/infra/.tunnel-url"
echo
echo "  URL pública: $URL"
echo
node -e "require('qrcode').toString(process.argv[1], { type: 'terminal', small: true }).then(console.log)" "$URL"
echo "  Ctrl+C para cerrar el túnel."
wait $PID
