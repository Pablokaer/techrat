# ADR-0033: Automatic backups, log retention and the Irish legal basis of the policies

**Status:** Accepted

## Context

The privacy policy and terms were drafts with `TODO` markers for facts the code could not prove: how long backups and logs
are kept, which providers host and send data, the minimum age, the applicable law. The repository only suggested a manual
`pg_dump`, so there was nothing true to write. The owner (an individual living in Ireland) confirmed: hosting on a
Hostinger VPS, email through Resend's European region (Ireland), no wish for a complicated age gate.

## Decision

- **Daily backup, 14 days.** `deploy/backup.sh` writes a compressed `pg_dump` to `/opt/techrat-backups` (outside the
  repository, root only) and deletes dumps older than 14 days, but only after the new dump was written, is a valid non-empty
  archive. A failing database never costs the older backups. `.env` (the key-ring certificate) is not in the dump on
  purpose (ADR-0029). Every deploy installs `/etc/cron.d/techrat` with the job (rewritten only when it changes; a failure
  never blocks a deploy), so no manual server step is needed.
- **Log retention.** Containers log to rotating files of 3 x 10 MB each (`docker-compose.prod.yml`); the same cron file
  deletes Apache `techrat-*.log*` files not written for 30 days, which with the package's weekly logrotate means at most
  about 40 days per entry.
- **The policy states exactly these facts** (14 days, 40 days, Hostinger, Resend in Ireland) in both languages; the tests
  assert them, so changing a period means changing the policy too.
- **Irish law.** The operator is an individual in Ireland, so the policy relies on the GDPR and the Data Protection Act
  2018: contract and legitimate interest as legal bases (no consent needed for the core service), rights answered within
  one month, complaints to the Data Protection Commission, Irish governing law with the mandatory consumer protection of
  the user's own EU country preserved.
- **Minimum age 16.** The age of digital consent in Ireland is 16. An educational purpose does not lift it: under 16 the
  parent's authorisation is needed wherever consent is the basis, and a child cannot normally enter a contract. 16 is the
  simple, safe answer; it is one line in each language if a lawyer advises otherwise. There is still no technical age check.

## Consequences

- Backups live on the same server: they protect against mistakes and a corrupted database, not against losing the
  server. Copy them elsewhere or enable the Hostinger VPS backups (documented in `docs/deploy.md`).
- Deleted accounts remain in backups for up to 14 days; the policy says so.
- The server is in Manchester, United Kingdom: outside the EEA but covered by the European Commission's adequacy decision
  for the UK, so the policy states no extra safeguard for it (revisit if the decision is withdrawn or the server moves).
- Still open: a review by a solicitor, then `LEGAL.draft = false`.
