# Email delivery (SMTP)

TechRat sends transactional email: the link that confirms a new account (sign-in needs it, so email must work for sign-up), password resets and security notices. The API speaks plain SMTP
(MailKit), so any provider with SMTP works. Locally, Docker Compose uses **Mailpit** (http://localhost:8025): every email is
captured there and nothing leaves your machine.

## 1. Choose a provider

| Provider | Free tier (check current pricing) | SMTP host | Port / security | Username / password |
|---|---|---|---|---|
| [Resend](https://resend.com/docs/send-with-smtp) | small monthly free tier | `smtp.resend.com` | 587 `StartTls` or 465 `SslOnConnect` | `resend` / API key |
| [Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html) | pay per email; starts in a sandbox | `email-smtp.<region>.amazonaws.com` | 587 `StartTls` or 465 `SslOnConnect` | SMTP credentials generated in SES |
| [Brevo](https://developers.brevo.com/docs/smtp-integration) | daily free quota | `smtp-relay.brevo.com` | 587 `StartTls` | account login / SMTP key |

Resend is the quickest to set up for a single product domain. SES is the cheapest at volume (request production access to
leave the sandbox, which only delivers to verified addresses).

## 2. Verify your domain (DNS)

Send from your own domain (e.g. `no-reply@yourdomain.com`), never from a free mailbox. In the provider's dashboard add the
domain and create the DNS records it shows at your domain registrar:

- **SPF** (TXT): authorises the provider to send for the domain.
- **DKIM** (TXT or CNAME): signs every message; the provider generates the keys.
- **DMARC** (TXT on `_dmarc.yourdomain.com`): start with `v=DMARC1; p=none; rua=mailto:you@yourdomain.com`, move to
  `p=quarantine` once reports look clean.

Wait until the provider shows the domain as verified. Without these records most messages land in spam or are rejected.

## 3. Configure the API

Set these in the `.env` next to `docker-compose.yml` on the server (never commit it):

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURITY=StartTls          # StartTls (587) | SslOnConnect (465) | None (local Mailpit only)
SMTP_USERNAME=resend
SMTP_PASSWORD=re_xxxxxxxxxxxx   # provider API key / SMTP password
SMTP_FROM=TechRat <no-reply@yourdomain.com>
SMTP_REPLY_TO=support@yourdomain.com   # optional
```

Also make sure `App__PublicWebUrl` points to the public web address (password-reset links use it). Then restart the API:
`docker compose up -d api`.

TLS is mandatory unless `SMTP_SECURITY=None`: if the server doesn't offer STARTTLS the send fails instead of falling back to
plain text. Outbound port 25 is often blocked on VPS providers — use 587 or 465.

## 4. Test

Sign in as an admin and use **Admin → Send test email** (or `POST /api/v1/admin/email/test` with an optional
`{"to": "you@example.com"}`; by default it goes to the signed-in admin). The API answers:

- `204` — accepted by the SMTP server; check the inbox (and spam folder).
- `409` — SMTP is not configured (`SMTP_HOST` empty).
- `502` — the server rejected the message or could not be reached; the response and the API log contain the SMTP error.

Then try a real flow: **Forgot password** on the sign-in page. The reset email arrives in the language of the request.

## Behaviour and safety

- Every email has an HTML and a plain-text part.
- `POST /auth/forgot-password` always answers `202`, whether the account exists or delivery failed, so it never reveals
  which emails are registered. Delivery failures are logged (never the reset link or code).
- Without `SMTP_HOST` the API logs "SMTP is not configured" and skips sending.
