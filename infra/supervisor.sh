#!/usr/bin/env bash
# Mantiene vivo el servidor durante la demo: si el proceso termina, lo vuelve a arrancar en 1 s.
# Los móviles se reconectan solos con su token y conservan los puntos.
# Uso: VISOR_KEY=<clave> BOTS=15 UI=sim bash infra/supervisor.sh [script]   (por defecto sim/server.js)
# Ojo: VISOR_KEY tiene que ir fijada; si no, cada reinicio genera una clave nueva.
set -u
SCRIPT="${1:-sim/server.js}"
cd "$(dirname "$0")/.."
[ -n "${VISOR_KEY:-}" ] || { echo "Falta VISOR_KEY" >&2; exit 1; }
while true; do
  node "$SCRIPT"
  echo "[supervisor] $(date +%T) el servidor terminó (código $?); reinicio en 1 s" >&2
  sleep 1
done
