"use client";

/** Opens documentation links in the system browser when running inside the Tauri desktop shell. */
export async function openExternal(e: React.MouseEvent<HTMLAnchorElement>) {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return; // normal browser: let the link work
  e.preventDefault();
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(e.currentTarget.href);
}
