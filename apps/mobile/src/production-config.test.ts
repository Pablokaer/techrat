import { spawnSync } from "node:child_process";
import path from "node:path";

const MOBILE = path.resolve(__dirname, "..");
const script = path.join(MOBILE, "scripts", "check-production-config.cjs");

/**
 * CI runs the same script: Expo must be able to resolve the public config with the environment of the EAS production
 * profile (the one that goes to Google Play), and the result must be the store-ready one.
 */
describe("check-production-config", () => {
  jest.setTimeout(120_000);

  it("resolves the public Expo config for the production profile and reports the package and version", () => {
    const run = spawnSync(process.execPath, [script], { cwd: MOBILE, encoding: "utf8" });
    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
    expect(run.stdout).toMatch(/production config ok: io\.techrat\.app \d+\.\d+\.\d+ -> https:\/\/techrat\.io/);
  });

  it("fails when the production profile points the app at a plain HTTP API", () => {
    const run = spawnSync(process.execPath, [script], {
      cwd: MOBILE,
      encoding: "utf8",
      env: { ...process.env, TECHRAT_CHECK_API_URL: "http://techrat.io" },
    });
    expect(run.status).not.toBe(0);
    expect(run.stderr).toMatch(/https/);
  });
});
