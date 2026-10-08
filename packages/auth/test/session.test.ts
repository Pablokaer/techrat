import { describe, expect, it, vi } from "vitest";
import { BearerSession, MemoryTokenStorage, needsRefresh, parseTokenResponse } from "../src";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("token helpers", () => {
  it("computes expiry and refresh margin", () => {
    const t = parseTokenResponse({ tokenType: "Bearer", accessToken: "a", refreshToken: "r", expiresIn: 1800 }, 0);
    expect(t.expiresAt).toBe(1_800_000);
    expect(needsRefresh(t, 1_700_000)).toBe(false);
    expect(needsRefresh(t, 1_750_000)).toBe(true);
    expect(needsRefresh(null)).toBe(false);
  });
});

describe("BearerSession", () => {
  it("logs in, attaches the bearer header and stores tokens", async () => {
    const fetchMock = vi.fn(async (req: Request) => {
      if (req.url.endsWith("/auth/login")) return json({ tokenType: "Bearer", accessToken: "AT", refreshToken: "RT", expiresIn: 1800 });
      expect(req.headers.get("Authorization")).toBe("Bearer AT");
      return json({ id: "u1", username: "alex" });
    });
    const storage = new MemoryTokenStorage();
    const s = new BearerSession("https://api.test", storage, fetchMock as unknown as typeof fetch);
    const me = await s.login("a@b.io", "Passw0rdX");
    expect(me).toMatchObject({ username: "alex" });
    expect(JSON.parse((await storage.get("techrat.tokens"))!).refreshToken).toBe("RT");
  });

  it("refreshes once for concurrent callers and signs out when refresh is rejected", async () => {
    const storage = new MemoryTokenStorage();
    await storage.set("techrat.tokens", JSON.stringify({ accessToken: "old", refreshToken: "RT", expiresAt: 0 }));
    let refreshCalls = 0;
    const fetchMock = vi.fn(async () => { refreshCalls++; return json({ title: "Unauthorized" }, 401); });
    const s = new BearerSession("https://api.test", storage, fetchMock as unknown as typeof fetch);
    await s.restore();
    expect(refreshCalls).toBe(1);
    expect(s.isSignedIn).toBe(false);
    expect(await storage.get("techrat.tokens")).toBeNull();
  });
});

describe("BearerSession.changePassword", () => {
  const tokens = (a: string, r: string) => ({ tokenType: "Bearer", accessToken: a, refreshToken: r, expiresIn: 1800 });

  async function signedIn(handler: (req: Request) => Response | Promise<Response>) {
    const fetchMock = vi.fn(async (req: Request) => {
      if (req.url.endsWith("/auth/login")) return json(tokens("AT", "RT"));
      if (req.url.endsWith("/users/me")) return json({ id: "u1" });
      return handler(req);
    });
    const storage = new MemoryTokenStorage();
    const session = new BearerSession("https://api.test", storage, fetchMock as unknown as typeof fetch);
    await session.login("a@b.io", "OldPassw0rd");
    return { session, storage, fetchMock };
  }

  it("sends both passwords and keeps the session with the tokens the API returns", async () => {
    const { session, storage, fetchMock } = await signedIn(async (req) => {
      expect(req.headers.get("Authorization")).toBe("Bearer AT");
      expect(await req.json()).toEqual({ currentPassword: "OldPassw0rd", newPassword: "N3wPassword" });
      return json(tokens("AT2", "RT2"));
    });
    await session.changePassword("OldPassw0rd", "N3wPassword");
    expect(fetchMock.mock.calls.some(([r]) => r.url.endsWith("/auth/change-password"))).toBe(true);
    expect(JSON.parse((await storage.get("techrat.tokens"))!)).toMatchObject({ accessToken: "AT2", refreshToken: "RT2" });
    expect(session.isSignedIn).toBe(true);
  });

  it("keeps the old tokens and reports field errors when the API refuses", async () => {
    const { session, storage } = await signedIn(() => json({ title: "Invalid", errors: { currentPassword: ["The current password is incorrect."] } }, 400));
    await expect(session.changePassword("wrong", "N3wPassword")).rejects.toMatchObject({ status: 400 });
    expect(JSON.parse((await storage.get("techrat.tokens"))!).accessToken).toBe("AT");
  });
});

describe("BearerSession.deleteAccount", () => {
  const tokens = { tokenType: "Bearer", accessToken: "AT", refreshToken: "RT", expiresIn: 1800 };

  async function signedIn(handler: (req: Request) => Response | Promise<Response>) {
    const fetchMock = vi.fn(async (req: Request) => {
      if (req.url.endsWith("/auth/login")) return json(tokens);
      if (req.url.endsWith("/users/me")) return json({ id: "u1" });
      return handler(req);
    });
    const storage = new MemoryTokenStorage();
    const session = new BearerSession("https://api.test", storage, fetchMock as unknown as typeof fetch);
    await session.login("a@b.io", "Passw0rdX");
    return { session, storage, fetchMock };
  }

  it("sends the password with DELETE /account and signs the session out when the account is gone", async () => {
    const { session, storage, fetchMock } = await signedIn(async (req) => {
      expect(req.method).toBe("DELETE");
      expect(req.headers.get("Authorization")).toBe("Bearer AT");
      expect(await req.json()).toEqual({ password: "Passw0rdX", confirmation: null });
      return new Response(null, { status: 204 });
    });
    const changes: boolean[] = [];
    session.onChange((signedIn) => changes.push(signedIn));

    await session.deleteAccount("Passw0rdX", null);

    expect(fetchMock.mock.calls.some(([r]) => r.url.endsWith("/api/v1/account") && r.method === "DELETE")).toBe(true);
    expect(await storage.get("techrat.tokens")).toBeNull();
    expect(session.isSignedIn).toBe(false);
    expect(changes).toEqual([false]);
  });

  it("sends the typed username for accounts without a password", async () => {
    const { session } = await signedIn(async (req) => {
      expect(await req.json()).toEqual({ password: null, confirmation: "alex" });
      return new Response(null, { status: 204 });
    });
    await session.deleteAccount(null, "alex");
    expect(session.isSignedIn).toBe(false);
  });

  it("keeps the session and reports field errors when the API refuses", async () => {
    const { session, storage } = await signedIn(() => json({ title: "Invalid", errors: { password: ["The current password is incorrect."] } }, 400));
    await expect(session.deleteAccount("wrong", null)).rejects.toMatchObject({ status: 400, errors: { password: ["The current password is incorrect."] } });
    expect(JSON.parse((await storage.get("techrat.tokens"))!).accessToken).toBe("AT");
    expect(session.isSignedIn).toBe(true);
  });

  it("keeps the session when the last administrator is refused", async () => {
    const { session } = await signedIn(() => json({ title: "Conflict", detail: "You are the last administrator." }, 409));
    await expect(session.deleteAccount("Passw0rdX", null)).rejects.toMatchObject({ status: 409, detail: "You are the last administrator." });
    expect(session.isSignedIn).toBe(true);
  });
});
