#!/usr/bin/env bash
# Daily backup of the TechRat database (see docs/deploy.md, "Backups"). Installed in cron by deploy/deploy.sh.
#
#   backup.sh
#
# Writes a compressed pg_dump to $BACKUP_DIR (outside the repository, readable by root only) and deletes the dumps older
# than $RETENTION_DAYS. The privacy policy states this period, so change both together. Nothing is deleted unless the new
# dump was written and checked: a failing database never costs the older backups. The .env file (with the key-ring
# certificate) is deliberately NOT included: a backup of the database alone must not be enough to forge a session (ADR-0029).
#
# Overridable: TECHRAT_DIR, BACKUP_DIR, RETENTION_DAYS.
set -euo pipefail
partial=""

main() {
  local app_dir="${TECHRAT_DIR:-/opt/techrat}"
  local dir="${BACKUP_DIR:-/opt/techrat-backups}"
  local retention="${RETENTION_DAYS:-14}"
  if [[ ! "$retention" =~ ^[0-9]+$ || "$retention" -lt 1 ]]; then
    echo "backup: RETENTION_DAYS must be a whole number of days, got '$retention'" >&2
    return 2
  fi

  umask 077
  mkdir -p "$dir"
  chmod 700 "$dir"
  cd "$app_dir"

  local name final
  name="techrat-$(date -u +%Y-%m-%dT%H%M%SZ).sql.gz"
  final="$dir/$name"
  partial="$final.partial"   # global: the EXIT trap runs after main's locals are gone
  trap '[[ -z "$partial" ]] || rm -f "$partial"' EXIT

  docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U techrat techrat | gzip > "$partial"
  # gzip of an empty stream is still ~20 bytes: check that something real came out and that the archive is intact.
  if ! gzip -t "$partial" || [[ -z "$(gzip -dc "$partial" | head -c 1)" ]]; then
    echo "backup: the dump is empty or corrupt, nothing was saved" >&2
    return 1
  fi
  mv "$partial" "$final"
  echo "backup: wrote $final ($(wc -c < "$final") bytes)"

  find "$dir" -maxdepth 1 -name 'techrat-*.sql.gz' -type f -mtime "+$((retention - 1))" -print -delete \
    | sed 's/^/backup: deleted /'
}

main "$@"
