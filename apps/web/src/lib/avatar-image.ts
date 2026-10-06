"use client";

import { AVATAR_OUTPUT_SIZE } from "@techrat/validation";

/** A decoded image ready for the crop UI. Call release() when done to free the object URL. */
export interface LoadedImage {
  src: string;
  width: number;
  height: number;
  release: () => void;
}

/**
 * Decodes a picked file through an object URL. Rejects when the browser cannot read it (HEIC outside Safari, a
 * corrupt file), so the caller can explain instead of showing a broken image.
 */
export function loadImage(file: Blob): Promise<LoadedImage> {
  const src = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(src) });
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("The image could not be decoded"));
    };
    img.src = src;
  });
}

/**
 * Draws the cropped square into a 512×512 canvas and compresses it. WEBP when the browser can encode it, otherwise
 * JPEG (older Safari); both stay far below the API's 1 MB limit.
 */
export async function exportAvatar(src: string, rect: { x: number; y: number; size: number }): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, rect.x, rect.y, rect.size, rect.size, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("The photo could not be encoded");
  return jpeg;
}
