"use client";

import { useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@techrat/api";
import { useToast } from "@/components/providers";
import { useT } from "@/i18n";

/** Query key of the admin module catalog (shared by the Modules tab and the roadmap composition editor). */
export const ADMIN_MODULES_KEY = ["admin-modules"] as const;

/**
 * Runs an admin write, toasts the outcome and, on success, invalidates every query: admin edits can change
 * roadmaps, modules, stats and learner-facing pages at once, so a targeted invalidation would miss something.
 * Resolves to whether the write succeeded.
 */
export function useAdminAction() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  return async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast({ kind: "success", title: success });
      qc.invalidateQueries();
      return true;
    } catch (e) {
      toast({ kind: "error", title: isApiError(e) ? (e.errors ? Object.values(e.errors)[0][0] : e.detail ?? e.title) : t.admin.failed });
      return false;
    }
  };
}
