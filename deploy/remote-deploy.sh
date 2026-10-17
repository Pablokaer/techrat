#!/usr/bin/env bash
# Starts the production deploy from GitHub Actions (.github/workflows/deploy.yml, see docs/deploy.md).
#
#   remote-deploy.sh [<commit sha>]
#
# Connects with the deploy key, whose forced command on the server runs deploy/deploy.sh with the sha. Some runners
# could not reach the SSH port at all: the connection timed out after two minutes while the site stayed up, and a re-run
# from another runner worked. So a failed connection is retried a few times with a short timeout. Exit codes:
#   0    deployed, or skipped by deploy.sh because a newer commit is already on main
#   75   the server never answered this runner (its IP is printed): the workflow tries again from a fresh runner
#   any other: ssh refused the key or host, or deploy.sh failed and rolled back; retrying would not help
#
# Environment: VPS_HOST, VPS_SSH_KEY, VPS_KNOWN_HOSTS (repository secrets).
# Overridable for tests: SSH_ATTEMPTS, SSH_RETRY_DELAY, SSH_CONNECT_TIMEOUT, PUBLIC_IP_URL.
set -euo pipefail

main() {
  local sha="${1:-}"
  local attempts="${SSH_ATTEMPTS:-3}" delay="${SSH_RETRY_DELAY:-15}" connect_timeout="${SSH_CONNECT_TIMEOUT:-20}"
  : "${VPS_HOST:?VPS_HOST is not set}"

  local dir
  dir="$(mktemp -d)"
  # Expanded now: the trap runs after main has returned, when the local no longer exists.
  # shellcheck disable=SC2064
  trap "rm -rf -- '$dir'" EXIT
  printf '%s\n' "${VPS_SSH_KEY:?VPS_SSH_KEY is not set}" > "$dir/key"
  chmod 600 "$dir/key"
  printf '%s\n' "${VPS_KNOWN_HOSTS:?VPS_KNOWN_HOSTS is not set}" > "$dir/known_hosts"

  local attempt code
  for ((attempt = 1; attempt <= attempts; attempt++)); do
    code=0
    ssh -i "$dir/key" -o IdentitiesOnly=yes -o UserKnownHostsFile="$dir/known_hosts" -o StrictHostKeyChecking=yes \
      -o BatchMode=yes -o ConnectTimeout="$connect_timeout" "root@$VPS_HOST" "$sha" 2>"$dir/stderr" || code=$?
    cat "$dir/stderr" >&2
    # 255 is ssh's own failure; only a connection that never got through is worth another try.
    if [[ $code -ne 255 ]] || ! grep -qE 'connect to host|Connection (timed out|refused|reset|closed)|kex_exchange_identification' "$dir/stderr"; then
      return "$code"
    fi
    echo "remote-deploy: attempt $attempt of $attempts could not reach the server" >&2
    if ((attempt < attempts)); then sleep "$delay"; fi
  done

  local ip
  ip="$(curl -fsS -m 10 "${PUBLIC_IP_URL:-https://api.ipify.org}" 2>/dev/null || echo "unknown")"
  echo "remote-deploy: the server's SSH port never answered this runner (public IP $ip)" >&2
  return 75
}

main "$@"
