import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Landing from "../../app/page";
import LoginPage from "../../app/(auth)/login/page";
import RegisterPage from "../../app/(auth)/register/page";
import ForgotPasswordPage from "../../app/(auth)/forgot-password/page";
import ResetPasswordPage from "../../app/(auth)/reset-password/page";
import AccountDeletePage, * as accountDeleteModule from "../../app/account/delete/page";
import PrivacyPage, * as privacyModule from "../../app/privacy/page";
import TermsPage, * as termsModule from "../../app/terms/page";
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

describe("legal configuration", () => {
  it("keeps the company name and contact email in one place", () => {
    expect(LEGAL.companyName).toBeTruthy();
    expect(LEGAL.contactEmail).toMatch(/^[^@\s]+@[^@\s]+$/);
  });
});

describe("Privacy policy page", () => {
  it("renders the policy in English, signed out, with the draft banner and visible TODO markers", () => {
    const { container } = renderApp(<PrivacyPage />, signedOut);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Draft: pending legal review");
    expect(container.innerHTML).toContain("<!--");
    expect(screen.getByText(/TODO\(legal\): confirm hosting provider and country\./)).toBeInTheDocument();
    expect(screen.getByText(/TODO\(owner\): decide and confirm the minimum age/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("{{");
    expect(document.body.textContent).toContain(LEGAL.contactEmail);
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

  it("is reachable in Portuguese", () => {
    renderApp(<PrivacyPage />, signedOut, { locale: "pt-BR" });
    expect(screen.getByRole("heading", { level: 1, name: "Política de Privacidade" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Rascunho: aguardando revisão jurídica");
    expect(screen.getByText(/TODO\(legal\): confirmar o provedor de hospedagem e o país\./)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("{{");
    expectLegalLinks(screen, { privacy: "Política de Privacidade", terms: "Termos de Uso" });
  });

  it("links to the terms and has a language switcher", () => {
    renderApp(<PrivacyPage />, signedOut);
    expectLegalLinks(screen);
    expect(screen.getByRole("group", { name: "Choose language" })).toBeInTheDocument();
  });
});

describe("Terms of service page", () => {
  it("renders in English with the draft banner and the governing-law TODO", () => {
    renderApp(<TermsPage />, signedOut);
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByText(/TODO\(legal\): state the governing law/)).toBeInTheDocument();
    expectLegalLinks(screen);
  });

  it("renders in Portuguese", () => {
    renderApp(<TermsPage />, signedOut, { locale: "pt-BR" });
    expect(screen.getByRole("heading", { level: 1, name: "Termos de Uso" })).toBeInTheDocument();
    expect(screen.getByText(/TODO\(legal\): informar a lei aplicável/)).toBeInTheDocument();
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
    expect(screen.getByText(/TODO\(legal\): confirm whether backups exist/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in to delete your account" })).toHaveAttribute("href", "/login?next=/account/delete");
    expect(screen.getByText(new RegExp(`Cannot sign in any more\\? Write to ${LEGAL.contactEmail.replace(".", "\\.")}`))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete my account" })).not.toBeInTheDocument();
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
