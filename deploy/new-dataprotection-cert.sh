#!/usr/bin/env bash
# Creates the certificate that encrypts the ASP.NET Core Data Protection key ring and writes it into an env file.
#
#   new-dataprotection-cert.sh [env-file] [--force]
#
# The key ring signs and encrypts login cookies and tokens and lives in PostgreSQL. Without a certificate it is plain
# XML there, so a leaked database backup could be used to forge a session for any account (ADR-0029). The certificate
# stays in the env file (never in the database), so a leaked backup alone is useless.
#
# Writes DATAPROTECTION_CERT_BASE64 (a PFX, base64) and DATAPROTECTION_CERT_PASSWORD (random) into the env file
# (default ./.env), keeping every other line, with mode 600. Never prints either value. Refuses to replace an existing
# certificate unless --force is given: replacing it makes the keys already stored unreadable and signs everybody out.
#
# deploy.sh runs this once, on the first deploy that finds no certificate in the server's .env.
set -euo pipefail

# Git Bash on Windows would turn "/CN=..." into a path.
export MSYS_NO_PATHCONV=1

work=""   # global: the EXIT trap runs after main's locals are gone

usage() {
  echo "Usage: $0 [env-file] [--force]" >&2
}

main() {
  local env_file=".env" force=0 arg
  for arg in "$@"; do
    case "$arg" in
      --force) force=1 ;;
      -*) usage; return 2 ;;
      *) env_file="$arg" ;;
    esac
  done

  command -v openssl >/dev/null || { echo "new-dataprotection-cert: openssl is required" >&2; return 1; }
  if ((! force)) && [[ -f "$env_file" ]] && grep -Eq '^DATAPROTECTION_CERT_BASE64=.+' "$env_file"; then
    echo "new-dataprotection-cert: $env_file already has a certificate; replacing it would make the stored keys unreadable (use --force to do it anyway)" >&2
    return 1
  fi

  local dir password b64 out
  dir="$(dirname "$env_file")"
  work="$(mktemp -d)"
  trap 'rm -rf "${work:-}"' EXIT

  password="$(openssl rand -base64 24)"
  # Relative names inside the work directory: a native openssl.exe (Git Bash on Windows) does not understand /tmp paths.
  (
    cd "$work"
    openssl req -x509 -newkey rsa:3072 -nodes -keyout key.pem -out cert.pem -days 3650 -subj "/CN=techrat-dataprotection" 2>/dev/null
    openssl pkcs12 -export -inkey key.pem -in cert.pem -out dp.pfx -password "pass:$password"
  )
  b64="$(base64 < "$work/dp.pfx" | tr -d '\n')"

  # Rewritten next to the target so the final step is a rename; every line except the two certificate settings is kept.
  out="$(mktemp "$dir/.env.XXXXXX")"
  {
    if [[ -f "$env_file" ]]; then
      grep -Ev '^DATAPROTECTION_CERT_(BASE64|PASSWORD)=' "$env_file" || true
    fi
    printf 'DATAPROTECTION_CERT_BASE64=%s\n' "$b64"
    printf 'DATAPROTECTION_CERT_PASSWORD=%s\n' "$password"
  } > "$out"
  chmod 600 "$out"
  mv "$out" "$env_file"

  echo "Data Protection certificate written to $env_file ($(cd "$work" && openssl x509 -in cert.pem -noout -fingerprint -sha256))."
}

main "$@"
