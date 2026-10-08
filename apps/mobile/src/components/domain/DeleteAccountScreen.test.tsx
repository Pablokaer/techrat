import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError, createApiClient } from "@techrat/api";
import { ApiProvider } from "@/lib/api-context";
import { setLocale } from "@/lib/i18n";
import { qk } from "@/lib/queries";
import { DeleteAccountScreen } from "./DeleteAccountScreen";

const mockDeleteAccount = jest.fn();
jest.mock("@/lib/auth", () => ({ useAuth: () => ({ deleteAccount: mockDeleteAccount }) }));

const api = createApiClient({ baseUrl: "http://api.test", auth: { kind: "bearer", getAccessToken: () => "t" } });

async function setup(hasPassword = true) {
  const client = new QueryClient();
  client.setQueryData(qk.passwordStatus, { hasPassword });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><ApiProvider client={api}>{children}</ApiProvider></QueryClientProvider>
  );
  return render(<DeleteAccountScreen />, { wrapper });
}

const press = (name: string) => fireEvent.press(screen.getByRole("button", { name }));

/** Fills the field, asks to delete and confirms in the second step. */
async function deleteWith(value: string, label = "Current password") {
  await fireEvent.changeText(screen.getByLabelText(label), value);
  await press("Delete my account");
  await press("Yes, delete permanently");
}

beforeEach(() => mockDeleteAccount.mockReset());
afterEach(() => setLocale("en"));

describe("Delete account screen", () => {
  it("explains what is deleted and that it cannot be undone", async () => {
    await setup();
    expect(screen.getByText("Deleting your account is permanent and cannot be undone.")).toBeTruthy();
    expect(screen.getByText("What will be deleted")).toBeTruthy();
    expect(screen.getByText(/practice history/)).toBeTruthy();
  });

  it("requires the password before asking for confirmation", async () => {
    await setup();
    await press("Delete my account");
    expect(screen.getByText("Enter your password.")).toBeTruthy();
    expect(screen.queryByText("Are you sure?")).toBeNull();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("asks for a second confirmation that can be cancelled without calling the API", async () => {
    await setup();
    await fireEvent.changeText(screen.getByLabelText("Current password"), "Passw0rd!");
    await press("Delete my account");
    expect(screen.getByText("Are you sure?")).toBeTruthy();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
    await press("Cancel");
    expect(screen.queryByText("Are you sure?")).toBeNull();
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeTruthy();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("deletes with the password once confirmed", async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    await setup();
    await deleteWith("Passw0rd!");
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith("Passw0rd!", null));
  });

  it("disables the buttons while the request is pending", async () => {
    mockDeleteAccount.mockReturnValue(new Promise(() => undefined));
    await setup();
    await deleteWith("Passw0rd!");
    await waitFor(() => expect(screen.getByRole("button", { name: "Yes, delete permanently" }).props.accessibilityState.disabled).toBe(true));
    expect(screen.getByRole("button", { name: "Cancel" }).props.accessibilityState.disabled).toBe(true);
    await press("Yes, delete permanently");
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it("asks for the username when the account has no password", async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    await setup(false);
    expect(screen.queryByLabelText("Current password")).toBeNull();
    await press("Delete my account");
    expect(screen.getByText("Enter your username.")).toBeTruthy();
    await deleteWith("Rat", "Type your username to confirm");
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith(null, "Rat"));
  });

  it("shows the server's verdict under the password and goes back to the form", async () => {
    mockDeleteAccount.mockRejectedValue(new ApiError(400, "Invalid", undefined, { password: ["The password is incorrect."] }));
    await setup();
    await deleteWith("Wr0ng");
    await waitFor(() => expect(screen.getByText("The password is incorrect.")).toBeTruthy());
    expect(screen.queryByText("Are you sure?")).toBeNull();
  });

  it("shows the server's verdict under the username", async () => {
    mockDeleteAccount.mockRejectedValue(new ApiError(400, "Invalid", undefined, { confirmation: ["Type your username."] }));
    await setup(false);
    await deleteWith("someone", "Type your username to confirm");
    await waitFor(() => expect(screen.getByText("Type your username.")).toBeTruthy());
  });

  it("explains that the last administrator cannot delete the account", async () => {
    mockDeleteAccount.mockRejectedValue(new ApiError(409, "Conflict", "ignored detail"));
    await setup();
    await deleteWith("Passw0rd!");
    await waitFor(() => expect(screen.getByText(/last administrator/)).toBeTruthy());
  });

  it("explains rate limiting", async () => {
    mockDeleteAccount.mockRejectedValue(new ApiError(429, "Too many requests"));
    await setup();
    await deleteWith("Passw0rd!");
    await waitFor(() => expect(screen.getByText("Too many attempts. Wait a minute and try again.")).toBeTruthy());
  });

  it("shows a generic message for any other failure", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("network"));
    await setup();
    await deleteWith("Passw0rd!");
    await waitFor(() => expect(screen.getByText("Could not delete the account. Check your connection and try again.")).toBeTruthy());
  });

  it("renders in Portuguese on a Portuguese device", async () => {
    setLocale("pt-BR");
    mockDeleteAccount.mockResolvedValue(undefined);
    await setup();
    expect(screen.getByText("Excluir sua conta é permanente e não pode ser desfeito.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Senha atual"), "Passw0rd!");
    await press("Excluir minha conta");
    expect(screen.getByText("Tem certeza?")).toBeTruthy();
    await press("Sim, excluir permanentemente");
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith("Passw0rd!", null));
  });
});
