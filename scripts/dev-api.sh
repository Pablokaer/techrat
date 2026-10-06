#!/usr/bin/env bash
# Starts the API locally in the background (Development), writing its PID to .dev/api.pid. Use `scripts/dev-api.sh stop` to stop it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/.dev"
PIDFILE="$ROOT/.dev/api.pid"
if [[ "${1:-start}" == "stop" ]]; then
  [[ -f "$PIDFILE" ]] && kill "$(cat "$PIDFILE")" 2>/dev/null || true
  rm -f "$PIDFILE"; exit 0
fi
cd "$ROOT/backend"
dotnet build TechRat.Api -v quiet -nologo >/dev/null
(cd TechRat.Api && ASPNETCORE_ENVIRONMENT=Development exec nohup dotnet bin/Debug/net10.0/TechRat.Api.dll --urls "${API_URLS:-http://localhost:5080}" > "$ROOT/.dev/api.log" 2>&1) &
echo $! > "$PIDFILE"
for _ in $(seq 1 60); do curl -sf http://localhost:5080/health/ready >/dev/null && { echo "API ready (pid $(cat "$PIDFILE"))"; exit 0; }; sleep 1; done
echo "API did not become ready; see .dev/api.log"; exit 1
