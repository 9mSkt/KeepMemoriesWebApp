import { addFrame, applyFilm, applyFilmAsync, context2d, createCanvas, drawScaled, type FilmSource } from "../film/applyFilm";
import { getPreset } from "../film/presets";
import { drawOverlays, ensureFonts, type Overlays } from "./overlay";

export interface RenderOptions {
  presetId: string;
  strength: number;
  seed: number;
  overlays: Overlays | null;
}

/** Film pass at a given size. Cache this; overlays are cheap to redraw on top. */
export async function filmPass(
  src: FilmSource,
  presetId: string,
  strength: number,
  seed: number,
  maxEdge: number,
  { offThread }: { offThread: boolean },
): Promise<HTMLCanvasElement> {
  const scaled = drawScaled(src, maxEdge);
  return offThread
    ? applyFilmAsync(scaled, presetId, strength, seed)
    : applyFilm(scaled, getPreset(presetId), strength, seed);
}

/** Overlays + frame on a copy of a film-processed canvas. Same function for preview and final. */
export async function finishPhoto(
  filmed: HTMLCanvasElement,
  presetId: string,
  strength: number,
  overlays: Overlays | null,
): Promise<HTMLCanvasElement> {
  const out = createCanvas(filmed.width, filmed.height);
  const ctx = context2d(out);
  ctx.drawImage(filmed, 0, 0);
  if (overlays) {
    await ensureFonts(overlays);
    drawOverlays(ctx, out.width, out.height, overlays);
  }
  return addFrame(out, getPreset(presetId), strength);
}

/** Full-resolution final render for upload. */
export async function renderFinal(src: FilmSource, o: RenderOptions): Promise<HTMLCanvasElement> {
  const filmed = await filmPass(src, o.presetId, o.strength, o.seed, Infinity, { offThread: true });
  return finishPhoto(filmed, o.presetId, o.strength, o.overlays);
}
