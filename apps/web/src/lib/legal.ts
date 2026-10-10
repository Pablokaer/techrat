/**
 * The ONE place for the legal identity of the service. The privacy policy, the terms, the account-deletion page and the
 * footer all read from here: change the values below and every page follows (in both languages).
 */
export const LEGAL = {
  // The operator is an individual based in Ireland (confirmed by the owner); the policy gives the email as the contact.
  companyName: "Pablo Carvalho",
  // Contact for privacy requests and for people who cannot sign in (confirmed by the owner).
  contactEmail: "pablo.luan.carvalho@gmail.com",
  // Update this date when a reviewed version is published (ISO yyyy-mm-dd).
  effectiveDate: "2026-10-10",
  /**
   * While true, the privacy policy, the terms and the account-deletion page show a banner saying they are a draft that
   * still needs legal review, so nobody publishes them unnoticed. Set to false only after the review, once every
   * TODO(legal) marker in the messages has been resolved.
   */
  draft: true,
};

export type LegalInfo = typeof LEGAL;
