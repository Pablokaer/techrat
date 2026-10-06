import type { ReactNode } from "react";
import { Alert, Linking } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClient } from "@techrat/api";
import type { UserSummary } from "@techrat/types";
import { ApiProvider } from "@/lib/api-context";
import { pickAvatar, removeAvatar } from "@/lib/avatar";
import { qk } from "@/lib/queries";
import { AvatarPicker } from "./AvatarPicker";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock("@/lib/avatar", () => ({ ...jest.requireActual("@/lib/avatar"), pickAvatar: jest.fn(), removeAvatar: jest.fn() }));

const user = { id: "u1", displayName: "Alex Dev", avatarUrl: null } as UserSummary;
const api = createApiClient({ baseUrl: "http://api.test", auth: { kind: "bearer", getAccessToken: () => "t" } });

async function setup(u: UserSummary = user) {
  const client = new QueryClient();
  client.setQueryData(qk.me, u);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ApiProvider client={api}>{children}</ApiProvider></QueryClientProvider>
  );
  return { client, ...(await render(<AvatarPicker user={u} />, { wrapper })) };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

describe("AvatarPicker", () => {
  it("opens the crop screen with the picked photo", async () => {
    jest.mocked(pickAvatar).mockResolvedValue({ kind: "picked", uri: "file:///p.jpg", width: 3000, height: 2000 });
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Choose a photo from your gallery" }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith({ pathname: "/avatar-crop", params: { uri: "file:///p.jpg", width: "3000", height: "2000" } }));
    expect(pickAvatar).toHaveBeenCalledWith("library");
  });

  it("offers the camera", async () => {
    jest.mocked(pickAvatar).mockResolvedValue({ kind: "cancelled" });
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
    await waitFor(() => expect(pickAvatar).toHaveBeenCalledWith("camera"));
    expect(mockPush).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("explains a refused permission and links to the settings", async () => {
    jest.mocked(pickAvatar).mockResolvedValue({ kind: "denied", source: "library" });
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Choose a photo from your gallery" }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const [title, , buttons] = jest.mocked(Alert.alert).mock.calls[0];
    expect(title).toBe("Allow photo access");
    buttons!.find((b) => b.text === "Open Settings")!.onPress!();
    expect(openSettings).toHaveBeenCalled();
  });

  it("rejects unsupported files with a clear message", async () => {
    jest.mocked(pickAvatar).mockResolvedValue({ kind: "invalid", problem: "size" });
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Choose a photo from your gallery" }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Photo not supported", "The photo must be 5 MB or smaller."));
  });

  it("removes the photo and updates the signed-in user", async () => {
    const withPhoto = { ...user, avatarUrl: "/api/v1/users/u1/avatar?v=1" };
    jest.mocked(removeAvatar).mockResolvedValue({ ...withPhoto, avatarUrl: null });
    const { client } = await setup(withPhoto);
    await fireEvent.press(screen.getByRole("button", { name: "Remove photo" }));
    await waitFor(() => expect(client.getQueryData<UserSummary>(qk.me)?.avatarUrl).toBeNull());
  });

  it("hides Remove when there is no photo", async () => {
    await setup();
    expect(screen.queryByRole("button", { name: "Remove photo" })).toBeNull();
  });
});
