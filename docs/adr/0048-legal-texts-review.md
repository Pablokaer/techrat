# ADR-0048: Review of the privacy policy and terms, and the end of the draft banner

**Status:** Accepted · Closes the review left open by ADR-0033 (backups, log retention and Irish legal basis)

## Context

The privacy policy, the terms and the account-deletion page were written from the code and carried a "draft pending
legal review" banner (`LEGAL.draft`), because Google Play rejects placeholder policies and ADR-0033 asked for a
solicitor's review. On 2026-11-06 the owner asked for the review to be done by the coding agent instead and accepted that
it is a compliance review against the rules below, **not legal advice from a lawyer**.

## Review

Checked against the GDPR (articles 13, 21, 22, 77), Irish law (controller in Ireland, DPC, digital age of consent 16),
Brazil's LGPD (the app is offered in Brazilian Portuguese, so article 3 applies), EU consumer law (unfair terms, Rome I
article 6), the Digital Services Act (TechRat hosts names, bios and photos that other learners see) and Google Play's
User Data and Account Deletion policies. Every statement about how the product works was already checked against the
code (`docs/play-store/data-safety.md`).

What changed, in both languages:

- **Privacy policy:** which data is needed to create an account (GDPR 13(2)(e)); the legal basis for showing learners to
  each other; no automated decisions with legal or significant effects, adaptive practice only picks the next question
  (13(2)(f)); Google Play as a separate controller; Resend's transfer relies on its EU-U.S. Data Privacy Framework
  certification (it used to point vaguely at "the safeguards of its data processing agreement"); a complaint to the
  authority where you live or work (77); a new section 12 for Brazil: LGPD bases (art. 7, V and IX), rights (art. 18),
  access within 15 days, the international transfer (art. 33, IX) and the ANPD; replies in English or Portuguese.
- **Terms:** how to report illegal content (DSA art. 16), a statement of reasons and a review when content or an account
  is restricted (DSA art. 17 and 20 in spirit), 30 days' notice of material changes with the option to leave (instead of
  "using it afterwards means you accept"), consumers keep the mandatory law of the country they live in (EU, UK,
  Brazil), and the contact email is the single point of contact for users and authorities (DSA art. 11 and 12).
- `LEGAL.draft` is `false` and `effectiveDate` is 2026-11-06. The banner comes back if it is set to `true`.

## Residual risks the owner accepted

- **No lawyer has read the texts.** Have them reviewed when the service grows, takes money or becomes a company.
- **No geographic address** is published. The EU e-commerce rules (Irish S.I. 68/2003) ask an online service provider for
  one; the policy gives only the name, Ireland and an email. Add a business or correspondence address to `LEGAL` when one
  exists.
- **Brazil's ECA Digital** (Law 15.211/2025, minors online) was not analysed in depth: TechRat is for people aged 16 or
  over with no age check, and teenagers of 16 and 17 in Brazil are minors under it.
- **Processes behind the promises:** reports of content, statements of reasons, LGPD and GDPR requests and deletion by
  email depend on the contact mailbox being read.

## Consequences

- The pages are final for the Google Play review. Any later change to a legal text sets `LEGAL.draft` back to `true` until
  it is reviewed, and the tests in `apps/web/src/__tests__/legal-pages.test.tsx` pin what the review added.
