"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { qk, useMe } from "@/lib/queries";
import { useT } from "@/i18n";

/**
 * Settings → Privacy: a checkbox to stay out of every leaderboard. It saves as soon as it is toggled; progress, XP and
 * achievements are not affected. The new user summary goes straight into the `me` query.
 */
export function LeaderboardPrivacy() {
  const t = useT().settings.privacy;
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "status" | "alert"; text: string } | null>(null);
  if (!me) return null;

  async function toggle(show: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      // The API leaves a field alone when it is null, so only the leaderboard setting changes.
      const updated = await unwrap(api.PATCH("/api/v1/users/me", { body: { displayName: null, bio: null, avatarUrl: null, showOnLeaderboard: show } }));
      qc.setQueryData(qk.me, updated);
      for (const queryKey of [["leaderboard"], qk.dashboard, ["profile"]]) void qc.invalidateQueries({ queryKey });
      setMessage({ kind: "status", text: show ? t.shown : t.hidden });
    } catch {
      setMessage({ kind: "alert", text: t.failed });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="privacy-heading">
      <h2 id="privacy-heading" className="mb-4 font-semibold">{t.heading}</h2>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={me.showOnLeaderboard} disabled={saving}
          aria-labelledby="leaderboard-label" aria-describedby="leaderboard-help" onChange={(e) => void toggle(e.target.checked)} />
        <span>
          <span id="leaderboard-label" className="font-medium">{t.leaderboard}</span>
          <span id="leaderboard-help" className="mt-0.5 block text-sm text-text-secondary">{t.leaderboardHelp}</span>
        </span>
      </label>
      {message?.kind === "status" && <p role="status" className="mt-3 text-sm text-primary">{message.text}</p>}
      {message?.kind === "alert" && <p role="alert" className="mt-3 text-sm text-error">{message.text}</p>}
    </section>
  );
}
