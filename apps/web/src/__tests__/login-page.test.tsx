import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../../app/(auth)/login/page";
import { me, renderApp } from "@/test/utils";
import { qk } from "@/lib/queries";

const nav = vi.hoisted(() => ({ replace: vi.fn(), params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, back: vi.fn() }),
  useSearchParams: () => nav.params,
  usePathname: () => "/login",
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" } });
}

beforeEach(() => {
  // Login succeeds: POST /auth/login, then GET /users/me.
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = new URL((input as Request).url);
    if (url.pathname === "/api/v1/users/me") return json(me);
    if (url.pathname === "/api/v1/auth/providers") return json([]);
    return json({});
  });
});

afterEach(() => {
  nav.replace.mockClear();
  nav.params = new URLSearchParams();
  vi.mocked(fetch).mockClear().mockImplementation(async () => json({ title: "Unauthorized" }, 401));
});

function renderLogin(query = "", locale?: "en" | "pt-BR") {
  nav.params = new URLSearchParams(query);
  return renderApp(<LoginPage />, (c) => c.setQueryData(qk.me, null), { locale });
}

async function signIn() {
  await userEvent.type(screen.getByLabelText("Email"), "alex@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "Passw0rdX");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("Login page: account deleted notice", () => {
  it("shows a one-time status message after an account was deleted", () => {
    renderLogin("deleted=1");
    expect(screen.getByRole("status")).toHaveTextContent("Your account was deleted. Everything tied to it is gone.");
  });

  it("shows it in Portuguese", () => {
    renderLogin("deleted=1", "pt-BR");
    expect(screen.getByRole("status")).toHaveTextContent("Sua conta foi excluída. Tudo o que estava ligado a ela foi apagado.");
  });

  it("shows nothing without the flag", () => {
    renderLogin();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("Login page: next redirect", () => {
  it("goes to the dashboard by default", async () => {
    renderLogin();
    await signIn();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("follows a same-origin next path", async () => {
    renderLogin("next=%2Faccount%2Fdelete");
    await signIn();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/account/delete"));
  });

  it.each([
    ["a protocol-relative URL", "//evil.example"],
    ["an absolute URL", "https://evil.example"],
    ["a backslash trick", "/\\evil.example"],
    ["a javascript: URL", "javascript:alert(1)"],
  ])("ignores %s and goes to the dashboard (no open redirect)", async (_name, next) => {
    renderLogin(`next=${encodeURIComponent(next)}`);
    await signIn();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/dashboard"));
    expect(nav.replace).not.toHaveBeenCalledWith(next);
  });
});
