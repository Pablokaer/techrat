import { expect, test } from "@playwright/test";

/**
 * The Android app talks to https://techrat.io/api/v1/..., which is the Next.js `/api` proxy in front of the API. This
 * walks the exact calls the app makes (bearer login without cookies, authenticated request, refresh) through that proxy
 * and checks that the Authorization header and the refresh flow survive it.
 */
test("bearer login, authenticated calls and refresh work through the web /api proxy", async ({ request }) => {
  const username = `bearer_${Date.now().toString().slice(-8)}`;
  const email = `${username}@example.com`;
  const password = "Passw0rdX";

  const registered = await request.post("/api/v1/auth/register", { data: { email, username, password, displayName: "Bearer Rat" } });
  expect(registered.status()).toBe(201);

  // Mobile does not pass useCookies: the response carries the tokens and sets no cookie.
  const login = await request.post("/api/v1/auth/login", { data: { email, password } });
  expect(login.status()).toBe(200);
  expect(login.headers()["set-cookie"]).toBeUndefined();
  const tokens = await login.json();
  expect(tokens.accessToken).toBeTruthy();
  expect(tokens.refreshToken).toBeTruthy();

  // Authorization reaches the API; without it the same request is rejected.
  const me = await request.get("/api/v1/users/me", { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  expect(me.status()).toBe(200);
  expect((await me.json()).email).toBe(email);
  expect((await request.get("/api/v1/users/me")).status()).toBe(401);

  // Refresh returns a new pair, and the new access token works.
  const refreshed = await request.post("/api/v1/auth/refresh", { data: { refreshToken: tokens.refreshToken } });
  expect(refreshed.status()).toBe(200);
  const next = await refreshed.json();
  expect(next.accessToken).toBeTruthy();
  const again = await request.get("/api/v1/users/me", { headers: { Authorization: `Bearer ${next.accessToken}` } });
  expect(again.status()).toBe(200);
});
