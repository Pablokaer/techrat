import * as ImagePicker from "expo-image-picker";
import { ImageManipulator } from "expo-image-manipulator";
import { createApiClient } from "@techrat/api";
import { exportAvatar, pickAvatar, removeAvatar, uploadAvatar } from "./avatar";

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));
const saveAsync = jest.fn();
const context = { crop: jest.fn(), resize: jest.fn(), renderAsync: jest.fn(async () => ({ saveAsync })) };
jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" },
}));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const asset = (overrides: Partial<ImagePicker.ImagePickerAsset> = {}) =>
  ({ uri: "file:///photo.jpg", width: 3000, height: 2000, mimeType: "image/jpeg", fileSize: 1_000_000, fileName: "photo.jpg", ...overrides }) as ImagePicker.ImagePickerAsset;
const granted = { granted: true, status: "granted" } as ImagePicker.MediaLibraryPermissionResponse;
const denied = { granted: false, status: "denied", canAskAgain: false } as ImagePicker.MediaLibraryPermissionResponse;

beforeEach(() => {
  jest.clearAllMocks();
  picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(granted);
  picker.requestCameraPermissionsAsync.mockResolvedValue(granted as ImagePicker.CameraPermissionResponse);
  context.crop.mockReturnValue(context);
  context.resize.mockReturnValue(context);
  jest.mocked(ImageManipulator.manipulate).mockReturnValue(context as never);
});

describe("pickAvatar", () => {
  it("asks for photo library access and reports a refusal without opening the picker", async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(denied);
    expect(await pickAvatar("library")).toEqual({ kind: "denied", source: "library" });
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it("uses the camera permission and camera for photos taken now", async () => {
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [asset()] });
    expect(await pickAvatar("camera")).toEqual({ kind: "picked", uri: "file:///photo.jpg", width: 3000, height: 2000 });
    expect(picker.requestCameraPermissionsAsync).toHaveBeenCalled();
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it("reports when the user cancels", async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    expect(await pickAvatar("library")).toEqual({ kind: "cancelled" });
  });

  it("accepts HEIC and rejects other formats and files over 5 MB", async () => {
    picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [asset({ mimeType: "image/heic", fileName: "IMG_1.HEIC" })] });
    expect((await pickAvatar("library")).kind).toBe("picked");
    picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [asset({ mimeType: "image/gif", fileName: "a.gif" })] });
    expect(await pickAvatar("library")).toEqual({ kind: "invalid", problem: "type" });
    picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets: [asset({ fileSize: 6 * 1024 * 1024 })] });
    expect(await pickAvatar("library")).toEqual({ kind: "invalid", problem: "size" });
  });
});

describe("exportAvatar", () => {
  it("crops the square, resizes it to 512×512 and saves a compressed JPEG", async () => {
    saveAsync.mockResolvedValue({ uri: "file:///avatar.jpg", width: 512, height: 512 });
    expect(await exportAvatar("file:///photo.jpg", { x: 500, y: 0, size: 2000 })).toBe("file:///avatar.jpg");
    expect(ImageManipulator.manipulate).toHaveBeenCalledWith("file:///photo.jpg");
    expect(context.crop).toHaveBeenCalledWith({ originX: 500, originY: 0, width: 2000, height: 2000 });
    expect(context.resize).toHaveBeenCalledWith({ width: 512, height: 512 });
    expect(saveAsync).toHaveBeenCalledWith({ compress: 0.8, format: "jpeg" });
  });
});

describe("upload and remove", () => {
  const user = { id: "u1", avatarUrl: "/api/v1/users/u1/avatar?v=1" };
  const fetchMock = jest.fn(async (_req: Request) => new Response(JSON.stringify(user), { status: 200, headers: { "Content-Type": "application/json" } }));
  const api = createApiClient({ baseUrl: "http://api.test", auth: { kind: "bearer", getAccessToken: () => "token" }, fetch: fetchMock as unknown as typeof fetch });

  it("uploads the photo as multipart and returns the updated user", async () => {
    expect(await uploadAvatar(api, "file:///avatar.jpg")).toEqual(user);
    const req = fetchMock.mock.calls[0][0];
    expect(req.method).toBe("PUT");
    expect(req.url).toBe("http://api.test/api/v1/users/me/avatar");
    expect(req.headers.get("Authorization")).toBe("Bearer token");
  });

  it("removes the photo", async () => {
    fetchMock.mockClear();
    await removeAvatar(api);
    expect(fetchMock.mock.calls[0][0].method).toBe("DELETE");
  });
});
