import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError, createApiClient } from "@techrat/api";
import { ApiProvider } from "@/lib/api-context";
import { qk } from "@/lib/queries";
import { ChangePasswordScreen } from "./ChangePasswordScreen";

const mockChangePassword = jest.fn();
jest.mock("@/lib/auth", () => ({ useAuth: () => ({ changePassword: mockChangePassword }) }));

const api = createApiClient({ baseUrl: "http://api.test", auth: { kind: "bearer", getAccessToken: () => "t" } });

async function setup(hasPassword = true) {
  const client = new QueryClient();
  client.setQueryData(qk.passwordStatus, { hasPassword });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ApiProvider client={api}>{children}</ApiProvider></QueryClientProvider>
  );
  return { client, ...(await render(<ChangePasswordScreen />, { wrapper })) };
}

async function fill(current: string | null, password: string, confirm: string) {
  if (current !== null) await fireEvent.changeText(screen.getByLabelText("Current password"), current);
  await fireEvent.changeText(screen.getByLabelText("New password"), password);
  await fireEvent.changeText(screen.getByLabelText("Confirm new password"), confirm);
}

beforeEach(() => mockChangePassword.mockReset());

describe("Change password screen", () => {
  it("validates with the sign-up rules before calling the API", async () => {
    await setup();
    await fill("OldPassw0rd", "weak", "other");
    await fireEvent.press(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByText("At least 8 characters")).toBeTruthy();
    expect(screen.getByText("Passwords do not match")).toBeTruthy();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("shows and hides a password", async () => {
    await setup();
    const input = screen.getByLabelText("New password");
    expect(input.props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getAllByRole("button", { name: "Show password" })[1]);
    expect(screen.getByLabelText("New password").props.secureTextEntry).toBe(false);
  });

  it("changes the password and confirms it", async () => {
    mockChangePassword.mockResolvedValue(undefined);
    await setup();
    await fill("OldPassw0rd", "N3wPassword", "N3wPassword");
    await fireEvent.press(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(screen.getByText("Password changed. Your other sessions were signed out.")).toBeTruthy());
    expect(mockChangePassword).toHaveBeenCalledWith("OldPassw0rd", "N3wPassword");
    expect(screen.getByLabelText("New password").props.value).toBe("");
  });

  it("shows the server's verdict under the current password", async () => {
    mockChangePassword.mockRejectedValue(new ApiError(400, "Invalid", undefined, { currentPassword: ["The current password is incorrect."] }));
    await setup();
    await fill("Wr0ngPassword", "N3wPassword", "N3wPassword");
    await fireEvent.press(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(screen.getByText("The current password is incorrect.")).toBeTruthy());
  });

  it("explains rate limiting", async () => {
    mockChangePassword.mockRejectedValue(new ApiError(429, "Too many requests"));
    await setup();
    await fill("OldPassw0rd", "N3wPassword", "N3wPassword");
    await fireEvent.press(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(screen.getByText("Too many attempts. Wait a minute and try again.")).toBeTruthy());
  });

  it("sets a first password without the current one", async () => {
    mockChangePassword.mockResolvedValue(undefined);
    await setup(false);
    expect(screen.queryByLabelText("Current password")).toBeNull();
    await fill(null, "N3wPassword", "N3wPassword");
    await fireEvent.press(screen.getByRole("button", { name: "Set password" }));
    await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith(null, "N3wPassword"));
  });
});
