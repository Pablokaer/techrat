#!/usr/bin/env bash
# Production deploy of TechRat on the VPS (see docs/deploy.md).
#
#   deploy.sh [<commit sha>]
#
# Run by GitHub Actions over SSH after CI passes on main: the deploy key in /root/.ssh/authorized_keys is restricted to
# this script (forced command), so the requested commit arrives in SSH_ORIGINAL_COMMAND. It can also be run by hand,
# without a sha, to deploy the tip of main.
#
# Steps: fetch origin/main, check out the commit (only if it is still the tip of main, so an older CI run finishing
# late never overwrites a newer deploy), rebuild the stack, wait until the API and the web answer, prune the old
# TechRat images. If the new version is not healthy, the previous commit is checked out and rebuilt, and the script
# fails. The untracked .env (production secrets) is never touched.
#
# Overridable for tests: TECHRAT_DIR, LOG_FILE, HEALTH_URLS, HEALTH_RETRIES, HEALTH_INTERVAL.
set -euo pipefail

main() {
  local app_dir="${TECHRAT_DIR:-/opt/techrat}"
  local log_file="${LOG_FILE:-/var/log/techrat-deploy.log}"
  local health_urls="${HEALTH_URLS:-http://127.0.0.1:5080/health/ready http://127.0.0.1:3000/}"
  local retries="${HEALTH_RETRIES:-60}" interval="${HEALTH_INTERVAL:-5}"
  local compose=(docker compose -f docker-compose.prod.yml)

  local requested="${1:-${SSH_ORIGINAL_COMMAND:-}}"
  requested="${requested//[[:space:]]/}"
  if [[ -n "$requested" && ! "$requested" =~ ^[0-9a-f]{40}$ ]]; then
    echo "deploy: expected a full commit sha, got '${1:-${SSH_ORIGINAL_COMMAND:-}}'" >&2
    return 2
  fi

  exec > >(tee -a "$log_file") 2>&1
  cd "$app_dir"

  # One deploy at a time (two pushes in a row).
  if command -v flock >/dev/null; then
    exec 9>"$app_dir/.deploy.lock"
    flock 9
  fi

  echo "=== deploy $(date -u +%FT%TZ) requested=${requested:-<tip of main>}"
  git fetch --quiet origin main
  local tip previous
  tip="$(git rev-parse origin/main)"
  previous="$(git rev-parse HEAD)"
  if [[ -n "$requested" && "$requested" != "$tip" ]]; then
    echo "deploy: $requested is not the tip of main ($tip); a newer deploy will follow. Skipping."
    return 0
  fi

  git reset --quiet --hard "$tip"
  echo "deploy: $previous -> $tip"
  ensure_dataprotection_cert "$app_dir/.env"
  if "${compose[@]}" up -d --build --remove-orphans && healthy "$health_urls" "$retries" "$interval"; then
    docker image prune -f --filter "label=com.docker.compose.project=techrat" >/dev/null || true
    echo "deploy: OK $tip"
    return 0
  fi

  echo "deploy: new version is unhealthy, rolling back to $previous"
  git reset --quiet --hard "$previous"
  "${compose[@]}" up -d --build --remove-orphans || true
  return 1
}

# The login keys stored in PostgreSQL are encrypted with a certificate that lives in .env, outside the database (ADR-0029).
# The first deploy that finds none creates it; it is never replaced afterwards (losing it signs everybody out). A failure
# here must not block a deploy: the API then runs as before and logs a warning.
ensure_dataprotection_cert() {
  local env_file="$1" script="deploy/new-dataprotection-cert.sh"
  [[ -f "$env_file" && -f "$script" ]] || return 0
  if grep -Eq '^DATAPROTECTION_CERT_BASE64=.+' "$env_file"; then return 0; fi
  echo "deploy: creating the Data Protection certificate in $env_file"
  bash "$script" "$env_file" || echo "deploy: warning: could not create the Data Protection certificate; the API will warn at start" >&2
}

# Waits until every URL answers 2xx.
healthy() {
  local urls="$1" retries="$2" interval="$3" url
  for ((i = 1; i <= retries; i++)); do
    local ok=1
    for url in $urls; do
      curl -fsS -o /dev/null --max-time 5 "$url" || { ok=0; break; }
    done
    if ((ok)); then return 0; fi
    sleep "$interval"
  done
  echo "deploy: health check failed after $retries attempts" >&2
  return 1
}

# The whole file is parsed before running, so the git reset above can safely replace this script mid-deploy.
main "$@"; exit $?
