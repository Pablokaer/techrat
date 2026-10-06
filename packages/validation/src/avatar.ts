/**
 * Profile photo rules and crop geometry, shared by web/desktop and mobile so both crop the same way.
 *
 * The crop UI shows the picked image behind a circular window of `viewport` px. The image always covers the window
 * (zoom 1 = the short side fills it), and `x`/`y` move the image centre away from the window centre, in viewport px.
 * The saved photo is the square behind the window, exported at AVATAR_OUTPUT_SIZE and shown as a circle everywhere.
 */

/** Formats the picker accepts. HEIC/HEIF only work where the platform can decode them (iOS, Safari, macOS). */
export const AVATAR_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
const AVATAR_INPUT_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
/** Largest picked file. The uploaded result is much smaller (cropped, 512×512, compressed). */
export const AVATAR_MAX_INPUT_BYTES = 5 * 1024 * 1024;
/** Side of the exported square, in px. */
export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_MAX_ZOOM = 4;

export type AvatarFileProblem = "type" | "size";

/**
 * Checks a picked file before it is decoded. Browsers often report HEIC files with an empty type, so the extension
 * decides when the type is missing.
 */
export function checkAvatarFile(file: { type?: string | null; size?: number | null; name?: string | null }): AvatarFileProblem | null {
  const type = (file.type ?? "").toLowerCase();
  const extension = (file.name ?? "").split(".").pop()?.toLowerCase() ?? "";
  const known = type ? (AVATAR_INPUT_TYPES as readonly string[]).includes(type) : AVATAR_INPUT_EXTENSIONS.includes(extension);
  if (!known) return "type";
  if ((file.size ?? 0) > AVATAR_MAX_INPUT_BYTES) return "size";
  return null;
}

export interface CropState {
  /** 1 = the image's short side fills the window; up to AVATAR_MAX_ZOOM. */
  zoom: number;
  /** Image centre offset from the window centre, in viewport px. */
  x: number;
  y: number;
}

export interface ImageSize {
  width: number;
  height: number;
}

/** Scale (viewport px per image px) at which the image is shown for a given zoom. */
export function displayScale(zoom: number, image: ImageSize, viewport: number): number {
  return (viewport / Math.min(image.width, image.height)) * zoom;
}

/** Keeps zoom in range and the image covering the whole window (no empty corners in the saved photo). */
export function clampCrop(state: CropState, image: ImageSize, viewport: number): CropState {
  const zoom = Math.min(AVATAR_MAX_ZOOM, Math.max(1, state.zoom));
  const scale = displayScale(zoom, image, viewport);
  const maxX = (image.width * scale - viewport) / 2;
  const maxY = (image.height * scale - viewport) / 2;
  const clamp = (v: number, max: number) => (max <= 0 ? 0 : Math.min(max, Math.max(-max, v)));
  // "+ 0" turns -0 into 0, so a centred crop compares equal to { x: 0, y: 0 }.
  return { zoom, x: clamp(state.x, maxX) + 0, y: clamp(state.y, maxY) + 0 };
}

/** Changes the zoom around the window centre and re-clamps the position. */
export function zoomCrop(state: CropState, zoom: number, image: ImageSize, viewport: number): CropState {
  const target = Math.min(AVATAR_MAX_ZOOM, Math.max(1, zoom));
  const ratio = target / state.zoom;
  return clampCrop({ zoom: target, x: state.x * ratio, y: state.y * ratio }, image, viewport);
}

/** The square of the source image behind the window, in image px (integers, inside the image). */
export function cropRect(state: CropState, image: ImageSize, viewport: number): { x: number; y: number; size: number } {
  const s = clampCrop(state, image, viewport);
  const scale = displayScale(s.zoom, image, viewport);
  const size = Math.min(image.width, image.height, Math.round(viewport / scale));
  const x = Math.round((image.width * scale / 2 - s.x - viewport / 2) / scale);
  const y = Math.round((image.height * scale / 2 - s.y - viewport / 2) / scale);
  return {
    x: Math.min(Math.max(0, x), image.width - size),
    y: Math.min(Math.max(0, y), image.height - size),
    size,
  };
}
