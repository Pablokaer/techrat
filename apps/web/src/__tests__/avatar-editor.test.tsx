import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserSummary } from "@techrat/types";
import { AvatarEditor } from "@/components/avatar-editor";
import { qk } from "@/lib/queries";
import { me, renderApp } from "@/test/utils";

// jsdom cannot decode images or draw on a canvas: the browser-only helpers are replaced here.
const image = vi.hoisted(() => ({
  loadImage: vi.fn(),
  exportAvatar: vi.fn(),
}));
vi.mock("@/lib/avatar-image", () => image);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" } });
}

function file(name: string, type: string, size = 1000) {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

const release = vi.fn();
const withPhoto: UserSummary = { ...me, avatarUrl: "/api/v1/users/u1/avatar?v=2" };

beforeEach(() => {
  image.loadImage.mockResolvedValue({ src: "blob:photo", width: 2000, height: 1000, release });
  image.exportAvatar.mockResolvedValue(new Blob(["png"], { type: "image/webp" }));
});

afterEach(() => {
  vi.mocked(fetch).mockClear().mockImplementation(async () => json({ title: "Unauthorized" }, 401));
  image.loadImage.mockReset();
  image.exportAvatar.mockReset();
  release.mockReset();
});

async function pick(f: File) {
  await userEvent.upload(screen.getByLabelText("Choose a photo"), f, { applyAccept: false });
}

describe("Profile photo", () => {
  it("shows the initials when there is no photo, and the photo otherwise", async () => {
    const { client } = renderApp(<AvatarEditor />);
    expect(screen.queryByRole("img", { name: "Your profile photo" })).not.toBeInTheDocument();
    act(() => client.setQueryData(qk.me, withPhoto));
    expect(await screen.findByRole("img", { name: "Your profile photo" })).toHaveAttribute("src", `${window.location.origin}/api/v1/users/u1/avatar?v=2`);
  });

  it("rejects formats other than JPG, PNG, WEBP and HEIC", async () => {
    renderApp(<AvatarEditor />);
    await pick(file("anim.gif", "image/gif"));
    expect(screen.getByRole("alert")).toHaveTextContent("Use a JPG, PNG, WEBP or HEIC image.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(image.loadImage).not.toHaveBeenCalled();
  });

  it("rejects files over 5 MB", async () => {
    renderApp(<AvatarEditor />);
    await pick(file("big.jpg", "image/jpeg", 6 * 1024 * 1024));
    expect(screen.getByRole("alert")).toHaveTextContent("The photo must be 5 MB or smaller.");
  });

  it("explains when the browser cannot read the image (e.g. HEIC outside Safari)", async () => {
    image.loadImage.mockRejectedValue(new Error("decode"));
    renderApp(<AvatarEditor />);
    await pick(file("IMG_1.heic", ""));
    expect(await screen.findByRole("alert")).toHaveTextContent("This browser could not read the image. Try a JPG or PNG.");
  });

  it("opens a circular crop with zoom and preview; cancelling uploads nothing", async () => {
    renderApp(<AvatarEditor />);
    await pick(file("me.png", "image/png"));
    const dialog = await screen.findByRole("dialog", { name: "Adjust your photo" });
    expect(within(dialog).getByRole("slider", { name: "Zoom" })).toHaveValue("1");
    expect(within(dialog).getByRole("img", { name: "Preview" })).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(release).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("Escape closes the crop dialog", async () => {
    renderApp(<AvatarEditor />);
    await pick(file("me.png", "image/png"));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uploads the cropped square, shows progress and updates the avatar without a reload", async () => {
    let finish!: (r: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const { client } = renderApp(<AvatarEditor />);
    await pick(file("me.png", "image/png"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("slider", { name: "Zoom" }), { target: { value: "2" } });

    await userEvent.click(within(dialog).getByRole("button", { name: "Save photo" }));
    // 2000×1000 image at zoom 2: the centred square is 500 px of the source.
    expect(image.exportAvatar).toHaveBeenCalledWith("blob:photo", { x: 750, y: 250, size: 500 });
    expect(await within(dialog).findByRole("button", { name: "Uploading…" })).toBeDisabled();

    const request = vi.mocked(fetch).mock.calls[0][0] as Request;
    expect(request.method).toBe("PUT");
    expect(new URL(request.url).pathname).toBe("/api/v1/users/me/avatar");
    const body = await request.formData();
    expect((body.get("file") as File).type).toBe("image/webp");

    await act(async () => finish(json(withPhoto)));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(client.getQueryData<UserSummary>(qk.me)?.avatarUrl).toBe(withPhoto.avatarUrl);
    expect(screen.getByRole("img", { name: "Your profile photo" })).toBeInTheDocument();
    expect(screen.getByText("Profile photo updated")).toBeInTheDocument();
    expect(release).toHaveBeenCalled();
  });

  it("keeps the dialog open and explains when the upload fails", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ title: "Server error" }, 500));
    renderApp(<AvatarEditor />);
    await pick(file("me.png", "image/png"));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save photo" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Could not upload the photo. Try again.");
    expect(within(dialog).getByRole("button", { name: "Save photo" })).toBeEnabled();
  });

  it("shows the server's validation message", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ title: "Invalid", errors: { file: ["Use a JPG, PNG or WEBP image."] } }, 400));
    renderApp(<AvatarEditor />);
    await pick(file("me.png", "image/png"));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save photo" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Use a JPG, PNG or WEBP image.");
  });

  it("removes the photo and goes back to the initials", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ ...withPhoto, avatarUrl: null }));
    const { client } = renderApp(<AvatarEditor />, (c) => c.setQueryData(qk.me, withPhoto));
    await userEvent.click(screen.getByRole("button", { name: "Remove photo" }));

    const request = vi.mocked(fetch).mock.calls[0][0] as Request;
    expect(request.method).toBe("DELETE");
    await waitFor(() => expect(client.getQueryData<UserSummary>(qk.me)?.avatarUrl).toBeNull());
    expect(screen.queryByRole("img", { name: "Your profile photo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove photo" })).not.toBeInTheDocument();
  });
});
