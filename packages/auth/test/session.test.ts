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
