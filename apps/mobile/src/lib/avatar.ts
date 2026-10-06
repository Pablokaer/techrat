import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { unwrap, type TechRatClient } from "@techrat/api";
import type { UserSummary } from "@techrat/types";
import { AVATAR_OUTPUT_SIZE, checkAvatarFile, type AvatarFileProblem } from "@techrat/validation";

export type AvatarSource = "camera" | "library";

export type PickResult =
  | { kind: "picked"; uri: string; width: number; height: number }
  | { kind: "cancelled" }
  | { kind: "denied"; source: AvatarSource }
  | { kind: "invalid"; problem: AvatarFileProblem };

/** User-facing texts of the photo flow (the mobile app is English-only for now; see README "Known limitations"). */
export const AVATAR_TEXT = {
  invalidTitle: "Photo not supported",
  type: "Use a JPG, PNG, WEBP or HEIC image.",
  size: "The photo must be 5 MB or smaller.",
  deniedTitle: { library: "Allow photo access", camera: "Allow camera access" },
  deniedText: {
    library: "TechRat needs access to your photos to set a profile photo. You can allow it in Settings.",
    camera: "TechRat needs the camera to take a profile photo. You can allow it in Settings.",
  },
  uploadFailedTitle: "Upload failed",
  uploadFailed: "Could not upload the photo. Try again.",
  removeFailed: "Could not remove the photo. Try again.",
};

/**
 * Asks for the right permission, opens the gallery or the camera and checks the picked file (format and 5 MB limit,
 * shared with the web). The platform's own crop is not used: the circular crop happens on the next screen.
 */
export async function pickAvatar(source: AvatarSource): Promise<PickResult> {
  const permission = source === "camera"
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { kind: "denied", source };

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsEditing: false };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return { kind: "cancelled" };

  const asset = result.assets[0];
  const problem = checkAvatarFile({ type: asset.mimeType, size: asset.fileSize, name: asset.fileName });
  if (problem) return { kind: "invalid", problem };
  return { kind: "picked", uri: asset.uri, width: asset.width, height: asset.height };
}

/** Crops the square behind the circle, scales it to 512×512 and saves a compressed JPEG (also converts HEIC). */
export async function exportAvatar(uri: string, rect: { x: number; y: number; size: number }): Promise<string> {
  const image = await ImageManipulator.manipulate(uri)
    .crop({ originX: rect.x, originY: rect.y, width: rect.size, height: rect.size })
    .resize({ width: AVATAR_OUTPUT_SIZE, height: AVATAR_OUTPUT_SIZE })
    .renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

/** Uploads the exported photo; React Native's FormData streams the file from its local uri. */
export async function uploadAvatar(api: TechRatClient, uri: string): Promise<UserSummary> {
  const form = new FormData();
  form.append("file", { uri, name: "avatar.jpg", type: "image/jpeg" } as unknown as Blob);
  return unwrap(api.PUT("/api/v1/users/me/avatar", { body: {}, bodySerializer: () => form }));
}

export function removeAvatar(api: TechRatClient): Promise<UserSummary> {
  return unwrap(api.DELETE("/api/v1/users/me/avatar"));
}
