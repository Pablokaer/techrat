import type { ReactNode } from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClient } from "@techrat/api";
import type { UserSummary } from "@techrat/types";
import { ApiProvider } from "@/lib/api-context";
import { exportAvatar, uploadAvatar } from "@/lib/avatar";
import { qk } from "@/lib/queries";
import { AvatarCropScreen } from "./AvatarCrop";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ uri: "file:///p.jpg", width: "3000", height: "2000" }),
  Stack: { Screen: () => null },
}));
jest.mock("@/lib/avatar", () => ({ ...jest.requireActual("@/lib/avatar"), exportAvatar: jest.fn(), uploadAvatar: jest.fn() }));

const api = createApiClient({ baseUrl: "http://api.test", auth: { kind: "bearer", getAccessToken: () => "t" } });
const updated = { id: "u1", displayName: "Alex", avatarUrl: "/api/v1/users/u1/avatar?v=9" } as UserSummary;

async function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ApiProvider client={api}>{children}</ApiProvider></QueryClientProvider>
  );
  return { client, ...(await render(<AvatarCropScreen />, { wrapper })) };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  jest.mocked(exportAvatar).mockResolvedValue("file:///avatar.jpg");
});

describe("Avatar crop screen", () => {
  it("crops what is inside the circle, uploads it and returns with the new avatar", async () => {
    let finish!: (u: UserSummary) => void;
    jest.mocked(uploadAvatar).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { client } = await setup();
    expect(screen.getByText("Drag to reposition, pinch to zoom.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Zoom in" }));
    await fireEvent.press(screen.getByRole("button", { name: "Save photo" }));

    // 3000×2000 at zoom 1.25: a 1600 px square, centred.
    await waitFor(() => expect(exportAvatar).toHaveBeenCalledWith("file:///p.jpg", { x: 700, y: 200, size: 1600 }));
    expect(uploadAvatar).toHaveBeenCalledWith(api, "file:///avatar.jpg");
    expect(screen.getByRole("button", { name: "Uploading…" })).toBeDisabled();

    await act(async () => finish(updated));
    expect(client.getQueryData<UserSummary>(qk.me)).toEqual(updated);
    expect(mockBack).toHaveBeenCalled();
  });

  it("stays on the screen and explains when the upload fails", async () => {
    jest.mocked(uploadAvatar).mockRejectedValue(new Error("network"));
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Save photo" }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Upload failed", "Could not upload the photo. Try again."));
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save photo" })).toBeEnabled();
  });

  it("cancel goes back without uploading", async () => {
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(mockBack).toHaveBeenCalled();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("zoom out stops at the smallest zoom", async () => {
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Zoom out" }));
    await fireEvent.press(screen.getByRole("button", { name: "Save photo" }));
    await waitFor(() => expect(exportAvatar).toHaveBeenCalledWith("file:///p.jpg", { x: 500, y: 0, size: 2000 }));
  });
});
