import type { TokenStorage } from "@techrat/auth";

/** Calls a Rust command of the desktop shell (what `invoke` of `@tauri-apps/api` does). */
export type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;
export type LocalStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Longest piece stored in one keychain entry. Windows keeps a credential as at most 2,560 bytes, and a password is stored
 * as UTF-16 (two bytes per character), while a session (access and refresh token as JSON) is about 2 KB.
 */
export const CHUNK_SIZE = 900;

const MAX_PIECES = 64;

/** The `invoke` that Tauri 2 injects into its webview, or null in a plain browser. */
export function tauriInvoke(host: unknown = typeof window === "undefined" ? {} : window): Invoke | null {
  const internals = (host as { __TAURI_INTERNALS__?: { invoke?: Invoke } }).__TAURI_INTERNALS__;
  return typeof internals?.invoke === "function" ? (command, args) => internals.invoke!(command, args) : null;
}

export interface DesktopTokenStorageOptions {
  /** The desktop shell's bridge; null outside it. */
  invoke: Invoke | null;
  /** Where an earlier version kept the tokens, and where a browser in bearer mode still does. */
  local: LocalStore | null;
  /** Called once when the keychain cannot be used and the tokens stay in memory. */
  onKeychainUnavailable?: (error: unknown) => void;
}

/**
 * Token storage of the desktop app (ADR-0032). Inside the Tauri shell the tokens live in the operating system's credential
 * store (Windows Credential Manager, macOS Keychain, the Secret Service on Linux) through three Rust commands, instead of in
 * the webview's `localStorage`, which any script in the page, or anyone with the app-data folder, can read. A session is
 * longer than some stores accept, so it is split into pieces. When the keychain cannot be used the tokens are kept in
 * memory for the session and the person signs in again next time: they are never put back in `localStorage`.
 *
 * Outside the shell (a browser in bearer mode, for development) it uses `localStorage` as before.
 */
export function createDesktopTokenStorage({ invoke, local, onKeychainUnavailable }: DesktopTokenStorageOptions): TokenStorage {
  const localGet = (key: string) => { try { return local?.getItem(key) ?? null; } catch { return null; } };
  const localSet = (key: string, value: string) => { try { local?.setItem(key, value); } catch { /* storage unavailable */ } };
  const localRemove = (key: string) => { try { local?.removeItem(key); } catch { /* storage unavailable */ } };

  if (!invoke) {
    return {
      get: async (key) => localGet(key),
      set: async (key, value) => localSet(key, value),
      remove: async (key) => localRemove(key),
    };
  }

  const call = invoke;
  const memory = new Map<string, string>();
  let unavailable = false;
  const fail = (error: unknown) => {
    if (unavailable) return;
    unavailable = true;
    onKeychainUnavailable?.(error);
  };

  const piece = (key: string, index: number) => `${key}.${index}`;
  const secureGet = async (key: string) => (await call("secure_get", { key })) as string | null;
  const secureSet = (key: string, value: string) => call("secure_set", { key, value });
  const secureRemove = (key: string) => call("secure_remove", { key });
  const countOf = async (key: string) => {
    const n = Number(await secureGet(key));
    return Number.isInteger(n) && n >= 1 && n <= MAX_PIECES ? n : 0;
  };

  async function readKeychain(key: string): Promise<string | null> {
    const count = await countOf(key);
    if (count === 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await secureGet(piece(key, i));
      if (part == null) return null;   // half a token is worse than none
      parts.push(part);
    }
    return parts.join("");
  }

  async function writeKeychain(key: string, value: string) {
    const previous = await countOf(key);
    const pieces: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) pieces.push(value.slice(i, i + CHUNK_SIZE));
    for (let i = 0; i < pieces.length; i++) await secureSet(piece(key, i), pieces[i]);
    await secureSet(key, String(pieces.length));   // the count goes last: a reader never sees a count before its pieces
    for (let i = pieces.length; i < previous; i++) await secureRemove(piece(key, i));
  }

  async function removeKeychain(key: string) {
    const count = await countOf(key);
    for (let i = 0; i < count; i++) await secureRemove(piece(key, i));
    await secureRemove(key);
  }

  return {
    async get(key) {
      if (!unavailable) {
        try {
          const value = await readKeychain(key);
          if (value != null) return value;
          const legacy = localGet(key);
          if (legacy != null) {
            // Saved by an earlier version in localStorage: move it into the keychain and forget the copy.
            await writeKeychain(key, legacy);
            localRemove(key);
            return legacy;
          }
          return null;
        } catch (error) {
          fail(error);
        }
      }
      // The keychain is not usable: tokens an earlier version left in localStorage are dropped (the person signs in again).
      localRemove(key);
      return memory.get(key) ?? null;
    },

    async set(key, value) {
      if (!unavailable) {
        try {
          if (value === "") await removeKeychain(key);
          else await writeKeychain(key, value);
          memory.delete(key);
          localRemove(key);
          return;
        } catch (error) {
          fail(error);
        }
      }
      memory.set(key, value);
      localRemove(key);
    },

    async remove(key) {
      memory.delete(key);
      localRemove(key);
      if (unavailable) return;
      try {
        await removeKeychain(key);
      } catch (error) {
        fail(error);
      }
    },
  };
}
