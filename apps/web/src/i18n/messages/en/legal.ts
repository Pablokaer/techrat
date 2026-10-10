import type { LegalInfo } from "@/lib/legal";

/** A block of a legal document: a heading followed by paragraphs, a bullet list and closing paragraphs. */
export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
  closing?: string[];
}

export interface LegalDocument {
  intro: string[];
  sections: LegalSection[];
}

/*
 * Privacy policy, terms and the public account-deletion page (and the links to them).
 *
 * Text written as {{TODO(legal): …}} / {{TODO(owner): …}} marks a fact the code cannot prove. The renderer highlights it
 * and keeps the "TODO" visible on purpose, so the draft cannot be published unnoticed. Resolve every marker (and set
 * LEGAL.draft to false in lib/legal.ts) only after legal review; keep the pt-BR file in step.
 * Facts here come from the code: see docs/play-store/data-safety.md for the evidence behind each statement.
 */
export const legal = {
  footer: {
    label: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    deleteAccount: "Delete account",
  },
  page: {
    home: "TechRat home",
    signIn: "Sign in",
    updated: (date: string) => `Last updated: ${date}`,
    contactLabel: "Contact",
  },
  draft: {
    title: "Draft: pending legal review",
    text: "This text was prepared from how the product works today and has not been reviewed by a lawyer yet. Items marked TODO still need to be confirmed before this page is published as final.",
  },
  consent: {
    before: "By creating an account you agree to the ",
    terms: "Terms of Service",
    and: " and the ",
    privacy: "Privacy Policy",
    after: ".",
  },
  meta: {
    privacy: { title: "Privacy Policy", description: "What personal data TechRat collects, why, who can see it, how long it is kept and how to delete it." },
    terms: { title: "Terms of Service", description: "The rules for using TechRat: accounts, acceptable use, content, availability and termination." },
    accountDelete: { title: "Delete your account", description: "How to permanently delete your TechRat account and data from the app or from the web, what is deleted and what is not kept." },
  },
  accountDelete: {
    title: "Delete your TechRat account",
    lead: "You can delete your TechRat account and its data at any time, from the Android app or from this page. You do not need the app.",
    howHeading: "How to delete your account",
    steps: [
      "Sign in to your account.",
      "Press “Delete my account” and read what will be deleted.",
      "Confirm with your password. If your account has no password, type your username instead.",
    ],
    inApp: "In the Android app: open Profile, then Delete account.",
    deletedHeading: "What is deleted",
    deletedIntro: "Everything tied to your account is deleted from our database:",
    keptHeading: "What is not kept",
    kept: [
      "Nothing about you stays in the application: the account is removed, not just hidden.",
      "Learning content (questions, topics and roadmaps) is not personal data and is not affected.",
      "Server logs may keep a random internal account identifier (no name and no email) until the logs expire. Web server access logs are deleted after at most 40 days; application logs are overwritten as their size-limited files rotate.",
    ],
    timingHeading: "How long it takes",
    timing: [
      "Deletion is immediate and irreversible. Every session ends at once and we send a confirmation to the email address of the account.",
      "Database backups made before the deletion may still contain your data until they expire: backups are made daily and deleted automatically after 14 days.",
    ],
    signedOutHeading: "Sign in to continue",
    signedOutText: "You must be signed in so that only you can delete your account.",
    signInToDelete: "Sign in to delete your account",
    cannotSignIn: (email: string) => `Cannot sign in any more? Write to ${email} from the email address of the account and ask us to delete it.`,
    checking: "Checking your session…",
  },
  privacyPage: (l: LegalInfo): LegalDocument => ({
    intro: [
      `${l.companyName} (“TechRat”, “we”) runs the TechRat learning platform: the website at techrat.io and the TechRat Android app. This policy explains what personal data we collect, why, who can see it, how long we keep it and what you can do about it. The controller of your personal data is ${l.companyName}, an individual based in Ireland, reachable at ${l.contactEmail}.`,
    ],
    sections: [
      {
        heading: "1. Data we collect",
        paragraphs: ["Account data you give us:"],
        items: [
          "Email address, username and display name (optional: it defaults to your username).",
          "Password. We never store it in plain text: only a salted hash made by ASP.NET Core Identity.",
          "A short bio (up to 280 characters) and a profile photo, both optional. The photo is cropped and resized on your device before it is uploaded.",
          "When the account was created and when you last signed in.",
        ],
        closing: [
          "Learning data created by using the app: your answers and attempts (the option you chose, whether it was correct, time spent), practice sessions, daily challenges, XP, levels, streaks, achievements, topic, roadmap and module progress, and the notifications shown inside the app.",
          "Technical data: your language choice (stored on your device), and the IP address and browser identification that any web server sees. The IP address is used to limit abusive requests and appears in our web server access logs. Application logs keep the method, route, status code, duration and your internal user identifier, never message bodies, passwords, tokens or email addresses.",
          "We do not collect your location, contacts, advertising or device identifiers, date of birth or payment information, and the app does not use analytics, advertising or tracking SDKs.",
        ],
      },
      {
        heading: "2. How we use it",
        items: [
          "To run your account and sign you in securely.",
          "To save your progress, award XP and achievements, adapt the difficulty of practice to your accuracy and show leaderboards.",
          "To send the service emails described below.",
          "To protect the service: rate limiting, account lockout after repeated wrong passwords and fixing errors.",
        ],
        closing: [
          "We do not sell your data, do not show advertising and do not use your data to train advertising profiles. Our legal bases under the GDPR are the contract with you (your account, your progress and the emails that make them work) and our legitimate interest in keeping the service secure (rate limits, lockouts and logs). We do not rely on your consent for these.",
        ],
      },
      {
        heading: "3. What other learners can see",
        items: [
          "Leaderboards (visible only to signed-in users) show your username, display name, profile photo, level, XP, questions answered and accuracy.",
          "In Settings, Privacy, you can turn off “Show me on the leaderboards” to stay out of every leaderboard. Your progress and XP are kept.",
          "A signed-in learner who opens your profile page sees your display name, username, photo, bio, member-since date, level, XP, streaks, accuracy, topic and roadmap progress, achievements and recent daily activity. Turning off the leaderboards does not currently hide this profile page.",
          "Your email address is never shown to other learners.",
          "Your profile photo is served from a web address that does not require signing in. The address contains a random internal identifier and is not listed anywhere, but anyone who has the link can open it.",
        ],
        closing: ["TechRat administrators can see your email, username, display name, level, XP, number of answers, accuracy, creation date and last sign-in date in order to operate and support the service."],
      },
      {
        heading: "4. Emails",
        paragraphs: [
          "We send only service emails: a link to confirm your email address when you sign up, a notice if someone tries to sign up with an address that already has an account, a password reset link when you ask for one, a notice that your password was changed and a confirmation that your account was deleted. We send no marketing emails.",
          "Emails are delivered by Resend, which processes the message for us in its European region in Ireland. Resend is a United States company, so any transfer to it relies on the safeguards of its data processing agreement.",
        ],
      },
      {
        heading: "5. Cookies and local storage",
        items: [
          "techrat.auth: the sign-in session cookie of the website. It is HttpOnly (JavaScript cannot read it), Secure and SameSite=Strict, and lasts up to 14 days, renewed while you use the site. It is strictly necessary.",
          "techrat-locale: remembers your language for one year.",
          "localStorage key techrat.locale: also remembers your language.",
          "The Android app keeps its sign-in tokens in the device’s secure storage (Android Keystore).",
        ],
        closing: ["We do not use advertising or analytics cookies and we load no third-party scripts or fonts."],
      },
      {
        heading: "6. Who we share data with",
        paragraphs: ["We do not sell or share your data for advertising. We use service providers that only process data on our behalf:"],
        items: [
          "Hosting: TechRat runs on a virtual private server from Hostinger that holds the database (see section 7 for where it is).",
          "Email delivery, as described above.",
        ],
        closing: [
          "We may disclose data when the law requires it. Study links inside the app open third-party sites that you choose to visit; their own policies apply there.",
        ],
      },
      {
        heading: "7. International transfers",
        paragraphs: ["Your data is stored on the Hostinger server described above, in a data centre in {{TODO(owner): state the country of the Hostinger data centre (hPanel, VPS, Overview)}}. Emails are processed in Ireland by Resend, as described in section 4. Where a provider is outside the European Economic Area, transfers rely on an adequacy decision or on the European Commission’s standard contractual clauses."],
      },
      {
        heading: "8. How long we keep data",
        items: [
          "We keep your data while your account exists.",
          "If you delete your account, your credentials, profile, photo, progress, XP, achievements and notifications are deleted immediately and every session ends.",
          "Backups are made daily on the server and deleted automatically after 14 days, so an older copy can contain your data for up to 14 days after you delete your account.",
          "Server logs may keep your random internal identifier (no name, no email) and, in web server access logs, IP addresses and requested addresses until they are rotated: web server access logs are deleted after at most 40 days and application logs are overwritten as their size-limited files rotate.",
        ],
      },
      {
        heading: "9. Security",
        paragraphs: [
          "Connections to TechRat use HTTPS. Passwords are stored as salted hashes, repeated wrong passwords lock the account for a few minutes, requests are rate limited and the database is not reachable from the internet. No system is perfectly secure, so please choose a strong, unique password.",
        ],
      },
      {
        heading: "10. Children",
        paragraphs: [
          "TechRat is meant for people aged 16 or over (16 is the age of digital consent in Ireland) and does not knowingly collect data from younger children. There is no age check when you sign up today. If you believe a child has created an account, write to us and we will delete it.",
        ],
      },
      {
        heading: "11. Your rights",
        items: [
          "Access and correction: you can see your data in the app and change your display name, bio, photo and password in Settings.",
          `Deletion: in Settings, Delete account (website), in Profile, Delete account (Android app), or at https://techrat.io/account/delete. It takes effect immediately.`,
          `Other requests, such as a copy of your data in a portable format, objection or restriction: write to ${l.contactEmail}; we answer within one month, as the GDPR requires. You may also complain to the Data Protection Commission, Ireland’s supervisory authority (dataprotection.ie).`,
        ],
      },
      {
        heading: "12. Changes to this policy",
        paragraphs: ["When we change this policy we publish the new version on this page with a new date. For important changes we will also tell you in the app or by email."],
      },
      {
        heading: "13. Contact",
        paragraphs: [`Questions or requests about your data: ${l.contactEmail}.`],
      },
    ],
  }),
  termsPage: (l: LegalInfo): LegalDocument => ({
    intro: [
      `These terms govern your use of TechRat, the learning platform operated by ${l.companyName} (the website at techrat.io and the Android app). By creating an account or using TechRat you agree to them and to our Privacy Policy.`,
    ],
    sections: [
      {
        heading: "1. Your account",
        items: [
          "Give accurate information and keep your password secret. You are responsible for what happens under your account.",
          "You must be at least 16 years old, as stated in the Privacy Policy.",
          "You can delete your account at any time (see the Privacy Policy).",
        ],
      },
      {
        heading: "2. Acceptable use",
        paragraphs: ["Do not:"],
        items: [
          "use bots or scripts to answer questions, farm XP or climb leaderboards, or copy the question bank;",
          "attack, overload or probe the service, or try to access other people’s accounts or data;",
          "use a name, bio or photo that is unlawful, hateful, sexual, misleading or that impersonates someone else;",
          "use TechRat for anything unlawful.",
        ],
      },
      {
        heading: "3. Your content",
        paragraphs: [
          "Your display name, bio and photo stay yours. You allow us to show them to other learners inside TechRat as described in the Privacy Policy, only for as long as your account exists. We may remove content that breaks these terms.",
        ],
      },
      {
        heading: "4. Our content",
        paragraphs: [
          "The questions, explanations, roadmaps, design and software of TechRat belong to us or our licensors. You may use them for your own, non-commercial learning, but not copy, resell or republish them.",
        ],
      },
      {
        heading: "5. Learning content",
        paragraphs: [
          "TechRat is an educational tool. We work to keep questions and explanations accurate, but we do not promise that they are error free, up to date or that they will get you a job, a certification or an exam result. Links to documentation lead to third-party sites we do not control.",
        ],
      },
      {
        heading: "6. Availability and changes",
        paragraphs: ["We may change, suspend or discontinue features, and we may update these terms. Material changes are announced in the app or by email, and using TechRat afterwards means you accept them."],
      },
      {
        heading: "7. Suspension and termination",
        paragraphs: ["We may suspend or close an account that breaks these terms or puts the service or other users at risk. You may stop using TechRat and delete your account at any time. When an account is deleted, its data is deleted as described in the Privacy Policy."],
      },
      {
        heading: "8. No warranty",
        paragraphs: ["TechRat is provided “as is” and “as available”, without warranties of any kind, to the extent the law allows."],
      },
      {
        heading: "9. Limitation of liability",
        paragraphs: ["We do not exclude or limit liability that the law does not allow us to exclude or limit, including for fraud, for death or personal injury caused by negligence, and your statutory consumer rights. Subject to that, and because TechRat is free, we are not liable for indirect or consequential losses, or for loss of data or progress."],
      },
      {
        heading: "10. Governing law",
        paragraphs: ["These terms are governed by the laws of Ireland and the courts of Ireland have jurisdiction. If you are a consumer living in another EU country, you keep the protection of the mandatory consumer law of that country and may also bring a claim in its courts."],
      },
      {
        heading: "11. Contact",
        paragraphs: [`Questions about these terms: ${l.contactEmail}.`],
      },
    ],
  }),
};
