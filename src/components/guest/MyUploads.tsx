"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Download, X } from "lucide-react";
import { Button, ICON_STROKE } from "@/components/ui";
import type { MyUpload } from "@/lib/client/idb";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type UploadWithUrls = MyUpload & { thumbUrl: string };

/** Thumbnails of this device's uploads; tap to view full screen and save to the phone. */
export function MyUploads({ uploads }: { uploads: UploadWithUrls[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<UploadWithUrls | null>(null);

  return (
    <section aria-labelledby="my-photos" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="my-photos" className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-text">
          {t("saved.yourPhotos")}
        </h2>
        <span className="text-[13px] font-semibold tabular-nums text-ink">{uploads.length}</span>
      </div>
      {uploads.length === 0 ? (
        <p className="text-sm text-muted-text">{t("saved.empty")}</p>
      ) : (
        <ul className="grid grid-cols-4 gap-2">
          {uploads.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => setOpen(u)}
                className="relative block aspect-square w-full overflow-hidden rounded-xl bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                aria-label={u.status === "pending" ? t("saved.pending") : `${u.guestName} ${u.wish}`.trim()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.thumbUrl} alt="" className="size-full object-cover" />
                {u.status === "pending" && (
                  <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-md bg-black/55 py-0.5 text-[10px] font-medium text-white">
                    <Clock size={10} strokeWidth={2} /> {t("saved.pending")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <Viewer upload={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Viewer({ upload, onClose }: { upload: UploadWithUrls; onClose: () => void }) {
  const { t } = useI18n();
  const [fullUrl, setFullUrl] = useState<string>("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(upload.full);
    setFullUrl(url);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      URL.revokeObjectURL(url);
      window.removeEventListener("keydown", onKey);
    };
  }, [upload, onClose]);

  async function save() {
    const file = new File([upload.full], `wedding-memory-${upload.createdAt}.jpg`, { type: "image/jpeg" });
    // Web Share with files lets iOS/Android save straight to Photos; otherwise download.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
      }
    }
    const a = document.createElement("a");
    a.href = fullUrl;
    a.download = file.name;
    a.click();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={t("saved.yourPhotos")} className="fixed inset-0 z-50 flex flex-col bg-night/95">
      <div className="pt-safe flex justify-end px-3">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("saved.close")}
          className="flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <X size={24} strokeWidth={ICON_STROKE} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        {fullUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fullUrl} alt="" className="max-h-full max-w-full rounded-md object-contain" />
        )}
      </div>
      <div className="pb-safe mx-auto w-full max-w-[430px] px-5 pt-4">
        <Button onClick={save} leadingIcon={<Download strokeWidth={ICON_STROKE} />}>
          {t("saved.saveToPhone")}
        </Button>
      </div>
    </div>
  );
}
