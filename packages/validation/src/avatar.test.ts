import { describe, expect, it } from "vitest";
import { AVATAR_MAX_INPUT_BYTES, checkAvatarFile, clampCrop, cropRect, zoomCrop } from "./avatar";

describe("checkAvatarFile", () => {
  it("accepts JPG, PNG, WEBP and HEIC up to 5 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])
      expect(checkAvatarFile({ type, size: 1000, name: "a" })).toBeNull();
    expect(checkAvatarFile({ type: "image/png", size: AVATAR_MAX_INPUT_BYTES, name: "a.png" })).toBeNull();
  });

  it("falls back to the extension when the platform reports no type (HEIC in most browsers)", () => {
    expect(checkAvatarFile({ type: "", size: 1000, name: "IMG_0001.HEIC" })).toBeNull();
    expect(checkAvatarFile({ type: "", size: 1000, name: "notes.txt" })).toBe("type");
  });

  it("rejects other formats and files over the limit", () => {
    expect(checkAvatarFile({ type: "image/gif", size: 1000, name: "a.gif" })).toBe("type");
    expect(checkAvatarFile({ type: "application/pdf", size: 1000, name: "a.pdf" })).toBe("type");
    expect(checkAvatarFile({ type: "image/jpeg", size: AVATAR_MAX_INPUT_BYTES + 1, name: "a.jpg" })).toBe("size");
  });
});

describe("crop geometry", () => {
  const landscape = { width: 2000, height: 1000 };
  const viewport = 200;

  it("at zoom 1 the image covers the circle and the crop is the centred square of the short side", () => {
    expect(cropRect({ zoom: 1, x: 0, y: 0 }, landscape, viewport)).toEqual({ x: 500, y: 0, size: 1000 });
  });

  it("dragging moves the crop the opposite way, and never past the image edge", () => {
    // Dragging the image 50 px right shows more of its left side.
    expect(cropRect({ zoom: 1, x: 50, y: 0 }, landscape, viewport)).toEqual({ x: 250, y: 0, size: 1000 });
    expect(clampCrop({ zoom: 1, x: 10_000, y: 30 }, landscape, viewport)).toEqual({ zoom: 1, x: 100, y: 0 });
    expect(cropRect({ zoom: 1, x: -10_000, y: 0 }, landscape, viewport)).toEqual({ x: 1000, y: 0, size: 1000 });
  });

  it("zooming in shrinks the cropped square and keeps it inside the image", () => {
    expect(cropRect({ zoom: 2, x: 0, y: 0 }, landscape, viewport)).toEqual({ x: 750, y: 250, size: 500 });
    const zoomedOut = zoomCrop({ zoom: 3, x: 400, y: 200 }, 1, landscape, viewport);
    expect(zoomedOut).toEqual({ zoom: 1, x: 100, y: 0 });
  });

  it("zoom stays between 1 and the maximum", () => {
    expect(zoomCrop({ zoom: 1, x: 0, y: 0 }, 0.2, landscape, viewport).zoom).toBe(1);
    expect(zoomCrop({ zoom: 1, x: 0, y: 0 }, 99, landscape, viewport).zoom).toBe(4);
  });
});
