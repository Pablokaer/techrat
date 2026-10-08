import { DELETE_ACCOUNT_URL, PRIVACY_URL, TERMS_URL, resolveWebUrl, resolveApiUrl } from "./config";

describe("resolveApiUrl in development", () => {
  it("uses the emulator alias for the host machine on Android when nothing is configured", () => {
    expect(resolveApiUrl(undefined, "android", true)).toBe("http://10.0.2.2:5080");
  });

  it("uses localhost on iOS and other targets when nothing is configured", () => {
    expect(resolveApiUrl("", "ios", true)).toBe("http://localhost:5080");
    expect(resolveApiUrl("   ", "web", true)).toBe("http://localhost:5080");
  });

  it("lets EXPO_PUBLIC_API_URL win and accepts plain HTTP for LAN testing", () => {
    expect(resolveApiUrl("http://192.168.1.20:5080/", "android", true)).toBe("http://192.168.1.20:5080");
  });
});

describe("resolveApiUrl in a release build", () => {
  it("returns the configured HTTPS URL without a trailing slash", () => {
    expect(resolveApiUrl("https://techrat.io/", "android", false)).toBe("https://techrat.io");
  });

  it("refuses to start without a URL instead of falling back to the emulator or localhost", () => {
    expect(() => resolveApiUrl(undefined, "android", false)).toThrow(/EXPO_PUBLIC_API_URL/);
    expect(() => resolveApiUrl("  ", "ios", false)).toThrow(/EXPO_PUBLIC_API_URL/);
  });

  it("refuses a plain HTTP URL, because release builds must not send tokens in the clear", () => {
    expect(() => resolveApiUrl("http://techrat.io", "android", false)).toThrow(/https/);
    expect(() => resolveApiUrl("http://10.0.2.2:5080", "android", false)).toThrow(/https/);
  });

  it("refuses a value that is not a URL at all", () => {
    expect(() => resolveApiUrl("techrat.io", "android", false)).toThrow(/https/);
  });
});

describe("resolveWebUrl", () => {
  it("lets EXPO_PUBLIC_WEB_URL win, without a trailing slash", () => {
    expect(resolveWebUrl("http://localhost:3000/", "https://techrat.io")).toBe("http://localhost:3000");
  });

  it("falls back to the API URL, which is served behind the web origin in production", () => {
    expect(resolveWebUrl(undefined, "https://techrat.io")).toBe("https://techrat.io");
    expect(resolveWebUrl("  ", "https://techrat.io/")).toBe("https://techrat.io");
  });

  it("exposes the public legal and account pages", () => {
    expect(PRIVACY_URL).toMatch(/\/privacy$/);
    expect(TERMS_URL).toMatch(/\/terms$/);
    expect(DELETE_ACCOUNT_URL).toMatch(/\/account\/delete$/);
  });
});
