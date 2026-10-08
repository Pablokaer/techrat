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
