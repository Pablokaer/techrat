/**
 * The ONE place for the legal identity of the service. The privacy policy, the terms, the account-deletion page and the
 * footer all read from here: change the values below and every page follows (in both languages).
 */
export const LEGAL = {
  // TODO(owner): confirm the legal name of the company or person that operates TechRat (and add a postal address if required).
  companyName: "TechRat",
  // TODO(owner): confirm this mailbox exists and is monitored; it is the contact for privacy requests and for people who cannot sign in.
  contactEmail: "privacy@techrat.io",
  // TODO(owner): set the date the reviewed policy is published (ISO yyyy-mm-dd).
  effectiveDate: "2026-10-08",
  /**
   * While true, the privacy policy, the terms and the account-deletion page show a banner saying they are a draft that
   * still needs legal review, so nobody publishes them unnoticed. Set to false only after the review, once every
   * TODO(legal) marker in the messages has been resolved.
   */
  draft: true,
};

export type LegalInfo = typeof LEGAL;
