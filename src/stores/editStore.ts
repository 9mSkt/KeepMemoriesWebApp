"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_FILM, DEFAULT_STRENGTH, type FilmPresetId } from "@/lib/film/presets";
import type { TextStyle } from "@/lib/image/overlay";

// Guest edit state. Small settings persist in localStorage; the photos themselves live in IndexedDB
// (`drafts`), referenced here by id — together a refresh mid-edit loses nothing.

export interface EditState {
  slug: string | null;
  /** Draft ids in IndexedDB, in the order they'll be edited. */
  queue: string[];
  index: number;
  filterId: FilmPresetId;
  strength: number;
  wish: string;
  textStyle: TextStyle;
  showDate: boolean;
  applyToAll: boolean;
  /** Result of the last send, for the saved screen. */
  lastSent: { ids: string[]; queued: boolean } | null;

  forEvent: (slug: string) => void;
  addDrafts: (ids: string[]) => void;
  removeDrafts: (ids: string[]) => void;
  setFilter: (id: FilmPresetId) => void;
  setStrength: (v: number) => void;
  setWish: (v: string) => void;
  setTextStyle: (v: TextStyle) => void;
  setShowDate: (v: boolean) => void;
  setApplyToAll: (v: boolean) => void;
  setLastSent: (v: EditState["lastSent"]) => void;
}

const fresh = {
  queue: [] as string[],
  index: 0,
  wish: "",
  lastSent: null,
};

export const useEditStore = create<EditState>()(
  persist(
    (set, get) => ({
      slug: null,
      ...fresh,
      filterId: DEFAULT_FILM,
      strength: DEFAULT_STRENGTH,
      textStyle: "script",
      showDate: true,
      applyToAll: true,

      forEvent: (slug) => {
        if (get().slug !== slug) set({ slug, ...fresh });
      },
      addDrafts: (ids) => set((s) => ({ queue: [...s.queue, ...ids] })),
      removeDrafts: (ids) =>
        set((s) => {
          const queue = s.queue.filter((id) => !ids.includes(id));
          return { queue, index: Math.min(s.index, Math.max(0, queue.length - 1)) };
        }),
      setFilter: (filterId) => set({ filterId }),
      setStrength: (strength) => set({ strength: Math.min(1, Math.max(0, strength)) }),
      setWish: (wish) => set({ wish }),
      setTextStyle: (textStyle) => set({ textStyle }),
      setShowDate: (showDate) => set({ showDate }),
      setApplyToAll: (applyToAll) => set({ applyToAll }),
      setLastSent: (lastSent) => set({ lastSent }),
    }),
    {
      name: "km-edit",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Rehydrate after mount (see useEditHydrated) so the server and first client render match.
      skipHydration: true,
    },
  ),
);

/** Loads persisted state on the client; true once it's ready. Use in every guest screen that reads the store. */
export function useEditHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useEditStore.persist.onFinishHydration(() => setHydrated(true));
    if (useEditStore.persist.hasHydrated()) setHydrated(true);
    else void useEditStore.persist.rehydrate();
    return unsub;
  }, []);
  return hydrated;
}
