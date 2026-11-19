"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { EditTopBar } from "@/components/guest/EditTopBar";
import { FilterPicker } from "@/components/guest/FilterPicker";
import { QueueStrip } from "@/components/guest/QueueStrip";
import { paint, useCurrentDraft } from "@/components/guest/useDraft";
import { useGuestSession } from "@/components/guest/useGuestSession";
import { buttonClasses, ICON_STROKE } from "@/components/ui";
import { addFrame, applyFilm, drawScaled } from "@/lib/film/applyFilm";
import { getPreset } from "@/lib/film/presets";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useEditStore } from "@/stores/editStore";

const PREVIEW_EDGE = 960;

export default function FilterPage() {
  const { event, ready } = useGuestSession();
  const { t } = useI18n();
  const current = useCurrentDraft(event.slug, ready);
  const filterId = useEditStore((s) => s.filterId);
  const strength = useEditStore((s) => s.strength);
  const setFilter = useEditStore((s) => s.setFilter);
  const setStrength = useEditStore((s) => s.setStrength);

  const baseRef = useRef<HTMLCanvasElement>(null);
  const filmRef = useRef<HTMLCanvasElement>(null);

  const original = useMemo(() => (current ? drawScaled(current.source, PREVIEW_EDGE) : null), [current]);
  const cache = useRef(new Map<string, HTMLCanvasElement>());
  useEffect(() => cache.current.clear(), [original]);

  const preset = getPreset(filterId);
  const framed = Boolean(preset.frame) && strength > 0;

  // Base = original, top = full-strength film; CSS opacity = strength is exactly the strength blend.
  useEffect(() => {
    if (!original || !current) return;
    let filmed = cache.current.get(filterId);
    if (!filmed) {
      filmed = applyFilm(original, preset, 1, current.draft.seed);
      cache.current.set(filterId, filmed);
    }
    paint(baseRef.current, framed ? addFrame(original, preset, 1) : original);
    paint(filmRef.current, framed ? addFrame(filmed, preset, 1) : filmed);
  }, [original, current, filterId, preset, framed]);

  const pct = Math.round(strength * 100);

  return (
    <main className="pb-safe flex min-h-dvh flex-col">
      <EditTopBar title={t("filter.title")} step="1 / 2" backHref={`/e/${event.slug}/camera`} />

      <div className="flex flex-1 flex-col gap-5 px-5">
        <QueueStrip />

        {/* White "print" frame */}
        <div className="mx-auto w-full max-w-[340px] bg-white p-3 shadow-soft">
          {current ? (
            <div className="relative">
              <canvas ref={baseRef} className="block h-auto w-full" />
              <canvas
                ref={filmRef}
                aria-label={preset.label}
                role="img"
                className="absolute inset-0 block h-auto w-full"
                style={{ opacity: strength }}
              />
            </div>
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center bg-cream text-sm text-muted-text">
              {t("edit.loading")}
            </div>
          )}
        </div>

        {current && (
          <FilterPicker source={current.source} seed={current.draft.seed} value={filterId} onChange={setFilter} />
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="strength" className="text-[13px] font-medium text-muted-text">
              {t("filter.strength")}
            </label>
            <span className="text-[13px] font-semibold tabular-nums text-ink">{pct}%</span>
          </div>
          <input
            id="strength"
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => setStrength(Number(e.target.value) / 100)}
            className="km-range h-11 w-full"
            style={{ "--fill": `${pct}%` } as React.CSSProperties}
          />
        </div>

        <div className="mt-auto pb-2">
          <Link
            href={`/e/${event.slug}/edit/text`}
            aria-disabled={!current}
            className={buttonClasses({ className: !current ? "pointer-events-none opacity-50" : undefined })}
          >
            {t("filter.next")}
            <ArrowRight strokeWidth={ICON_STROKE} />
          </Link>
        </div>
      </div>
    </main>
  );
}
