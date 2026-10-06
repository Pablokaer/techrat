import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@techrat/types";

export type AuthMode =
  /** Web: same-origin requests with an HttpOnly cookie (no token ever touches JS). */
  | { kind: "cookie" }
  /** Mobile / desktop: bearer token supplied by the auth package. */
  | { kind: "bearer"; getAccessToken: () => string | null | Promise<string | null> };

export interface ApiClientOptions {
  /** e.g. "" for same-origin web, "https://api.techrat.dev" for native apps. */
  baseUrl: string;
  auth: AuthMode;
  /** Called on 401 so the app can refresh or sign the user out. Return true to retry once. */
  onUnauthorized?: () => Promise<boolean>;
  fetch?: typeof fetch;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail?: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(detail || title);
    this.name = "ApiError";
  }

  /** First validation message for a field (backend returns camelCase keys). */
  field(name: string): string | undefined {
    return this.errors?.[name]?.[0];
  }
}

interface ProblemBody {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export function createApiClient(options: ApiClientOptions) {
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    credentials: options.auth.kind === "cookie" ? "include" : "omit",
    fetch: options.fetch,
  });

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      if (options.auth.kind === "bearer") {
        const token = await options.auth.getAccessToken();
        if (token) request.headers.set("Authorization", `Bearer ${token}`);
      }
      return request;
    },
  };
  client.use(authMiddleware);
  return client;
}

export type TechRatClient = ReturnType<typeof createApiClient>;

/**
 * Unwraps an openapi-fetch result: returns data or throws a typed ApiError with problem-details info.
 * Usage: const me = await unwrap(api.GET("/api/v1/users/me"));
 */
export async function unwrap<T>(
  promise: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise;
  if (response.ok) return data as T;
  const problem = (error ?? {}) as ProblemBody;
  throw new ApiError(response.status, problem.title ?? response.statusText ?? "Request failed", problem.detail, problem.errors);
}

export function isApiError(e: unknown, status?: number): e is ApiError {
  return e instanceof ApiError && (status === undefined || e.status === status);
}
