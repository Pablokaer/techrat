import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Landing from "../../app/page";
import LoginPage from "../../app/(auth)/login/page";
import { AppShell } from "@/components/shell";
import { qk } from "@/lib/queries";
import { renderApp } from "@/test/utils";

const precedes = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe("mobile layout", () => {
  it("landing opens with the TechRat logo, before the headline", () => {
    renderApp(<Landing />, (c) => c.setQueryData(qk.me, null));
    const logo = screen.getByRole("img", { name: /TechRat logo/ });
    expect(precedes(logo, screen.getByRole("heading", { level: 1 }))).toBe(true);
  });

  it("sign-in shows the logo first on phones, centred above the title", () => {
    renderApp(<LoginPage />, (c) => c.setQueryData(qk.me, null));
    const mobileLogo = screen.getByTestId("auth-mobile-logo");
    expect(mobileLogo).toHaveClass("lg:hidden", "justify-center");
    expect(precedes(mobileLogo, screen.getByRole("heading", { level: 1 }))).toBe(true);
  });

  it("app bar keeps the logo and folds search behind an icon that opens a full-width field", async () => {
    renderApp(<AppShell><p>content</p></AppShell>);
    expect(screen.getAllByRole("link", { name: "Home" })[0]).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Search topics, roadmaps and technologies" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(document.getElementById("mobile-global-search")).toHaveFocus();
  });
});
