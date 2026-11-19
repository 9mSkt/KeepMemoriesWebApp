"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ICON_STROKE } from "@/components/ui";
import { drafts } from "@/lib/client/idb";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import { useEditStore } from "@/stores/editStore";

/**
 * Every photo waiting to be sent: tap one to edit it, or remove the selected one before uploading.
 * Thumbnails are object URLs of the drafts in IndexedDB (the browser downscales them for display).
 */
export function QueueStrip({ disabled = false }: { disabled?: boolean }) {
  const { t } = useI18n();
  const queue = useEditStore((s) => s.queue);
  const index = useEditStore((s) => s.index);
  const setIndex = useEditStore((s) => s.setIndex);
  const removeDrafts = useEditStore((s) => s.removeDrafts);
  const [urls, setUrls] = useState<Record<string, string>>({});

  // Create an object URL for each new draft; revoke the ones no longer queued.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const id of queue) {
        if (urls[id]) {
          next[id] = urls[id];
          continue;
        }
        const draft = await drafts.get(id);
        if (draft) next[id] = URL.createObjectURL(draft.blob);
      }
      if (cancelled) {
        for (const id of Object.keys(next)) if (!urls[id]) URL.revokeObjectURL(next[id]);
        return;
      }
      for (const [id, url] of Object.entries(urls)) if (!next[id]) URL.revokeObjectURL(url);
      setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
    // `urls` is the previous result, read only to reuse/revoke; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  // Revoke everything on unmount.
  const latest = useRef(urls);
  useEffect(() => {
    latest.current = urls;
  }, [urls]);
  useEffect(() => () => Object.values(latest.current).forEach((u) => URL.revokeObjectURL(u)), []);

  if (!queue.length) return null;

  function remove() {
    const id = queue[index];
    if (!id || disabled) return;
    if (!window.confirm(t("edit.removeConfirm"))) return;
    removeDrafts([id]);
    void drafts.delete(id);
  }

  return (
    <section aria-label={t("edit.yourPhotos", { n: queue.length })} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-text">{t("edit.yourPhotos", { n: queue.length })}</p>
        <button
          type="button"
          onClick={remove}
          disabled={disabled}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-[#9c4332] hover:bg-cream disabled:opacity-50"
        >
          <Trash2 size={16} strokeWidth={ICON_STROKE} />
          {t("edit.remove")}
        </button>
      </div>
      <ul className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 pt-1">
        {queue.map((id, i) => (
          <li key={id} className="shrink-0">
            <button
              type="button"
              onClick={() => setIndex(i)}
              disabled={disabled}
              aria-current={i === index}
              aria-label={t("edit.photoOf", { i: i + 1, n: queue.length })}
              className={cn(
                "block size-14 overflow-hidden rounded-[10px] bg-cream transition-shadow duration-150 ease-out",
                i === index ? "ring-[3px] ring-gold ring-offset-2 ring-offset-ivory" : "opacity-80",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
              {urls[id] && <img src={urls[id]} alt="" className="size-full object-cover" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
