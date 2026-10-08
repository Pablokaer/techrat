#!/usr/bin/env node
/**
 * CI check for the Android release: Expo must resolve the public config with the environment of the EAS `production`
 * profile (the build that goes to Google Play), and the result must be store-ready: the final package name, a semantic
 * version, and an https:// API URL. Catching a typo here is cheaper than a failed 15-minute cloud build.
 *
 * TECHRAT_CHECK_API_URL overrides the profile's EXPO_PUBLIC_API_URL; the tests use it to prove the check fails.
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const eas = require("../eas.json");

function fail(message) {
  console.error(`production config check failed: ${message}`);
  process.exit(1);
}

const profileEnv = eas.build?.production?.env ?? {};
const apiUrl = process.env.TECHRAT_CHECK_API_URL ?? profileEnv.EXPO_PUBLIC_API_URL;
if (!apiUrl || !/^https:\/\/[^/\s]/.test(apiUrl)) fail(`EXPO_PUBLIC_API_URL of the production profile must be an https:// URL (got "${apiUrl}")`);

const cli = require.resolve("expo/bin/cli", { paths: [root] });
const run = spawnSync(process.execPath, [cli, "config", "--type", "public", "--json"], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, ...profileEnv, EXPO_PUBLIC_API_URL: apiUrl, EXPO_NO_TELEMETRY: "1" },
});
if (run.status !== 0) fail(`expo config exited with ${run.status}: ${run.stderr || run.stdout}`);

let config;
try {
  config = JSON.parse(run.stdout);
} catch {
  fail("expo config did not print JSON");
}
if (config.android?.package !== "io.techrat.app") fail(`unexpected Android package "${config.android?.package}"`);
if (!/^\d+\.\d+\.\d+$/.test(config.version ?? "")) fail(`version "${config.version}" is not semantic`);

console.log(`production config ok: ${config.android.package} ${config.version} -> ${apiUrl}`);
