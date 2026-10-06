#!/usr/bin/env bash
# Regenerates packages/types from the backend's OpenAPI document so clients never hand-copy contracts.
# Usage: scripts/generate-api-client.sh   (requires the .NET SDK and npm install at the repo root)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${OPENAPI_PORT:-5099}"

pushd "$ROOT/backend" >/dev/null
dotnet build TechRat.Api -c Release -v quiet -nologo
ASPNETCORE_ENVIRONMENT=Production \
ConnectionStrings__Postgres="Host=127.0.0.1;Database=openapi;Username=x;Password=x" \
Outbox__Enabled=false Database__MigrateOnStartup=false \
dotnet run --project TechRat.Api -c Release --no-build --urls "http://127.0.0.1:$PORT" >/dev/null 2>&1 &
API_PID=$!
popd >/dev/null
trap 'kill $API_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$PORT/openapi/v1.json" -o "$ROOT/packages/types/openapi.json" && break
  sleep 1
done
test -s "$ROOT/packages/types/openapi.json"

cd "$ROOT"
npx openapi-typescript packages/types/openapi.json -o packages/types/src/schema.d.ts
echo "Generated packages/types/src/schema.d.ts"
