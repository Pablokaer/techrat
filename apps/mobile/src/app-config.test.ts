import fs from "node:fs";
import path from "node:path";

const MOBILE = path.resolve(__dirname, "..");
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(MOBILE, file), "utf8"));
const exists = (file: string) => fs.existsSync(path.join(MOBILE, file));

const app = read("app.json").expo;
const eas = read("eas.json");

type Plugin = string | [string, Record<string, unknown>];
const plugin = (name: string) => (app.plugins as Plugin[]).find((p) => (Array.isArray(p) ? p[0] : p) === name);

/**
 * The package name can never change after the first Play upload, so it is pinned here, together with everything a
 * production build depends on. A failing test in this file means a store-facing setting was changed on purpose or by
 * accident: check it before releasing.
 */
describe("store identity", () => {
  it("is linked to the Expo project, whose slug EAS requires to match app.json", () => {
    expect(app.extra.eas.projectId).toBe("850a5f55-9141-45c7-a55b-cb8a586b9e2f");
    expect(app.owner).toBe("climboulths-team");
    // The Expo project was created as "pablo-carvalho"; `eas build` fails with a slug mismatch otherwise.
    expect(app.slug).toBe("pablo-carvalho");
  });

  it("uses the techrat.io package name on both platforms", () => {
    expect(app.android.package).toBe("io.techrat.app");
    expect(app.ios.bundleIdentifier).toBe("io.techrat.app");
  });

  it("has a user-facing semantic version and leaves versionCode to EAS remote versioning", () => {
    expect(app.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(app.android.versionCode).toBeUndefined();
    expect(app.ios.buildNumber).toBeUndefined();
    expect(eas.cli.appVersionSource).toBe("remote");
  });
});

describe("Android permissions", () => {
  it("blocks permissions the app has no use for", () => {
    expect(app.android.blockedPermissions).toEqual(
      expect.arrayContaining([
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.SYSTEM_ALERT_WINDOW",
      ]),
    );
  });

  it("blocks the biometric permissions expo-secure-store adds, since tokens are never stored behind a fingerprint", () => {
    expect(app.android.blockedPermissions).toEqual(
      expect.arrayContaining(["android.permission.USE_BIOMETRIC", "android.permission.USE_FINGERPRINT"]),
    );
  });

  it("does not ask the image picker for the microphone", () => {
    const picker = plugin("expo-image-picker") as [string, { microphonePermission?: unknown }];
    expect(picker[1].microphonePermission).toBe(false);
  });
});

describe("network security", () => {
  it("does not enable cleartext HTTP in the app config (development builds get it from the debug manifest)", () => {
    expect(JSON.stringify(app)).not.toMatch(/usesCleartextTraffic/i);
  });

  it("points preview and production builds at the HTTPS API", () => {
    expect(eas.build.preview.env.EXPO_PUBLIC_API_URL).toBe("https://techrat.io");
    expect(eas.build.production.env.EXPO_PUBLIC_API_URL).toBe("https://techrat.io");
  });
});

describe("EAS profiles", () => {
  it("builds an installable apk for preview and an app bundle for production", () => {
    expect(eas.build.preview.android.buildType).toBe("apk");
    expect(eas.build.preview.distribution).toBe("internal");
    expect(eas.build.production.android.buildType).toBe("app-bundle");
    expect(eas.build.production.autoIncrement).toBe(true);
  });

  it("keeps a development client profile for internal testing", () => {
    expect(eas.build.development.developmentClient).toBe(true);
    expect(eas.build.development.distribution).toBe("internal");
  });
});

/**
 * Store submissions (ADR-0047): `eas submit` sends a production build to Play as a draft release, so a person still
 * presses "Roll out" in the Play Console, and the Google service-account key lives in the Expo account, not here.
 */
describe("Play submissions", () => {
  it("submits to internal testing, or to closed testing, as a draft release", () => {
    expect(eas.submit.production.android).toEqual({ track: "internal", releaseStatus: "draft" });
    expect(eas.submit.closed.android).toEqual({ track: "alpha", releaseStatus: "draft" });
  });

  it("keeps the Google service-account key out of the repository", () => {
    expect(JSON.stringify(eas.submit)).not.toMatch(/serviceAccountKeyPath/);
    expect(fs.readdirSync(MOBILE).filter((f) => /service-account|play-key|google.*\.json/i.test(f))).toEqual([]);
  });
});

describe("Android release workflow", () => {
  const workflow = fs.readFileSync(path.join(MOBILE, "../../.github/workflows/android-release.yml"), "utf8");

  it("runs only for an android-v tag or by hand, never on a push to a branch", () => {
    expect(workflow).toMatch(/tags:\s*\[\s*"android-v\*"\s*\]/);
    expect(workflow).toMatch(/workflow_dispatch:/);
    expect(workflow).not.toMatch(/branches:/);
    expect(workflow).not.toMatch(/pull_request/);
  });

  it("refuses a tag whose version differs from app.json or that is not on main", () => {
    expect(workflow).toContain("expo.version");
    expect(workflow).toContain("git merge-base --is-ancestor");
  });

  it("builds and submits only after an approval in the google-play environment, with the Expo token", () => {
    expect(workflow).toMatch(/environment:\s*google-play/);
    expect(workflow).toContain("secrets.EXPO_TOKEN");
    expect(workflow).toMatch(/eas build --platform android --profile production --auto-submit-with-profile "\$PROFILE"/);
  });

  it("sets a timeout on every job", () => {
    const jobsSection = workflow.slice(workflow.indexOf("\njobs:"));
    const jobs = jobsSection.match(/^ {2}[a-z-]+:\s*$/gm) ?? [];
    expect(jobs.length).toBeGreaterThan(0);
    expect((jobsSection.match(/^ {4}timeout-minutes:/gm) ?? []).length).toBe(jobs.length);
  });
});

describe("icons and splash", () => {
  it("points the launcher icons at files that exist", () => {
    for (const file of [app.icon, app.android.adaptiveIcon.foregroundImage, app.android.adaptiveIcon.monochromeImage]) {
      expect(exists(file)).toBe(true);
    }
    expect(app.android.adaptiveIcon.foregroundImage).toBe("./assets/adaptive-icon.png");
    expect(app.android.adaptiveIcon.backgroundColor).toBe("#000000");
  });

  it("configures the splash screen on the app's dark background", () => {
    const splash = plugin("expo-splash-screen") as [string, { image: string; backgroundColor: string }];
    expect(Array.isArray(splash)).toBe(true);
    expect(splash[1].backgroundColor).toBe("#000000");
    expect(exists(splash[1].image)).toBe(true);
  });
});
