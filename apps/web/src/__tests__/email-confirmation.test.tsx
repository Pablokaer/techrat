import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "../../app/(auth)/register/page";
import LoginPage from "../../app/(auth)/login/page";
import ConfirmEmailPage from "../../app/(auth)/confirm-email/page";
import { renderApp } from "@/test/utils";
import { qk } from "@/lib/queries";

const nav = vi.hoisted(() => ({ replace: vi.fn(), params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, back: vi.fn() }),
  useSearchParams: () => nav.params,
  usePathname: () => "/",
}));

type Call = { method: string; path: string; body: unknown };
let calls: Call[] = [];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" } });
}

/** Answers like the API: sign-up 202, login 403 for an unconfirmed account, confirmation 204 or 400, resend 202. */
function serve(options: { confirm?: number; login?: number } = {}) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const request = input as Request;
    const path = new URL(request.url).pathname;
    const text = await request.clone().text();
    calls.push({ method: request.method, path, body: text ? JSON.parse(text) : null });
    switch (path) {
      case "/api/v1/auth/register": return json({ confirmationRequired: true }, 202);
      case "/api/v1/auth/resend-confirmation": return json({}, 202);
      case "/api/v1/auth/confirm-email":
        return (options.confirm ?? 204) === 204 ? new Response(null, { status: 204 }) : json({ title: "Bad Request", errors: { code: ["Invalid token."] } }, 400);
      case "/api/v1/auth/login":
        return json({ title: "Forbidden", detail: "Confirm your email first: we sent you a link when you signed up. You can ask for a new one." }, options.login ?? 403);
      case "/api/v1/auth/providers": return json([]);
      default: return json({ title: "Unauthorized" }, 401);
    }
  });
}

const called = (path: string) => calls.filter((c) => c.path === path);

beforeEach(() => {
  calls = [];
  serve();
});

afterEach(() => {
  nav.replace.mockClear();
  nav.params = new URLSearchParams();
  vi.mocked(fetch).mockClear().mockImplementation(async () => json({ title: "Unauthorized" }, 401));
});

async function signUp() {
  await userEvent.type(screen.getByLabelText("Email"), "alex@example.com");
  await userEvent.type(screen.getByLabelText("Username"), "alex_dev");
  await userEvent.type(screen.getByLabelText("Password"), "Passw0rdX");
  await userEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("Sign-up asks for the email to be confirmed", () => {
  it("shows where the link went instead of signing in", async () => {
    renderApp(<RegisterPage />, (c) => c.setQueryData(qk.me, null));

    await signUp();

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText(/alex@example\.com/)).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
    expect(called("/api/v1/auth/login")).toHaveLength(0);
    expect(called("/api/v1/users/me")).toHaveLength(0);
  });

  it("never says that the address was already registered", async () => {
    renderApp(<RegisterPage />, (c) => c.setQueryData(qk.me, null));

    await signUp();

    await screen.findByRole("heading", { name: "Check your email" });
    expect(screen.queryByText(/already/i)).not.toBeInTheDocument();
  });

  it("lets the person ask for the email again and says so without confirming that an account exists", async () => {
    renderApp(<RegisterPage />, (c) => c.setQueryData(qk.me, null));
    await signUp();

    await userEvent.click(await screen.findByRole("button", { name: "Send the email again" }));

    await waitFor(() => expect(called("/api/v1/auth/resend-confirmation")).toHaveLength(1));
    expect(called("/api/v1/auth/resend-confirmation")[0].body).toEqual({ email: "alex@example.com" });
    expect(await screen.findByRole("status")).toHaveTextContent("If that address is waiting for confirmation, a new link is on its way.");
  });

  it("points to the sign-in page", async () => {
    renderApp(<RegisterPage />, (c) => c.setQueryData(qk.me, null));
    await signUp();

    expect(await screen.findByRole("link", { name: "Go to sign in" })).toHaveAttribute("href", "/login");
  });

  it("speaks Portuguese", async () => {
    renderApp(<RegisterPage />, (c) => c.setQueryData(qk.me, null), { locale: "pt-BR" });
    await userEvent.type(screen.getByLabelText("E-mail"), "alex@example.com");
    await userEvent.type(screen.getByLabelText("Nome de usuário"), "alex_dev");
    await userEvent.type(screen.getByLabelText("Senha"), "Passw0rdX");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("heading", { name: "Confira seu e-mail" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar o e-mail de novo" })).toBeInTheDocument();
  });
});

describe("Sign-in with an unconfirmed account", () => {
  async function signIn() {
    await userEvent.type(screen.getByLabelText("Email"), "alex@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Passw0rdX");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  }

  it("explains it and offers to send the link again", async () => {
    renderApp(<LoginPage />, (c) => c.setQueryData(qk.me, null));

    await signIn();

    expect(await screen.findByRole("alert")).toHaveTextContent("Confirm your email first");
    expect(screen.getByRole("button", { name: "Send the confirmation email again" })).toBeInTheDocument();
  });

  it("sends the link again to the address that was typed", async () => {
    renderApp(<LoginPage />, (c) => c.setQueryData(qk.me, null));
    await signIn();

    await userEvent.click(await screen.findByRole("button", { name: "Send the confirmation email again" }));

    await waitFor(() => expect(called("/api/v1/auth/resend-confirmation")).toHaveLength(1));
    expect(called("/api/v1/auth/resend-confirmation")[0].body).toEqual({ email: "alex@example.com" });
    expect(await screen.findByRole("status")).toHaveTextContent("If that address is waiting for confirmation, a new link is on its way.");
  });

  it("does not offer it for a wrong password", async () => {
    serve({ login: 401 });
    renderApp(<LoginPage />, (c) => c.setQueryData(qk.me, null));

    await signIn();

    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Send the confirmation email again" })).not.toBeInTheDocument();
  });
});

describe("The confirmation page", () => {
  function open(query: string, locale?: "en" | "pt-BR") {
    nav.params = new URLSearchParams(query);
    window.history.replaceState(null, "", `/confirm-email?${query}`);
    return renderApp(<ConfirmEmailPage />, (c) => c.setQueryData(qk.me, null), { locale });
  }

  it("confirms the address once and says the account can sign in", async () => {
    open("email=alex%40example.com&code=abc123");

    expect(await screen.findByRole("status")).toHaveTextContent("Your email is confirmed. You can sign in now.");
    expect(called("/api/v1/auth/confirm-email")).toHaveLength(1);
    expect(called("/api/v1/auth/confirm-email")[0].body).toEqual({ email: "alex@example.com", code: "abc123" });
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("takes the code out of the address bar once it has been used", async () => {
    open("email=alex%40example.com&code=abc123");

    await screen.findByRole("status");

    expect(window.location.search).not.toContain("code=");
    expect(window.location.search).not.toContain("alex");
  });

  it("explains a link that is wrong, expired or already used, and points to sign-in to ask for a new one", async () => {
    serve({ confirm: 400 });
    open("email=alex%40example.com&code=old");

    expect(await screen.findByRole("alert")).toHaveTextContent("This link is invalid, expired or already used.");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("does not call the API when the address or the code is missing", async () => {
    open("email=alex%40example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("This link is invalid, expired or already used.");
    expect(called("/api/v1/auth/confirm-email")).toHaveLength(0);
  });

  it("speaks Portuguese", async () => {
    open("email=alex%40example.com&code=abc123", "pt-BR");

    expect(await screen.findByRole("status")).toHaveTextContent("Seu e-mail foi confirmado. Agora você pode entrar.");
  });
});
