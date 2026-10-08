import { ApiError, createApiClient, unwrap, type TechRatClient } from "@techrat/api";
import type { AccessTokenResponse, UserSummary } from "@techrat/types";

/** Platform-specific secure storage (SecureStore on mobile, OS keychain/Store on desktop). */
export interface TokenStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** epoch ms */
  expiresAt: number;
}

const KEY = "techrat.tokens";
const REFRESH_MARGIN_MS = 60_000;

export function parseTokenResponse(r: AccessTokenResponse, now = Date.now()): StoredTokens {
  return { accessToken: r.accessToken, refreshToken: r.refreshToken, expiresAt: now + Number(r.expiresIn) * 1000 };
}

export function needsRefresh(tokens: StoredTokens | null, now = Date.now()): boolean {
  return !!tokens && tokens.expiresAt - REFRESH_MARGIN_MS <= now;
}

/**
 * Bearer-token session used by mobile and desktop. Handles login, refresh (single-flight) and logout.
 * The web app uses HttpOnly cookies instead and never stores tokens in JS.
 */
export class BearerSession {
  private tokens: StoredTokens | null = null;
  private refreshing: Promise<boolean> | null = null;
  private listeners = new Set<(signedIn: boolean) => void>();
  readonly api: TechRatClient;

  constructor(private readonly baseUrl: string, private readonly storage: TokenStorage, private readonly fetchImpl?: typeof fetch) {
    this.api = createApiClient({
      baseUrl,
      fetch: fetchImpl,
      auth: { kind: "bearer", getAccessToken: () => this.getAccessToken() },
    });
  }

  async restore(): Promise<boolean> {
    const raw = await this.storage.get(KEY);
    this.tokens = raw ? (JSON.parse(raw) as StoredTokens) : null;
    if (this.tokens && needsRefresh(this.tokens)) await this.refresh();
    return this.tokens !== null;
  }

  get isSignedIn() {
    return this.tokens !== null;
  }

  onChange(listener: (signedIn: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async save(tokens: StoredTokens | null) {
    this.tokens = tokens;
    if (tokens) await this.storage.set(KEY, JSON.stringify(tokens));
    else await this.storage.remove(KEY);
    this.listeners.forEach((l) => l(tokens !== null));
  }

  async login(email: string, password: string): Promise<UserSummary> {
    const raw = createApiClient({ baseUrl: this.baseUrl, fetch: this.fetchImpl, auth: { kind: "bearer", getAccessToken: () => null } });
    const result = await unwrap(raw.POST("/api/v1/auth/login", { body: { email, password } }));
    await this.save(parseTokenResponse(result as AccessTokenResponse));
    return unwrap(this.api.GET("/api/v1/users/me"));
  }

  /**
   * Changes (or, with no current password, sets) the password. The API signs every other session out and returns
   * new tokens for this one, which replace the stored ones. Throws ApiError with field errors when refused.
   */
  async changePassword(currentPassword: string | null, newPassword: string): Promise<void> {
    const result = await unwrap(this.api.POST("/api/v1/auth/change-password", { body: { currentPassword, newPassword } }));
    await this.save(parseTokenResponse(result as unknown as AccessTokenResponse));
  }

  /**
   * Permanently deletes the signed-in account. Pass the current password, or (for accounts without one) the username
   * typed as confirmation. On success every token is dropped and listeners see a sign-out; when the API refuses
   * (wrong password, last administrator) the session is kept and an ApiError is thrown.
   */
  async deleteAccount(password: string | null, confirmation: string | null): Promise<void> {
    await unwrap(this.api.DELETE("/api/v1/account", { body: { password, confirmation } }));
    await this.save(null);
  }

  async getAccessToken(): Promise<string | null> {
    if (needsRefresh(this.tokens)) await this.refresh();
    return this.tokens?.accessToken ?? null;
  }

  /** Single-flight refresh: concurrent callers share one network request. */
  refresh(): Promise<boolean> {
    if (!this.tokens) return Promise.resolve(false);
    this.refreshing ??= (async () => {
      try {
        const raw = createApiClient({ baseUrl: this.baseUrl, fetch: this.fetchImpl, auth: { kind: "bearer", getAccessToken: () => null } });
        const result = await unwrap(raw.POST("/api/v1/auth/refresh", { body: { refreshToken: this.tokens!.refreshToken } }));
        await this.save(parseTokenResponse(result as unknown as AccessTokenResponse));
        return true;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 400)) await this.save(null);
        return false;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  async logout(): Promise<void> {
    try {
      if (this.tokens) await this.api.POST("/api/v1/auth/logout");
    } finally {
      await this.save(null);
    }
  }
}

/** In-memory storage for tests and ephemeral sessions. */
export class MemoryTokenStorage implements TokenStorage {
  private map = new Map<string, string>();
  async get(k: string) { return this.map.get(k) ?? null; }
  async set(k: string, v: string) { this.map.set(k, v); }
  async remove(k: string) { this.map.delete(k); }
}
