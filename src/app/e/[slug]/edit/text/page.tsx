"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { EditTopBar } from "@/components/guest/EditTopBar";
import { renderAndSend } from "@/components/guest/send";
import { TextOverlayEditor } from "@/components/guest/TextOverlayEditor";
import { paint, useCurrentDraft } from "@/components/guest/useDraft";
import { useGuestSession } from "@/components/guest/useGuestSession";
import { Button, ICON_STROKE, Toggle } from "@/components/ui";
import { getDeviceId, setGuestName } from "@/lib/client/device";
import { drafts } from "@/lib/client/idb";
import { formatDateStamp } from "@/lib/dates";
import { filmPass, finishPhoto } from "@/lib/image/compose";
import type { Overlays } from "@/lib/image/overlay";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cleanText } from "@/lib/validation";
import { useEditStore } from "@/stores/editStore";

const PREVIEW_EDGE = 960;

type Progress = { i: number; n: number; phase: "render" | "upload"; pct: number };

export default function TextPage() {
  const { event, ready, guestName } = useGuestSession();
  const { t } = useI18n();
  const router = useRouter();
  // Set once the photos are sent, so emptying the queue doesn't bounce us back to the camera.
  const leaving = useRef(false);
  const current = useCurrentDraft(event.slug, ready, leaving);
  const st = useEditStore();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ready) setName(guestName);
  }, [ready, guestName]);

  const overlays: Overlays = useMemo(
    () => ({
      wish: st.wish,
      name: cleanText(name),
      style: st.textStyle,
      dateStamp: st.showDate ? formatDateStamp(event.weddingDate) : null,
    }),
    [st.wish, name, st.textStyle, st.showDate, event.weddingDate],
  );

  // Film pass at preview size (cached), then overlays + frame drawn by the same code as the final render.
  const [filmed, setFilmed] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    filmPass(current.source, st.filterId, st.strength, current.draft.seed, PREVIEW_EDGE, { offThread: false }).then(
      (c) => !cancelled && setFilmed(c),
    );
    return () => {
      cancelled = true;
    };
  }, [current, st.filterId, st.strength]);

  useEffect(() => {
    if (!filmed) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      finishPhoto(filmed, st.filterId, st.strength, overlays).then((c) => !cancelled && paint(canvasRef.current, c));
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [filmed, overlays, st.filterId, st.strength]);

  const multi = st.queue.length > 1;
  const sendAll = multi && st.applyToAll;

  async function send() {
    const clean = cleanText(name);
    if (!clean) {
      setNameError(t("text.nameRequired"));
      return;
    }
    setGuestName(clean);
    setError(null);

    const ids = sendAll ? [...st.queue] : [st.queue[st.index]];
    const settings = {
      slug: event.slug,
      deviceId: getDeviceId(),
      guestName: clean,
      wish: cleanText(st.wish),
      presetId: st.filterId,
      strength: st.strength,
      overlays: { ...overlays, name: clean, wish: cleanText(st.wish) },
    };

    const done: string[] = [];
    let queued = false;
    for (let k = 0; k < ids.length; k++) {
      const draft = await drafts.get(ids[k]);
      if (!draft) {
        done.push(ids[k]);
        continue;
      }
      setProgress({ i: k + 1, n: ids.length, phase: "render", pct: 0 });
      let outcome;
      try {
        outcome = await renderAndSend(draft, settings, (phase, f) =>
          setProgress({ i: k + 1, n: ids.length, phase, pct: Math.round(f * 100) }),
        );
      } catch {
        outcome = { kind: "error" as const, response: { ok: false as const, status: 0, error: "render", message: "" } };
      }
      if (outcome.kind === "error") {
        // Keep this photo (and any not yet sent) so the guest can try again.
        finish(done, queued);
        setProgress(null);
        const r = outcome.response;
        // Show the server's reason for permanent rejections (e.g. uploads closed); otherwise a generic retry message.
        setError((!r.ok && r.status >= 400 && r.status < 500 && r.status !== 429 && r.message) || t("text.failed"));
        return;
      }
      if (outcome.kind === "queued") queued = true;
      done.push(draft.id);
    }

    const remaining = st.queue.filter((id) => !done.includes(id));
    leaving.current = true;
    router.push(remaining.length ? `/e/${event.slug}/edit/filter` : `/e/${event.slug}/saved`);
    finish(done, queued);
    st.setWish("");
  }

  function finish(done: string[], queued: boolean) {
    if (!done.length) return;
    st.removeDrafts(done);
    st.setLastSent({ ids: done, queued });
    for (const id of done) void drafts.delete(id);
  }

  const busy = progress !== null;
  const progressLabel = !progress
    ? ""
    : progress.phase === "render"
      ? t("text.preparing")
      : progress.n > 1
        ? t("text.uploadingOf", { i: progress.i, n: progress.n, pct: progress.pct })
        : t("text.uploading", { pct: progress.pct });

  return (
    <main className="pb-safe flex min-h-dvh flex-col">
      <EditTopBar title={t("text.title")} step="2 / 2" backHref={`/e/${event.slug}/edit/filter`} />

      <div className="flex flex-1 flex-col gap-5 px-5">
        <div className="mx-auto w-full max-w-[340px] bg-white p-3 shadow-soft">
          {filmed ? (
            <canvas ref={canvasRef} role="img" aria-label={t("text.title")} className="block h-auto w-full" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center bg-cream text-sm text-muted-text">
              {t("edit.loading")}
            </div>
          )}
        </div>

        <TextOverlayEditor
          name={name}
          onName={(v) => {
            setName(v);
            setNameError(undefined);
          }}
          nameError={nameError}
          wish={st.wish}
          onWish={st.setWish}
          style={st.textStyle}
          onStyle={st.setTextStyle}
          showDate={st.showDate}
          onShowDate={st.setShowDate}
        />

        {multi && (
          <Toggle label={t("text.applyAll", { n: st.queue.length })} checked={st.applyToAll} onChange={st.setApplyToAll} />
        )}

        <div className="mt-auto flex flex-col gap-3 pb-2" aria-live="polite">
          {error && (
            <p role="alert" className="rounded-xl bg-[#b4533f]/10 px-4 py-3 text-center text-sm text-[#9c4332]">
              {error}
            </p>
          )}
          {progress && (
            <div className="flex flex-col gap-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-sage transition-[width] duration-200 ease-out"
                  style={{ width: `${progress.phase === "render" ? 4 : Math.max(4, progress.pct)}%` }}
                />
              </div>
              <p className="text-center text-[13px] text-muted-text">{progressLabel}</p>
            </div>
          )}
          <Button
            onClick={send}
            disabled={busy || !current}
            leadingIcon={
              busy ? (
                <Loader2 className="animate-spin" />
              ) : error ? (
                <RotateCcw strokeWidth={ICON_STROKE} />
              ) : (
                <Upload strokeWidth={ICON_STROKE} />
              )
            }
          >
            {error ? t("text.retry") : sendAll ? t("text.sendAll", { n: st.queue.length }) : t("text.send")}
          </Button>
        </div>
      </div>
    </main>
  );
}
