import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath (post-login redirect)", () => {
  it.each(["/dashboard", "/account/delete", "/settings?tab=password", "/topic?slug=data-structures#top", "/%2F/not-a-host"])(
    "accepts the same-origin path %s",
    (path) => expect(safeNextPath(path)).toBe(path),
  );

  it.each([
    ["nothing", null],
    ["undefined", undefined],
    ["empty", ""],
    ["a relative path without the slash", "dashboard"],
    ["a protocol-relative URL", "//evil.example"],
    ["three slashes", "///evil.example"],
    ["a backslash that browsers read as a slash", "/\\evil.example"],
    ["a tab that the URL parser strips", "/\t/evil.example"],
    ["a newline that the URL parser strips", "/\n/evil.example"],
    ["an absolute http URL", "http://evil.example"],
    ["an absolute https URL", "https://evil.example/login"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a scheme without slashes", "http:evil.example"],
    ["a data: URL", "data:text/html,<script>alert(1)</script>"],
  ] as const)("rejects %s", (_name, value) => expect(safeNextPath(value)).toBeNull());
});
