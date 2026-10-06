import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordCard } from "@/components/change-password";
import { qk } from "@/lib/queries";
import { renderApp } from "@/test/utils";

function json(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" } });
}

afterEach(() => {
  vi.mocked(fetch).mockClear().mockImplementation(async () => json({ title: "Unauthorized" }, 401));
});

function setup(hasPassword = true) {
  return renderApp(<ChangePasswordCard />, (c) => c.setQueryData(qk.passwordStatus, { hasPassword }));
}

async function fill(current: string, password: string, confirm: string) {
  if (current) await userEvent.type(screen.getByLabelText("Current password"), current);
  if (password) await userEvent.type(screen.getByLabelText("New password"), password);
  if (confirm) await userEvent.type(screen.getByLabelText("Confirm new password"), confirm);
}

describe("Change password", () => {
  it("validates inline with the sign-up rules before calling the API", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByText("Enter your current password")).toBeInTheDocument();
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();

    await fill("OldPassw0rd", "OldPassw0rd", "Different1");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByText("Use a password different from your current one")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows and hides each password", async () => {
    setup();
    const input = screen.getByLabelText("New password");
    expect(input).toHaveAttribute("type", "password");
    const [, toggle] = screen.getAllByRole("button", { name: "Show password" });
    await userEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(toggle).toHaveAccessibleName("Hide password");
  });

  it("changes the password, confirms it and clears the form", async () => {
    vi.mocked(fetch).mockImplementation(async () => json(null, 204));
    setup();
    await fill("OldPassw0rd", "N3wPassword", "N3wPassword");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Password changed. Your other sessions were signed out.");
    const request = vi.mocked(fetch).mock.calls[0][0] as Request;
    expect(new URL(request.url).pathname).toBe("/api/v1/auth/change-password");
    expect(await request.json()).toEqual({ currentPassword: "OldPassw0rd", newPassword: "N3wPassword" });
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });

  it("shows the server's verdict on the current password under that field", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ title: "Invalid", errors: { currentPassword: ["The current password is incorrect."] } }, 400));
    setup();
    await fill("Wr0ngPassword", "N3wPassword", "N3wPassword");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("The current password is incorrect.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("explains when there were too many attempts", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ title: "Too many requests" }, 429));
    setup();
    await fill("OldPassw0rd", "N3wPassword", "N3wPassword");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Wait a minute and try again.");
  });

  it("offers to set a password when the account has none (external sign-in)", async () => {
    vi.mocked(fetch).mockImplementation(async () => json(null, 204));
    const { client } = setup(false);
    expect(screen.getByRole("heading", { name: "Set a password" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    await fill("", "N3wPassword", "N3wPassword");
    await userEvent.click(screen.getByRole("button", { name: "Set password" }));

    await screen.findByRole("status");
    const request = vi.mocked(fetch).mock.calls[0][0] as Request;
    expect(await request.json()).toEqual({ currentPassword: null, newPassword: "N3wPassword" });
    await waitFor(() => expect(client.getQueryState(qk.passwordStatus)?.isInvalidated).toBe(true));
  });
});
