"use client";

import { useEffect, useState } from "react";
import { FilterThumb } from "@/components/ui";
import { applyFilm, drawScaled, type FilmSource } from "@/lib/film/applyFilm";
import { FILM_PRESETS, type FilmPresetId } from "@/lib/film/presets";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Horizontal list of films with real previews of the guest's photo. */
export function FilterPicker({
  source,
  seed,
  value,
  onChange,
}: {
  source: FilmSource;
  seed: number;
  value: FilmPresetId;
  onChange: (id: FilmPresetId) => void;
}) {
  const { locale } = useI18n();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const small = drawScaled(source, 160);
    // One preset per tick so the screen stays responsive while thumbnails render.
    (async () => {
      for (const preset of FILM_PRESETS) {
        await new Promise((r) => setTimeout(r, 0));
        if (cancelled) return;
        const url = applyFilm(small, preset, 1, seed).toDataURL("image/jpeg", 0.8);
        setThumbs((t) => ({ ...t, [preset.id]: url }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, seed]);

  return (
    <div className="-mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 py-1.5 [scrollbar-width:none]">
      {FILM_PRESETS.map((p) => (
        <FilterThumb
          key={p.id}
          className="snap-start"
          label={locale === "th" ? p.labelTh : p.label}
          src={thumbs[p.id]}
          selected={value === p.id}
          onClick={() => onChange(p.id)}
        />
      ))}
    </div>
  );
}
