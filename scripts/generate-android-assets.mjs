// Regenerates the Android launcher icons, the splash image and the Google Play listing graphics from the rat artwork.
//
//   node scripts/generate-android-assets.mjs        (or: npm run assets:android -w @techrat/mobile)
//
// Why a script: Android crops adaptive icons to a circle/squircle, so the artwork must sit inside the 66dp safe circle
// of the 108dp canvas, and the rat artwork touches its own edges. Doing it by hand is easy to get wrong and impossible
// to review, so the geometry lives here and `apps/mobile/src/assets.test.ts` checks the result.
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOBILE = path.join(ROOT, "apps/mobile");
const SOURCE = path.join(MOBILE, "assets/rat.png");
const WORDMARK = path.join(ROOT, "apps/web/public/brand/logo-full.png");
const BLACK = "#000000";
const CANVAS = 1024;
// Visible circle of an adaptive icon: 66dp of the 108dp canvas. Keep a few pixels of margin for anti-aliasing.
const SAFE_RADIUS = (CANVAS * 66) / 108 / 2 - 4;

/** The distance from the canvas centre to the farthest visible pixel (alpha above a small threshold). */
async function farthestVisiblePixel(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cx = (info.width - 1) / 2;
  const cy = (info.height - 1) / 2;
  let farthest = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 8) farthest = Math.max(farthest, Math.hypot(x - cx, y - cy));
  return farthest;
}

/** The artwork centred on a transparent square canvas, `width` pixels wide. */
async function onTransparentCanvas(art, width, size = CANVAS) {
  const resized = await sharp(art).resize({ width, fit: "inside" }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toBuffer();
}

/** The widest artwork that still fits the launcher's safe circle (binary search over the width). */
async function foregroundInsideSafeCircle(art) {
  let low = 200;
  let high = 900;
  let best = await onTransparentCanvas(art, low);
  while (high - low > 4) {
    const mid = Math.round((low + high) / 2);
    const candidate = await onTransparentCanvas(art, mid);
    if ((await farthestVisiblePixel(candidate)) <= SAFE_RADIUS) {
      best = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }
  return best;
}

async function write(file, pipeline) {
  await pipeline.toFile(file);
  console.log("wrote", path.relative(ROOT, file));
}

const art = await sharp(SOURCE).trim().toBuffer();
const foreground = await foregroundInsideSafeCircle(art);

// Adaptive icon foreground (the black background colour is set in app.json) and the splash image share the geometry.
await write(path.join(MOBILE, "assets/adaptive-icon.png"), sharp(foreground));
await write(path.join(MOBILE, "assets/splash-icon.png"), sharp(foreground));

// Themed (monochrome) icon, Android 13+: the system tints the alpha mask, so the colour does not matter, only the shape.
const white = sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } });
await write(path.join(MOBILE, "assets/monochrome-icon.png"), white.composite([{ input: foreground, blend: "dest-in" }]).png());

// Full-bleed square icon (used by iOS, which rejects transparency, and by the legacy Android launcher).
const iconArt = await onTransparentCanvas(art, 860);
const icon = await sharp({ create: { width: CANVAS, height: CANVAS, channels: 3, background: BLACK } })
  .composite([{ input: iconArt }])
  .png()
  .toBuffer();
await write(path.join(MOBILE, "assets/icon.png"), sharp(icon).removeAlpha().png());

// Google Play listing: 512x512 32-bit PNG (Play applies its own mask) and a placeholder feature graphic.
await write(path.join(MOBILE, "store/play-store-icon-512.png"), sharp(icon).resize(512, 512).ensureAlpha().png({ compressionLevel: 9 }));

const wordmark = await sharp(WORDMARK).resize({ height: 400, fit: "inside" }).toBuffer();
const glow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500"><defs>
  <radialGradient id="g" cx="50%" cy="50%" r="65%"><stop offset="0" stop-color="#0f2a0f"/><stop offset="1" stop-color="${BLACK}"/></radialGradient>
  </defs><rect width="1024" height="500" fill="url(#g)"/></svg>`);
await write(
  path.join(MOBILE, "store/feature-graphic-1024x500.png"),
  sharp(glow).composite([{ input: wordmark, gravity: "center" }]).png({ compressionLevel: 9 }),
);
