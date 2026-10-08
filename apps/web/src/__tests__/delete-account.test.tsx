import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteAccountCard } from "@/components/delete-account";
import { qk } from "@/lib/queries";
import { renderApp } from "@/test/utils";

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings",
}));

function json(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" } });
}

afterEach(() => {
  nav.replace.mockClear();
  vi.mocked(fetch).mockClear().mockImplementation(async () => json({ title: "Unauthorized" }, 401));
});

function setup(hasPassword = true) {
  return renderApp(<DeleteAccountCard />, (c) => c.setQueryData(qk.passwordStatus, { hasPassword }));
}

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: "Delete my account" }));
  return screen.getByRole("alertdialog");
}

const confirmButton = () => screen.getByRole("button", { name: /Delete account permanently|Deleting/ });

describe("Delete account card", () => {
  it("lists what is deleted and warns that it cannot be undone", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Delete account" })).toBeInTheDocument();
    for (const text of [/profile/i, /photo/i, /progress/i, /XP/, /achievements/i, /notifications/i, /sessions/i]) {
      expect(screen.getByRole("list")).toHaveTextContent(text);
    }
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders nothing until it knows whether the account has a password", () => {
    renderApp(<DeleteAccountCard />);
    expect(screen.queryByRole("button", { name: "Delete my account" })).not.toBeInTheDocument();
  });

  it("opens an accessible alert dialog with focus inside, and Cancel closes it and returns focus to the trigger", async () => {
    setup();
    const trigger = screen.getByRole("button", { name: "Delete my account" });
    const dialog = await openDialog();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Delete your account?");
    expect(dialog).toHaveAccessibleDescription(/permanently deletes/i);
    expect(within(dialog).getByLabelText("Your password")).toHaveFocus();

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("closes with Escape and returns focus to the trigger", async () => {
    setup();
    const trigger = screen.getByRole("button", { name: "Delete my account" });
    await openDialog();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes with Escape even when focus has fallen out of the dialog", async () => {
    // A disabled button (while the request runs) drops focus to <body> in real browsers: Escape must still work afterwards.
    setup();
    const trigger = screen.getByRole("button", { name: "Delete my account" });
    await openDialog();
    (document.activeElement as HTMLElement).blur();
    expect(document.body).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps Tab inside the dialog even after focus fell out of it", async () => {
    setup();
    const dialog = await openDialog();
    (document.activeElement as HTMLElement).blur();
    await userEvent.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("puts focus back on the field the server rejected, so keyboard users land on the error", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ title: "Invalid", errors: { password: ["The password is incorrect."] } }, 400));
    setup();
    await openDialog();
    await userEvent.type(screen.getByLabelText("Your password"), "Wr0ngPassword");
    await userEvent.click(confirmButton());
    expect(await screen.findByText("The password is incorrect.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Your password")).toHaveFocus());
  });

  it("keeps Tab inside the dialog", async () => {
    setup();
    const dialog = await openDialog();
    const confirm = within(dialog).getByRole("button", { name: "Delete account permanently" });
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    const field = within(dialog).getByLabelText("Your password");
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    await userEvent.tab();
    expect(confirm).toHaveFocus();
    await userEvent.tab(); // wraps to the first control
    expect(field).toHaveFocus();
    await userEvent.tab({ shift: true }); // and back to the last
    expect(confirm).toHaveFocus();
  });

  it("asks for the password before calling the API", async () => {
    setup();
    await openDialog();
    await userEvent.click(confirmButton());
    expect(screen.getByText("Enter your password to confirm")).toBeInTheDocument();
    expect(screen.getByLabelText("Your password")).toHaveAttribute("aria-invalid", "true");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("deletes with the password, clears the cache and sends the user to the login page with the deleted flag", async () => {
    vi.mocked(fetch).mockImplementation(async () => json(null, 204));
    const { client } = setup();
    client.setQueryData(["profile", "alex"], { secret: "data" });
    await openDialog();
    await userEvent.type(screen.getByLabelText("Your password"), "Passw0rdX");
    await userEvent.click(confirmButton());

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/login?deleted=1"));
    const request = vi.mocked(fetch).mock.calls[0][0] as Request;
    expect(request.method).toBe("DELETE");
    expect(new URL(request.url).pathname).toBe("/api/v1/account");
    expect(await request.json()).toEqual({ password: "Passw0rdX", confirmation: null });
    expect(client.getQueryData(qk.me)).toBeUndefined();
    expect(client.getQueryData(["profile", "alex"])).toBeUndefined();
  });

  it("disables the confirm button while the request runs and cannot be dismissed meanwhile", async () => {
    let finish!: () => void;
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>((resolve) => { finish = () => resolve(json(null, 204)); }));
    setup();
    await openDialog();
    await userEvent.type(screen.getByLabelText("Your password"), "Passw0rdX");
    await userEvent.click(confirmButton());
    expect(await screen.findByRole("button", { name: "Deleting…" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    finish();
    await waitFor(() => expect(nav.replace).toHaveBeenCalled());
  });

  it("shows the server's verdict on the password under the field and keeps the dialog open", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ title: "Invalid", errors: { password: ["The password is incorrect."] } }, 400));
    const { client } = setup();
    await openDialog();
    await userEvent.type(screen.getByLabelText("Your password"), "Wr0ngPassword");
    await userEvent.click(confirmButton());
    expect(await screen.findByText("The password is incorrect.")).toBeInTheDocument();
    expect(screen.getByLabelText("Your password")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
    expect(nav.replace).not.toHaveBeenCalled();
    expect(client.getQueryData(qk.me)).toBeDefined();
  });

  it("shows the server message when the last administrator cannot delete the account (409)", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ title: "Conflict", detail: "You are the last administrator." }, 409));
    setup();
    await openDialog();
    await userEvent.type(screen.getByLabelText("Your password"), "Passw0rdX");
    await userEvent.click(confirmButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("You are the last administrator.");
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("explains when there were too many attempts (429)", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ title: "Too many requests" }, 429));
    setup();
    await openDialog();
    await userEvent.type(screen.getByLabelText("Your password"), "Passw0rdX");
    await userEvent.click(confirmButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Wait a minute and try again.");
  });

  it("shows a generic message for any other failure", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ title: "Server error" }, 500));
    setup();
    await openDialog();
    await userEvent.type(screen.getByLabelText("Your password"), "Passw0rdX");
    await userEvent.click(confirmButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete the account. Try again.");
  });

  describe("accounts without a password (external sign-in)", () => {
    it("asks to type the username instead and validates it before calling the API", async () => {
      setup(false);
      const dialog = await openDialog();
      expect(within(dialog).queryByLabelText("Your password")).not.toBeInTheDocument();
      const field = within(dialog).getByLabelText(/Type your username \(alex\) to confirm/);
      expect(field).toHaveFocus();

      await userEvent.click(confirmButton());
      expect(screen.getByText("Type your username to confirm")).toBeInTheDocument();
      await userEvent.type(field, "someone-else");
      await userEvent.click(confirmButton());
      expect(screen.getByText("That is not your username")).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("sends the username (case-insensitive) as the confirmation", async () => {
      vi.mocked(fetch).mockImplementation(async () => json(null, 204));
      setup(false);
      await openDialog();
      await userEvent.type(screen.getByLabelText(/Type your username/), "ALEX");
      await userEvent.click(confirmButton());
      await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/login?deleted=1"));
      const request = vi.mocked(fetch).mock.calls[0][0] as Request;
      expect(await request.json()).toEqual({ password: null, confirmation: "ALEX" });
    });

    it("maps a server confirmation error to the field", async () => {
      vi.mocked(fetch).mockImplementation(async () => json({ title: "Invalid", errors: { confirmation: ["Type your username to confirm."] } }, 400));
      setup(false);
      await openDialog();
      await userEvent.type(screen.getByLabelText(/Type your username/), "alex");
      await userEvent.click(confirmButton());
      expect(await screen.findByText("Type your username to confirm.")).toBeInTheDocument();
      expect(screen.getByLabelText(/Type your username/)).toHaveAttribute("aria-invalid", "true");
    });
  });
});

describe("Delete account card in Portuguese", () => {
  it("renders the section and the dialog in pt-BR", async () => {
    renderApp(<DeleteAccountCard />, (c) => c.setQueryData(qk.passwordStatus, { hasPassword: true }), { locale: "pt-BR" });
    expect(screen.getByRole("heading", { name: "Excluir conta" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName("Excluir sua conta?");
    expect(screen.getByLabelText("Sua senha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir conta definitivamente" })).toBeInTheDocument();
  });
});
