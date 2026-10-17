import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Landing from "../../app/page";
import LoginPage from "../../app/(auth)/login/page";
import RegisterPage from "../../app/(auth)/register/page";
import ForgotPasswordPage from "../../app/(auth)/forgot-password/page";
import ResetPasswordPage from "../../app/(auth)/reset-password/page";
import AccountDeletePage, * as accountDeleteModule from "../../app/account/delete/page";
import PrivacyPage, * as privacyModule from "../../app/privacy/page";
import TermsPage, * as termsModule from "../../app/terms/page";
import { RichText } from "@/components/legal-pages";
import { AppShell } from "@/components/shell";
import { LEGAL } from "@/lib/legal";
import { pageMetadata } from "@/lib/page-metadata";
import { qk } from "@/lib/queries";
import { renderApp } from "@/test/utils";

const server = vi.hoisted(() => ({ cookie: undefined as string | undefined, acceptLanguage: null as string | null }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "techrat-locale" && server.cookie ? { value: server.cookie } : undefined) }),
  headers: async () => ({ get: (name: string) => (name === "accept-language" ? server.acceptLanguage : null) }),
}));

beforeEach(() => {
  server.cookie = undefined;
  server.acceptLanguage = null;
});

const signedOut = (c: import("@tanstack/react-query").QueryClient) => c.setQueryData(qk.me, null);

function expectLegalLinks(scope: Pick<typeof screen, "getAllByRole">, labels = { privacy: "Privacy Policy", terms: "Terms of Service" }) {
  expect(scope.getAllByRole("link", { name: labels.privacy }).some((a) => a.getAttribute("href") === "/privacy")).toBe(true);
  expect(scope.getAllByRole("link", { name: labels.terms }).some((a) => a.getAttribute("href") === "/terms")).toBe(true);
}

/** RichText drops the braces of a {{TODO(…)}} marker, so an open marker shows up as "TODO(" in the rendered text. */
function expectNoOpenMarker() {
  expect(document.body.textContent).not.toMatch(/TODO\(|\{\{/);
}

/**
 * End of the European Commission's adequacy decision for the United Kingdom (renewed in December 2025), where the server
 * is. Section 7 of the policy relies on it and states this date.
 */
const UK_ADEQUACY_UNTIL = "2031-12-27";
const adequacyEnd = (locale: string) => new Date(UK_ADEQUACY_UNTIL).toLocaleDateString(locale, { dateStyle: "long", timeZone: "UTC" });

describe("legal configuration", () => {
  it("keeps the company name and contact email in one place", () => {
    expect(LEGAL.companyName).toBeTruthy();
    expect(LEGAL.contactEmail).toMatch(/^[^@\s]+@[^@\s]+$/);
  });

  it("relies on the UK adequacy decision only while it is in force", () => {
    // Failing here means the decision has expired: check whether it was renewed and update the date (here and in section
    // 7, both languages), or give the transfer another safeguard.
    expect(Date.now()).toBeLessThan(Date.parse(`${UK_ADEQUACY_UNTIL}T00:00:00Z`));
  });
});

describe("TODO markers in legal texts", () => {
  it("highlights a {{…}} marker without its braces, so an unconfirmed fact cannot be published unnoticed", () => {
    const { container } = render(<RichText text="Kept for {{TODO(legal): confirm the period}} days." />);
    expect(container).toHaveTextContent("Kept for TODO(legal): confirm the period days.");
    expect(container.querySelector("mark")).toHaveTextContent(/^TODO\(legal\): confirm the period$/);
    expect(container.textContent).not.toContain("{{");
  });
});

describe("Privacy policy page", () => {
  it("renders the policy in English, signed out, with the draft banner and no open TODO marker", () => {
    const { container } = renderApp(<PrivacyPage />, signedOut);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Draft: pending legal review");
    expect(container.innerHTML).toContain("<!--");
    // Neither the banner nor the hidden comment may point at TODO items when there are none.
    expect(container.innerHTML).not.toContain("TODO");
    expectNoOpenMarker();
    expect(document.body.textContent).toContain(LEGAL.contactEmail);
  });

  it.each([
    ["en", "7. International transfers", ["in a data centre in the United Kingdom", "adequacy decision", adequacyEnd("en-GB"), "Resend", "data processing agreement"]],
    ["pt-BR", "7. Transferências internacionais", ["em um data center no Reino Unido", "decisão de adequação", adequacyEnd("pt-BR"), "Resend", "acordo de processamento de dados"]],
  ] as const)("states one safeguard per transfer in %s: the UK adequacy decision for the server, the processing agreement for Resend", (locale, heading, facts) => {
    renderApp(<PrivacyPage />, signedOut, { locale });
    const section = screen.getByRole("heading", { name: heading }).closest("section");
    for (const fact of facts) expect(section).toHaveTextContent(fact);
    expect(section?.textContent).not.toMatch(/standard contractual clauses|cláusulas contratuais padrão/);
    // The public text names the country, which is what the GDPR asks for, not the city of the data centre.
    expect(document.body.textContent).not.toContain("Manchester");
  });

  it("states what the code does: data, cookies, leaderboards, emails, deletion and no trackers", () => {
    renderApp(<PrivacyPage />, signedOut);
    const text = document.body.textContent ?? "";
    for (const fact of ["salted hash", "techrat.auth", "techrat-locale", "HttpOnly", "Show me on the leaderboards", "password reset", "https://techrat.io/account/delete", "analytics, advertising or tracking SDKs"]) {
      expect(text).toContain(fact);
    }
    const deletion = screen.getAllByRole("link", { name: "Delete account" }).find((a) => a.getAttribute("href") === "/account/delete");
    expect(deletion).toBeDefined();
  });

  it("is reachable in Portuguese, with the draft banner and no open TODO marker", () => {
    const { container } = renderApp(<PrivacyPage />, signedOut, { locale: "pt-BR" });
    expect(screen.getByRole("heading", { level: 1, name: "Política de Privacidade" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Rascunho: aguardando revisão jurídica");
    expect(container.innerHTML).not.toContain("TODO");
    expectNoOpenMarker();
    expectLegalLinks(screen, { privacy: "Política de Privacidade", terms: "Termos de Uso" });
  });

  it("states the facts the owner confirmed: Irish controller, GDPR rights, DPC, Resend in Ireland, processors under agreement, backups and log periods, age 16", () => {
    renderApp(<PrivacyPage />, signedOut);
    const text = document.body.textContent ?? "";
    for (const fact of ["Data Protection Commission", "within one month", "Resend", "Ireland", "Hostinger", "under a data processing agreement", "deleted automatically after 14 days", "at most 40 days", "aged 16 or over"]) {
      expect(text).toContain(fact);
    }
  });

  it("states the same facts in Portuguese", () => {
    renderApp(<PrivacyPage />, signedOut, { locale: "pt-BR" });
    const text = document.body.textContent ?? "";
    for (const fact of ["Data Protection Commission", "no prazo de um mês", "Resend", "Irlanda", "Hostinger", "sob um acordo de processamento de dados", "apagados automaticamente após 14 dias", "no máximo 40 dias", "16 anos ou mais"]) {
      expect(text).toContain(fact);
    }
  });

  it("links to the terms and has a language switcher", () => {
    renderApp(<PrivacyPage />, signedOut);
    expectLegalLinks(screen);
    expect(screen.getByRole("group", { name: "Choose language" })).toBeInTheDocument();
  });
});

describe("Terms of service page", () => {
  it("renders in English with the draft banner, Irish governing law and the age of 16", () => {
    renderApp(<TermsPage />, signedOut);
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(document.body.textContent).toContain("governed by the laws of Ireland");
    expect(document.body.textContent).toContain("at least 16 years old");
    expectNoOpenMarker();
    expectLegalLinks(screen);
  });

  it("renders in Portuguese", () => {
    renderApp(<TermsPage />, signedOut, { locale: "pt-BR" });
    expect(screen.getByRole("heading", { level: 1, name: "Termos de Uso" })).toBeInTheDocument();
    expect(document.body.textContent).toContain("regidos pelas leis da Irlanda");
    expect(document.body.textContent).toContain("pelo menos 16 anos");
    expectNoOpenMarker();
  });
});

describe("Public account deletion page", () => {
  it("is reachable signed out: explains the deletion and sends the visitor to sign in, coming back here afterwards", () => {
    renderApp(<AccountDeletePage />, signedOut);
    expect(screen.getByRole("heading", { level: 1, name: "Delete your TechRat account" })).toBeInTheDocument();
    for (const heading of ["How to delete your account", "What is deleted", "What is not kept", "How long it takes"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/immediate and irreversible/)).toBeInTheDocument();
    expect(screen.getByText(/deleted automatically after 14 days/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in to delete your account" })).toHaveAttribute("href", "/login?next=/account/delete");
    expect(screen.getByText(new RegExp(`Cannot sign in any more\\? Write to ${LEGAL.contactEmail.replace(".", "\\.")}`))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete my account" })).not.toBeInTheDocument();
    expectNoOpenMarker();
  });

  it("shows the deletion card when the visitor is signed in", () => {
    renderApp(<AccountDeletePage />, (c) => c.setQueryData(qk.passwordStatus, { hasPassword: true }));
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in to delete your account" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Cannot sign in any more/)).not.toBeInTheDocument();
  });

  it("renders in Portuguese, signed out and signed in", () => {
    const out = renderApp(<AccountDeletePage />, signedOut, { locale: "pt-BR" });
    expect(screen.getByRole("heading", { level: 1, name: "Excluir sua conta do TechRat" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar para excluir sua conta" })).toHaveAttribute("href", "/login?next=/account/delete");
    expectNoOpenMarker();
    out.unmount();
    renderApp(<AccountDeletePage />, (c) => c.setQueryData(qk.passwordStatus, { hasPassword: false }), { locale: "pt-BR" });
    expect(screen.getByRole("button", { name: "Excluir minha conta" })).toBeInTheDocument();
  });
});

describe("indexable metadata (title and description in the visitor's language)", () => {
  it.each(["privacy", "terms", "accountDelete"] as const)("%s has a title, a description and a canonical URL in both languages", (page) => {
    const en = pageMetadata("en", page);
    const pt = pageMetadata("pt-BR", page);
    expect(en.title).toBeTruthy();
    expect(en.description).toBeTruthy();
    expect(pt.title).not.toEqual(en.title);
    expect(pt.description).not.toEqual(en.description);
    expect(en.alternates?.canonical).toBe(page === "accountDelete" ? "/account/delete" : `/${page}`);
    expect(en.robots).toBeUndefined();
  });

  it("each page exports generateMetadata that follows the language cookie, then Accept-Language", async () => {
    server.cookie = "pt-BR";
    expect((await privacyModule.generateMetadata()).title).toBe("Política de Privacidade");
    expect((await termsModule.generateMetadata()).title).toBe("Termos de Uso");
    server.cookie = undefined;
    server.acceptLanguage = "en-US,en;q=0.9";
    expect((await accountDeleteModule.generateMetadata()).title).toBe("Delete your account");
  });
});

describe("links to the policy and the terms", () => {
  it("the landing page footer links to both", () => {
    renderApp(<Landing />, signedOut);
    expectLegalLinks(within(screen.getByRole("contentinfo")));
  });

  it.each([
    ["sign in", <LoginPage key="l" />],
    ["register", <RegisterPage key="r" />],
    ["forgot password", <ForgotPasswordPage key="f" />],
    ["reset password", <ResetPasswordPage key="p" />],
  ])("the %s page links to both", (_name, page) => {
    renderApp(page, signedOut);
    expectLegalLinks(screen);
  });

  it("the app shell has a footer with both", () => {
    renderApp(<AppShell><p>content</p></AppShell>);
    expectLegalLinks(within(screen.getByRole("contentinfo")));
  });

  it("the register page asks for consent with links, in English and Portuguese", () => {
    const en = renderApp(<RegisterPage />, signedOut);
    const line = screen.getByText(/By creating an account you agree to the/);
    expect(line).toHaveTextContent("By creating an account you agree to the Terms of Service and the Privacy Policy.");
    expect(within(line).getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    expect(within(line).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    en.unmount();
    renderApp(<RegisterPage />, signedOut, { locale: "pt-BR" });
    const pt = screen.getByText(/Ao criar uma conta, você concorda com os/);
    expect(pt).toHaveTextContent("Ao criar uma conta, você concorda com os Termos de Uso e com a Política de Privacidade.");
  });
});
