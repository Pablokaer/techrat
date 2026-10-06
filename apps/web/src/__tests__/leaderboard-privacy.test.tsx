import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserSummary } from "@techrat/types";
import { LeaderboardPrivacy } from "@/components/leaderboard-privacy";
import { qk } from "@/lib/queries";
import { me, renderApp } from "@/test/utils";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": status < 400 ? "application/json" : "application/problem+json" } });
}

afterEach(() => {
  vi.mocked(fetch).mockClear().mockImplementation(async () => json({ title: "Unauthorized" }, 401));
});

describe("Leaderboard privacy", () => {
  it("is on by default: the learner takes part in the leaderboards", () => {
    renderApp(<LeaderboardPrivacy />);
    expect(screen.getByRole("checkbox", { name: "Show me on the leaderboards" })).toBeChecked();
  });

  it("opting out saves at once and tells the learner", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ ...me, showOnLeaderboard: false }));
    const { client } = renderApp(<LeaderboardPrivacy />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Show me on the leaderboards" }));

    const request = vi.mocked(fetch).mock.calls[0][0] as Request;
    expect(request.method).toBe("PATCH");
    expect(new URL(request.url).pathname).toBe("/api/v1/users/me");
    expect(await request.json()).toEqual({ displayName: null, bio: null, avatarUrl: null, showOnLeaderboard: false });
    expect(await screen.findByRole("status")).toHaveTextContent("You are hidden from the leaderboards. Your progress and XP are kept.");
    expect(screen.getByRole("checkbox", { name: "Show me on the leaderboards" })).not.toBeChecked();
    expect(client.getQueryData<UserSummary>(qk.me)?.showOnLeaderboard).toBe(false);
  });

  it("opting back in says so", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ ...me, showOnLeaderboard: true }));
    renderApp(<LeaderboardPrivacy />, (c) => c.setQueryData(qk.me, { ...me, showOnLeaderboard: false }));
    const box = screen.getByRole("checkbox", { name: "Show me on the leaderboards" });
    expect(box).not.toBeChecked();

    await userEvent.click(box);

    expect(await screen.findByRole("status")).toHaveTextContent("You are shown on the leaderboards again.");
    expect(box).toBeChecked();
  });

  it("keeps the previous choice and explains when saving fails", async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ title: "Server error" }, 500));
    renderApp(<LeaderboardPrivacy />);
    const box = screen.getByRole("checkbox", { name: "Show me on the leaderboards" });

    await userEvent.click(box);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save your choice. Try again.");
    await waitFor(() => expect(box).toBeChecked());
    expect(box).toBeEnabled();
  });
});
