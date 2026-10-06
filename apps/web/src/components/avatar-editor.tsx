"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2 } from "lucide-react";
import type { UserSummary } from "@techrat/types";
import { isApiError } from "@techrat/api";
import {
  AVATAR_INPUT_TYPES, AVATAR_MAX_ZOOM, checkAvatarFile, clampCrop, cropRect, displayScale, zoomCrop, type CropState,
} from "@techrat/validation";
import { api, unwrap } from "@/lib/api";
import { exportAvatar, loadImage, type LoadedImage } from "@/lib/avatar-image";
import { qk, useMe } from "@/lib/queries";
import { useToast } from "@/components/providers";
import { Avatar } from "@/components/shell";
import { useT } from "@/i18n";

/** Side of the circular crop window, in CSS px (fits a 320 px phone with the dialog padding). */
const VIEWPORT = 256;
const PREVIEW = 72;
const ACCEPT = [...AVATAR_INPUT_TYPES, ".heic", ".heif"].join(",");

/**
 * Profile photo in Settings: pick an image, adjust it inside a circle, upload the 512×512 result, or remove it.
 * The new user summary goes straight into the `me` query, so every avatar (app bar, profile, settings) updates
 * without a reload.
 */
export function AvatarEditor() {
  const t = useT().settings.avatar;
  const qc = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  if (!me) return null;

  function updated(user: UserSummary) {
    qc.setQueryData(qk.me, user);
    // Other places that embed the user (profile, dashboard, leaderboards) refetch with the new URL.
    for (const queryKey of [["profile"], qk.dashboard, ["leaderboard"]]) void qc.invalidateQueries({ queryKey });
  }

  async function pick(file: File | undefined) {
    if (input.current) input.current.value = "";   // picking the same file again still fires change
    if (!file) return;
    setProblem(null);
    const issue = checkAvatarFile(file);
    if (issue) return setProblem(issue === "type" ? t.invalidType : t.tooLarge);
    try {
      setImage(await loadImage(file));
    } catch {
      setProblem(t.unreadable);
    }
  }

  function close() {
    image?.release();
    setImage(null);
    setUploadError(null);
  }

  async function save(rect: { x: number; y: number; size: number }) {
    if (!image) return;
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await exportAvatar(image.src, rect);
      const form = new FormData();
      form.append("file", blob, blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg");
      updated(await unwrap(api.PUT("/api/v1/users/me/avatar", { body: {}, bodySerializer: () => form })));
      toast({ kind: "success", title: t.saved });
      close();
    } catch (err) {
      setUploadError((isApiError(err) && err.field("file")) || t.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    setRemoving(true);
    try {
      updated(await unwrap(api.DELETE("/api/v1/users/me/avatar")));
      toast({ kind: "success", title: t.removed });
    } catch {
      toast({ kind: "error", title: t.removeFailed });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section aria-labelledby="avatar-heading">
      <h2 id="avatar-heading" className="font-semibold">{t.heading}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Avatar user={me} size={72} alt={t.photoAlt} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => input.current?.click()}>
            <Camera className="h-4 w-4" aria-hidden />{me.avatarUrl ? t.change : t.upload}
          </button>
          {me.avatarUrl && (
            <button type="button" className="btn-ghost" onClick={remove} disabled={removing}>
              <Trash2 className="h-4 w-4" aria-hidden />{removing ? t.removing : t.remove}
            </button>
          )}
        </div>
        <input ref={input} type="file" accept={ACCEPT} className="sr-only" aria-label={t.choose} tabIndex={-1}
          onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
      <p className="mt-2 text-xs text-text-muted">{t.helper}</p>
      {problem && <p role="alert" className="mt-2 text-sm text-error">{problem}</p>}
      {image && <CropDialog image={image} busy={uploading} error={uploadError} onCancel={close} onSave={save} />}
    </section>
  );
}

function CropDialog({ image, busy, error, onCancel, onSave }: {
  image: LoadedImage;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (rect: { x: number; y: number; size: number }) => void;
}) {
  const t = useT().settings.avatar;
  const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 });
  const area = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  // React only auto-focuses form fields; the crop area takes focus so arrows, +/- and Escape work at once.
  useEffect(() => area.current?.focus(), []);

  // Wheel zoom needs a non-passive listener to stop the page from scrolling under the dialog.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCrop((c) => zoomCrop(c, c.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), image, VIEWPORT));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [image]);

  function down(e: PointerEvent) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function move(e: PointerEvent) {
    const all = pointers.current;
    const last = all.get(e.pointerId);
    if (!last) return;
    if (all.size === 1) {
      setCrop((c) => clampCrop({ ...c, x: c.x + e.clientX - last.x, y: c.y + e.clientY - last.y }, image, VIEWPORT));
    } else if (all.size === 2) {
      // Pinch: zoom by the change in distance between the two fingers.
      const other = [...all.entries()].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(last.x - other.x, last.y - other.y);
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (before > 0) setCrop((c) => zoomCrop(c, c.zoom * (after / before), image, VIEWPORT));
    }
    all.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function up(e: PointerEvent) {
    pointers.current.delete(e.pointerId);
  }

  function keys(e: KeyboardEvent) {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setCrop((c) => clampCrop({ ...c, x: c.x + dx, y: c.y + dy }, image, VIEWPORT));
    } else if (e.key === "+" || e.key === "=" || e.key === "-") {
      e.preventDefault();
      setCrop((c) => zoomCrop(c, c.zoom + (e.key === "-" ? -0.1 : 0.1), image, VIEWPORT));
    }
  }

  const scale = displayScale(crop.zoom, image, VIEWPORT);
  const placed = (ratio: number) => ({
    width: image.width * scale * ratio,
    height: image.height * scale * ratio,
    maxWidth: "none",
    transform: `translate(calc(-50% + ${crop.x * ratio}px), calc(-50% + ${crop.y * ratio}px))`,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onKeyDown={(e) => { if (e.key === "Escape" && !busy) onCancel(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="crop-title" className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
        <h2 id="crop-title" className="text-lg font-semibold">{t.cropTitle}</h2>
        <p id="crop-help" className="mt-1 text-sm text-text-secondary">{t.cropHelp}</p>

        <div ref={area} tabIndex={0} aria-describedby="crop-help" aria-label={t.cropTitle}
          className="relative mx-auto mt-4 cursor-grab touch-none select-none overflow-hidden rounded-xl bg-black outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={keys}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.src} alt="" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2" style={placed(1)} />
          {/* The circle is a transparent window; its huge shadow darkens everything that will be cut off. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div role="img" aria-label={t.preview} className="relative shrink-0 overflow-hidden rounded-full border border-primary/50 bg-black"
            style={{ width: PREVIEW, height: PREVIEW }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt="" className="absolute left-1/2 top-1/2" style={placed(PREVIEW / VIEWPORT)} />
          </div>
          <label className="flex-1 text-sm">
            <span className="label">{t.zoom}</span>
            <input type="range" min={1} max={AVATAR_MAX_ZOOM} step={0.01} value={crop.zoom} aria-label={t.zoom} className="w-full accent-primary"
              onChange={(e) => setCrop((c) => zoomCrop(c, Number(e.target.value), image, VIEWPORT))} />
          </label>
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>{t.cancel}</button>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => onSave(cropRect(crop, image, VIEWPORT))}>
            {busy ? t.uploading : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
