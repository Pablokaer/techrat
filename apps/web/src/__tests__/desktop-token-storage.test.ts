import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHUNK_SIZE, createDesktopTokenStorage, tauriInvoke } from "@/lib/desktop-token-storage";

const KEY = "techrat.tokens";

/** The OS keychain as the Rust side exposes it: secure_set / secure_get / secure_remove over string values. */
function fakeKeychain() {
  const entries = new Map<string, string>();
  const calls: string[] = [];
  const invoke = vi.fn(async (command: string, args?: Record<string, unknown>) => {
    calls.push(command);
    const key = args?.key as string;
    switch (command) {
      case "secure_set": entries.set(key, args?.value as string); return null;
      case "secure_get": return entries.get(key) ?? null;
      case "secure_remove": entries.delete(key); return null;
      default: throw new Error(`unknown command ${command}`);
    }
  });
  return { entries, calls, invoke };
}

function localStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const token = (length: number) => Array.from({ length }, (_, i) => String.fromCharCode(97 + (i % 26))).join("");

describe("Desktop token storage (OS keychain)", () => {
  let keychain: ReturnType<typeof fakeKeychain>;
  let local: ReturnType<typeof localStore>;

  beforeEach(() => {
    keychain = fakeKeychain();
    local = localStore();
  });

  const storage = (overrides: Partial<Parameters<typeof createDesktopTokenStorage>[0]> = {}) =>
    createDesktopTokenStorage({ invoke: keychain.invoke, local, ...overrides });

  it("keeps a value in the keychain and reads it back", async () => {
    const s = storage();

    await s.set(KEY, '{"accessToken":"a","refreshToken":"r"}');

    expect(await s.get(KEY)).toBe('{"accessToken":"a","refreshToken":"r"}');
    expect(keychain.calls).toContain("secure_set");
  });

  it("returns null when nothing was saved", async () => {
    expect(await storage().get(KEY)).toBeNull();
  });

  it("splits a long value into pieces the OS credential stores accept and joins it again", async () => {
    const s = storage();
    const long = token(5000);

    await s.set(KEY, long);

    expect(await s.get(KEY)).toBe(long);
    expect(keychain.entries.size).toBeGreaterThan(1);
    for (const stored of keychain.entries.values()) expect(stored.length).toBeLessThanOrEqual(CHUNK_SIZE);
  });

  it("keeps every piece below the Windows credential size limit (2,560 bytes, stored as UTF-16)", () => {
    expect(CHUNK_SIZE * 2).toBeLessThanOrEqual(2560);
  });

  it("leaves no stale pieces behind when a long value is replaced by a short one", async () => {
    const s = storage();
    await s.set(KEY, token(5000));
    const before = keychain.entries.size;

    await s.set(KEY, "short");

    expect(await s.get(KEY)).toBe("short");
    expect(keychain.entries.size).toBeLessThan(before);
    expect(keychain.entries.size).toBe(2); // the count and one piece
  });

  it("removes every piece", async () => {
    const s = storage();
    await s.set(KEY, token(3000));

    await s.remove(KEY);

    expect(keychain.entries.size).toBe(0);
    expect(await s.get(KEY)).toBeNull();
  });

  it("reads nothing rather than half a token when a piece is missing", async () => {
    const s = storage();
    await s.set(KEY, token(3000));
    const piece = [...keychain.entries.keys()].find((k) => k !== KEY)!;
    keychain.entries.delete(piece);

    expect(await s.get(KEY)).toBeNull();
  });

  it("never writes tokens to localStorage", async () => {
    await storage().set(KEY, "secret-token");

    expect(local.data.size).toBe(0);
  });

  it("moves tokens saved by an earlier version from localStorage into the keychain on the first read", async () => {
    local = localStore({ [KEY]: "legacy-token" });
    const s = storage();

    expect(await s.get(KEY)).toBe("legacy-token");

    expect(local.data.has(KEY)).toBe(false);
    expect(await storage().get(KEY)).toBe("legacy-token"); // now it comes from the keychain
  });

  it("forgets a legacy copy in localStorage when it saves new tokens", async () => {
    local = localStore({ [KEY]: "old" });

    await storage().set(KEY, "new");

    expect(local.data.has(KEY)).toBe(false);
  });

  it("removes the legacy copy too on sign-out", async () => {
    local = localStore({ [KEY]: "old" });

    await storage().remove(KEY);

    expect(local.data.has(KEY)).toBe(false);
  });

  describe("when the keychain cannot be used (no secret service on Linux, a locked store)", () => {
    const failing = () => vi.fn(async () => { throw new Error("no secret service"); });

    it("keeps the tokens in memory for the session and tells the caller once", async () => {
      const onUnavailable = vi.fn();
      const s = storage({ invoke: failing(), onKeychainUnavailable: onUnavailable });

      await s.set(KEY, "session-only");
      await s.set(KEY, "session-only-2");

      expect(await s.get(KEY)).toBe("session-only-2");
      expect(onUnavailable).toHaveBeenCalledTimes(1);
    });

    it("does not fall back to leaving tokens in localStorage", async () => {
      const s = storage({ invoke: failing() });

      await s.set(KEY, "session-only");

      expect(local.data.size).toBe(0);
    });

    it("drops tokens an earlier version left in localStorage, so the person signs in again instead of keeping them there", async () => {
      local = localStore({ [KEY]: "legacy-token" });
      const s = storage({ invoke: failing() });

      expect(await s.get(KEY)).toBeNull();

      expect(local.data.has(KEY)).toBe(false);
    });

    it("forgets the tokens on sign-out", async () => {
      const s = storage({ invoke: failing() });
      await s.set(KEY, "session-only");

      await s.remove(KEY);

      expect(await s.get(KEY)).toBeNull();
    });
  });

  it("uses localStorage as before outside the desktop shell (browser in bearer mode)", async () => {
    const s = createDesktopTokenStorage({ invoke: null, local });

    await s.set(KEY, "browser-token");

    expect(local.data.get(KEY)).toBe("browser-token");
    expect(await s.get(KEY)).toBe("browser-token");
    await s.remove(KEY);
    expect(local.data.has(KEY)).toBe(false);
  });

  it("survives a localStorage that throws", async () => {
    const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }, removeItem: () => { throw new Error("denied"); } };
    const s = createDesktopTokenStorage({ invoke: null, local: broken });

    await expect(s.set(KEY, "x")).resolves.toBeUndefined();
    await expect(s.get(KEY)).resolves.toBeNull();
    await expect(s.remove(KEY)).resolves.toBeUndefined();
  });
});

describe("Finding the Tauri bridge", () => {
  it("is absent in a plain browser", () => {
    expect(tauriInvoke({})).toBeNull();
  });

  it("is the invoke function Tauri injects into its webview", async () => {
    const invoke = vi.fn(async () => "pong");

    const found = tauriInvoke({ __TAURI_INTERNALS__: { invoke } });

    expect(await found!("ping", { a: 1 })).toBe("pong");
    expect(invoke).toHaveBeenCalledWith("ping", { a: 1 });
  });
});
