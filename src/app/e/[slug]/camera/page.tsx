"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, ChevronLeft, ExternalLink, Images, Loader2, SwitchCamera, Zap, ZapOff } from "lucide-react";
import { useGuestSession } from "@/components/guest/useGuestSession";
import { useCamera, Viewfinder, type Facing } from "@/components/guest/Viewfinder";
import { Button, ICON_STROKE } from "@/components/ui";
import { newId } from "@/lib/client/device";
import { drafts } from "@/lib/client/idb";
import { formatDateStamp } from "@/lib/dates";
import { getPreset } from "@/lib/film/presets";
import { fileToDraft, UnsupportedImageError } from "@/lib/image/decode";
import { toJpeg } from "@/lib/image/encode";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import { useEditStore } from "@/stores/editStore";

export default function CameraPage() {
  const { event, ready } = useGuestSession();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [facing, setFacing] = useState<Facing>("environment");
  const cam = useCamera(facing);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);

  const filterId = useEditStore((s) => s.filterId);
  const showDate = useEditStore((s) => s.showDate);
  const queueLength = useEditStore((s) => s.queue.length);
  const addDrafts = useEditStore((s) => s.addDrafts);

  const preset = getPreset(filterId);
  const filmName = locale === "th" ? preset.labelTh : preset.label;
  const editHref = `/e/${event.slug}/edit/filter`;

  async function saveDrafts(blobs: Blob[]) {
    const ids: string[] = [];
    for (const blob of blobs) {
      const id = newId();
      await drafts.put({ id, slug: event.slug, blob, seed: Math.floor(Math.random() * 2 ** 31), createdAt: Date.now() });
      ids.push(id);
    }
    addDrafts(ids);
    router.push(editHref);
  }

  async function shoot() {
    if (busy) return;
    const canvas = cam.capture();
    if (!canvas) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    setBusy(true);
    try {
      await saveDrafts([await toJpeg(canvas, 0.92)]);
    } catch {
      setError(t("error.generic"));
      setBusy(false);
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const blobs: Blob[] = [];
    let unsupported = false;
    for (const file of Array.from(files)) {
      try {
        blobs.push(await fileToDraft(file));
      } catch (err) {
        if (err instanceof UnsupportedImageError) unsupported = true;
      }
    }
    if (galleryRef.current) galleryRef.current.value = "";
    if (captureRef.current) captureRef.current.value = "";
    if (unsupported) setError(t("camera.unsupported"));
    if (!blobs.length) {
      setBusy(false);
      return;
    }
    try {
      await saveDrafts(blobs);
    } catch (err) {
      console.error("Saving photo failed:", err instanceof Error ? err.message : err);
      setError(t("error.generic"));
      setBusy(false);
    }
  }

  const live = cam.status === "live";

  return (
    <main className="pb-safe flex min-h-dvh flex-col bg-night text-white">
      {/* Top bar: Album · names · flash */}
      <header className="pt-safe grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-3">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/e/${event.slug}`}
            aria-label={t("edit.back")}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/12 focus-visible:outline-2 focus-visible:outline-gold"
          >
            <ChevronLeft size={22} strokeWidth={ICON_STROKE} />
          </Link>
          {event.sharedAlbumUrl && (
            <a
              href={event.sharedAlbumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/12 px-4 text-[13px] font-semibold"
            >
              {t("camera.album")}
              <ExternalLink size={14} strokeWidth={ICON_STROKE} />
            </a>
          )}
        </div>
        <p className="truncate font-script text-[28px] leading-none">{event.coupleNames}</p>
        <div className="flex justify-end">
          {live && cam.torchSupported && (
            <button
              type="button"
              onClick={cam.toggleTorch}
              aria-pressed={cam.torchOn}
              aria-label={cam.torchOn ? t("camera.flashOn") : t("camera.flashOff")}
              className="flex size-11 items-center justify-center rounded-full bg-white/12"
            >
              {cam.torchOn ? <Zap size={20} strokeWidth={ICON_STROKE} /> : <ZapOff size={20} strokeWidth={ICON_STROKE} />}
            </button>
          )}
        </div>
      </header>

      {queueLength > 0 && !busy && (
        <Link
          href={editHref}
          className="mx-4 mb-3 flex min-h-11 items-center justify-between rounded-2xl bg-white/10 px-4 text-sm"
        >
          <span>{t("camera.queued", { n: queueLength })}</span>
          <span className="font-semibold text-[#d7e0cf]">{t("camera.continue")} →</span>
        </Link>
      )}

      <div className="px-4">
        {cam.status !== "unavailable" ? (
          <Viewfinder videoRef={cam.videoRef} mirrored={facing === "user"} flash={flash}>
            <span className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
              {t("camera.film", { name: filmName })}
            </span>
            {showDate && (
              <span
                aria-hidden
                className="absolute bottom-3 right-4 font-typewriter text-lg font-bold text-stamp"
                style={{ textShadow: "0 0 6px rgba(255,120,30,.8)" }}
              >
                {formatDateStamp(event.weddingDate)}
              </span>
            )}
            {cam.status === "starting" && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                {t("camera.starting")}
              </p>
            )}
            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 text-sm">
                <Loader2 className="animate-spin" size={28} strokeWidth={ICON_STROKE} />
                {t("camera.processing")}
              </div>
            )}
          </Viewfinder>
        ) : (
          <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-5 rounded-[24px] bg-white/6 px-8 text-center">
            <p className="text-[15px] leading-relaxed text-white/85">{t("camera.unavailable")}</p>
            <Button
              onClick={() => captureRef.current?.click()}
              disabled={busy || !ready}
              leadingIcon={busy ? <Loader2 className="animate-spin" /> : <Camera strokeWidth={ICON_STROKE} />}
            >
              {busy ? t("camera.processing") : t("camera.takePhoto")}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mx-4 mt-3 rounded-xl bg-[#b4533f]/25 px-4 py-2.5 text-center text-sm">
          {error}
        </p>
      )}

      {/* Controls: gallery · shutter · flip */}
      <div className="mt-auto grid grid-cols-3 items-center px-8 pb-4 pt-6">
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={busy || !ready}
          aria-label={t("camera.gallery")}
          className="flex size-12 items-center justify-center justify-self-start rounded-xl border border-white/30 bg-white/10 disabled:opacity-50"
        >
          <Images size={22} strokeWidth={ICON_STROKE} />
        </button>

        <button
          type="button"
          onClick={shoot}
          disabled={!live || busy || !ready}
          aria-label={t("camera.shutter")}
          className={cn(
            "flex size-[78px] items-center justify-center justify-self-center rounded-full border-4 border-white",
            "transition-transform duration-150 ease-out active:scale-95 disabled:opacity-40",
          )}
        >
          <span className="size-[62px] rounded-full bg-white" />
        </button>

        <button
          type="button"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          disabled={!live || busy}
          aria-label={t("camera.flip")}
          className="flex size-12 items-center justify-center justify-self-end rounded-full bg-white/10 disabled:opacity-40"
        >
          <SwitchCamera size={22} strokeWidth={ICON_STROKE} />
        </button>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void onFiles(e.target.files)}
        data-testid="gallery-input"
      />
      <input
        ref={captureRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void onFiles(e.target.files)}
      />
    </main>
  );
}
