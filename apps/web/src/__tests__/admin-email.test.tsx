import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "@/components/providers";
import { qk } from "@/lib/queries";
import { me } from "@/test/utils";
import AdminPage from "../../app/(app)/admin/page";

/** Answers the admin page's reads and the test-email POST with the given response. */
function mockApi(testEmail: Response) {
  const posts: string[] = [];
  vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/admin/email/test" && req.method === "POST") {
      posts.push(path);
      return testEmail;
    }
    const empty = path.endsWith("/stats") ? {} : path.endsWith("/questions") ? { items: [], page: 1, pageSize: 20, totalCount: 0 } : [];
    return new Response(JSON.stringify(empty), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  return posts;
}

function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(qk.me, { ...me, isAdmin: true });
  render(<Providers client={client}><AdminPage /></Providers>);
}

describe("Admin test email", () => {
  it("sends a test email to the signed-in admin and confirms it", async () => {
    const posts = mockApi(new Response(null, { status: 204 }));
    renderAdmin();
    await userEvent.click(screen.getByRole("button", { name: "Send test email" }));
    expect(posts).toEqual(["/api/v1/admin/email/test"]);
    expect(await screen.findByText(`Test email sent to ${me.email}. Check the inbox (and the spam folder).`)).toBeInTheDocument();
  });

  it("shows the SMTP error returned by the API", async () => {
    mockApi(new Response(JSON.stringify({ title: "Email delivery failed", detail: "The email could not be sent: Connection refused" }),
      { status: 502, headers: { "Content-Type": "application/problem+json" } }));
    renderAdmin();
    await userEvent.click(screen.getByRole("button", { name: "Send test email" }));
    expect(await screen.findByText("The email could not be sent: Connection refused")).toBeInTheDocument();
  });
});
