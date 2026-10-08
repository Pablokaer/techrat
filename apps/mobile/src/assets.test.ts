import path from "node:path";
import sharp from "sharp";

const MOBILE = path.resolve(__dirname, "..");
const asset = (name: string) => path.join(MOBILE, "assets", name);
const store = (name: string) => path.join(MOBILE, "store", name);

/** Android adaptive icons are 108dp squares whose visible circle is 66dp: keep the art inside it. */
const SAFE_DIAMETER_RATIO = 66 / 108;

async function alphaExtent(file: string) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let farthest = 0;
  let painted = 0;
  const cx = (info.width - 1) / 2;
  const cy = (info.height - 1) / 2;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        painted++;
        farthest = Math.max(farthest, Math.hypot(x - cx, y - cy));
      }
    }
  }
  return { farthest, painted, size: info.width };
}

describe("Android launcher and store graphics", () => {
  it("icon.png is a 1024x1024 opaque square (iOS rejects transparency)", async () => {
    const meta = await sharp(asset("icon.png")).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1024]);
    expect(meta.hasAlpha).toBe(false);
  });

  it("adaptive-icon.png is 1024x1024, transparent, with the art inside the launcher's safe circle", async () => {
    const meta = await sharp(asset("adaptive-icon.png")).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1024]);
    expect(meta.hasAlpha).toBe(true);
    const { farthest, painted, size } = await alphaExtent(asset("adaptive-icon.png"));
    expect(painted).toBeGreaterThan(20_000);
    expect(painted).toBeLessThan(size * size * 0.5); // the corners stay transparent
    expect(farthest).toBeLessThanOrEqual((size * SAFE_DIAMETER_RATIO) / 2 + 2);
  });

  it("monochrome-icon.png is a single-colour silhouette for themed icons, inside the safe circle", async () => {
    const meta = await sharp(asset("monochrome-icon.png")).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1024]);
    expect(meta.hasAlpha).toBe(true);
    const { data } = await sharp(asset("monochrome-icon.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const colours = new Set<string>();
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 8) colours.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    expect(colours.size).toBe(1);
    const { farthest, size } = await alphaExtent(asset("monochrome-icon.png"));
    expect(farthest).toBeLessThanOrEqual((size * SAFE_DIAMETER_RATIO) / 2 + 2);
  });

  it("splash-icon.png is a transparent 1024x1024 square with the art in the centre", async () => {
    const meta = await sharp(asset("splash-icon.png")).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 1024]);
    expect(meta.hasAlpha).toBe(true);
    const { farthest, size } = await alphaExtent(asset("splash-icon.png"));
    expect(farthest).toBeLessThanOrEqual((size * SAFE_DIAMETER_RATIO) / 2 + 2);
  });

  it("the Play Store icon is a 512x512 32-bit PNG under the 1 MB limit", async () => {
    const file = store("play-store-icon-512.png");
    const meta = await sharp(file).metadata();
    expect([meta.width, meta.height]).toEqual([512, 512]);
    expect(meta.channels).toBe(4);
    expect(meta.depth).toBe("uchar");
    expect((await sharp(file).toBuffer()).length).toBeLessThan(1024 * 1024);
  });

  it("the Play Store feature graphic is 1024x500", async () => {
    const meta = await sharp(store("feature-graphic-1024x500.png")).metadata();
    expect([meta.width, meta.height]).toEqual([1024, 500]);
  });
});
