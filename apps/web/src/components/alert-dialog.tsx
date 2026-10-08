"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal confirmation for destructive actions, built to the WAI-ARIA alert dialog pattern: it is labelled by its title and
 * described by its text, focus moves to the first control when it opens, Tab and Shift+Tab stay inside (also when focus has fallen to the page), Escape closes it
 * and focus goes back to whatever opened it. `dismissible=false` (a request is running) blocks Escape so the user cannot
 * walk away from a half-finished action. Rendered inline (fixed overlay) rather than in a portal to keep it testable.
 */
export function AlertDialog({ title, description, dismissible = true, onClose, children }: {
  title: string;
  description: string;
  dismissible?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  // On the document, not on the dialog: a disabled button (while the request runs) drops focus to <body> in real
  // browsers, and Escape and Tab must keep working from there.
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (dismissible) onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialog.current?.contains(active)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismissible, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <div
        ref={dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="my-auto w-full max-w-md rounded-2xl border border-error/50 bg-card-raised p-6 shadow-2xl"
      >
        <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm text-text-secondary">{description}</p>
        {children}
      </div>
    </div>
  );
}
