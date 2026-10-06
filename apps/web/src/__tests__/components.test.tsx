import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DifficultyBadge, ProgressBar } from "@techrat/ui";
import { RichText, splitBlocks } from "@/components/question-text";
import { RoadmapChain } from "@/components/widgets";
import LoginPage from "../../app/(auth)/login/page";
import RegisterPage from "../../app/(auth)/register/page";
import { renderApp } from "@/test/utils";
import { searchHref } from "@/lib/routes";

describe("UI primitives", () => {
  it("progress bar is accessible and clamped", () => {
    render(<ProgressBar value={140} label="Level progress" />);
    const bar = screen.getByRole("progressbar", { name: "Level progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
  });
  it("difficulty badge shows text, not just color", () => {
    render(<DifficultyBadge difficulty="Expert" />);
    expect(screen.getByText("Expert")).toBeInTheDocument();
  });
});

describe("RichText", () => {
  it("splits code from prose and never injects HTML", () => {
    const blocks = splitBlocks("What does this print?\nconst a = [1, 2];\nconsole.log(a.length);");
    expect(blocks).toEqual([{ code: false, text: "What does this print?" }, { code: true, text: "const a = [1, 2];\nconsole.log(a.length);" }]);
    render(<RichText text={"Use `<script>` carefully"} />);
    expect(screen.getByText("<script>").tagName).toBe("CODE");
  });
});

describe("Roadmap chain", () => {
  it("labels completed, current and locked steps with text", () => {
    const step = (id: string, status: string) => ({
      id, title: id, description: "", order: 1, difficulty: "Easy", estimatedMinutes: 30, topicSlug: "git", topicName: "Git", subtopicSlug: null,
      subtopicName: null, minimumQuestions: 5, minimumAccuracy: 70, xpReward: 50, status, criteria: null, isNew: false,
    });
    render(<RoadmapChain roadmapSlug="git" steps={[step("Basics", "Completed"), step("Branching", "Current"), step("Rebase", "Locked")]} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });
});

describe("Auth forms", () => {
  it("login validates before calling the API", async () => {
    renderApp(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
  });
  it("register enforces the password policy client-side", async () => {
    renderApp(<RegisterPage />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.io");
    await userEvent.type(screen.getByLabelText("Username"), "alex");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("At least 8 characters")).toBeInTheDocument();
  });
  it("login shows the server error for wrong credentials", async () => {
    renderApp(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Email"), "alex@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Wrong1234");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unauthorized");
  });
});

describe("Routes", () => {
  it("maps search results to static-export friendly URLs", () => {
    expect(searchHref({ type: "Roadmap", slug: "docker", title: "Docker", subtitle: "", icon: "", url: "/roadmaps/docker" })).toBe("/roadmap?slug=docker");
    expect(searchHref({ type: "Subtopic", slug: "arrays", title: "Arrays", subtitle: "", icon: "", url: "/topics/data-structures?subtopic=arrays" })).toBe("/topic?slug=data-structures&subtopic=arrays");
  });
});
