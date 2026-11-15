"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { drafts, type Draft } from "@/lib/client/idb";
import type { FilmSource } from "@/lib/film/applyFilm";
import { decodeImage } from "@/lib/image/decode";
import { useEditStore } from "@/stores/editStore";

export type LoadedDraft = { draft: Draft; source: FilmSource };

/**
 * The photo currently being edited (queue[index]), decoded. Redirects to the camera if there is none —
 * unless `leaving.current` is true (the screen just sent the photo and is navigating away itself).
 */
export function useCurrentDraft(
  slug: string,
  ready: boolean,
  leaving?: React.RefObject<boolean>,
): LoadedDraft | null {
  const router = useRouter();
  const queue = useEditStore((s) => s.queue);
  const index = useEditStore((s) => s.index);
  const removeDrafts = useEditStore((s) => s.removeDrafts);
  const id = queue[index];
  const [loaded, setLoaded] = useState<LoadedDraft | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!id) {
      if (!leaving?.current) router.replace(`/e/${slug}/camera`);
      return;
    }
    let cancelled = false;
    (async () => {
      const draft = await drafts.get(id);
      if (!draft) {
        removeDrafts([id]); // stale reference (storage cleared)
        return;
      }
      const source = await decodeImage(draft.blob);
      if (!cancelled) setLoaded({ draft, source });
    })().catch(() => {
      if (!cancelled) removeDrafts([id]);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, id, slug, router, removeDrafts, leaving]);

  return loaded && loaded.draft.id === id ? loaded : null;
}

/** Draw a canvas into a visible <canvas> element, resizing it to match. */
export function paint(target: HTMLCanvasElement | null, src: HTMLCanvasElement | null): void {
  if (!target || !src) return;
  target.width = src.width;
  target.height = src.height;
  target.getContext("2d")?.drawImage(src, 0, 0);
}
