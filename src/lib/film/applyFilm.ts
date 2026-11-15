import { getPreset, type FilmPreset } from "./presets";
import { processPixels } from "./process";
import type { FilmJob } from "./worker";

// Canvas wrappers around the pure pipeline. Browser-only.
// Never uses CanvasRenderingContext2D.filter (inconsistent on Safari).

export type FilmSource = ImageBitmap | HTMLCanvasElement | HTMLImageElement;

function sourceSize(src: FilmSource): { width: number; height: number } {
  if (src instanceof HTMLImageElement) return { width: src.naturalWidth, height: src.naturalHeight };
  return { width: src.width, height: src.height };
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is not available");
  return ctx;
}

/** Draw `src` scaled so its long edge is at most `maxEdge`. */
export function drawScaled(src: FilmSource, maxEdge = Infinity): HTMLCanvasElement {
  const { width, height } = sourceSize(src);
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = createCanvas(width * scale, height * scale);
  const ctx = context2d(canvas);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Synchronous film pass (CLAUDE.md §8 signature). Frames are added separately with `addFrame`. */
export function applyFilm(src: FilmSource, preset: FilmPreset, strength: number, seed = 1): HTMLCanvasElement {
  const canvas = drawScaled(src);
  const ctx = context2d(canvas);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  processPixels(img.data, canvas.width, canvas.height, preset, strength, { seed });
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ── Worker-backed variant for full-size renders ──────────────────────────────

let worker: Worker | null | undefined;
let nextJob = 1;
const pending = new Map<number, (buf: ArrayBuffer) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; buffer: ArrayBuffer }>) => {
      pending.get(e.data.id)?.(e.data.buffer);
      pending.delete(e.data.id);
    };
    worker.onerror = () => {
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Same result as `applyFilm`, but the pixel work runs off the main thread when Workers are available. */
export async function applyFilmAsync(
  src: FilmSource,
  presetId: string,
  strength: number,
  seed: number,
): Promise<HTMLCanvasElement> {
  const preset = getPreset(presetId);
  const w = getWorker();
  if (!w || strength <= 0 || preset.id === "original") return applyFilm(src, preset, strength, seed);

  const canvas = drawScaled(src);
  const ctx = context2d(canvas);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const id = nextJob++;
  const job: FilmJob = {
    id,
    buffer: img.data.buffer as ArrayBuffer,
    width: canvas.width,
    height: canvas.height,
    presetId,
    strength,
    seed,
  };
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Film worker timed out"));
    }, 30_000);
    pending.set(id, (b) => {
      clearTimeout(timer);
      resolve(b);
    });
    w.postMessage(job, [job.buffer]);
  }).catch(() => null);

  if (!buffer) return applyFilm(src, preset, strength, seed);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(buffer), canvas.width, canvas.height), 0, 0);
  return canvas;
}

/** Wrap `photo` in the preset's instant-photo frame (if any). Returns the photo unchanged otherwise. */
export function addFrame(photo: HTMLCanvasElement, preset: FilmPreset, strength: number): HTMLCanvasElement {
  const f = preset.frame;
  if (!f || strength <= 0) return photo;
  const w = photo.width;
  const side = Math.round(f.side * w);
  const top = Math.round(f.top * w);
  const bottom = Math.round(f.bottom * w);
  const out = createCanvas(w + side * 2, photo.height + top + bottom);
  const ctx = context2d(out);
  ctx.fillStyle = f.color;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(photo, side, top);
  // A hairline inner edge, like the print's lip.
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = Math.max(1, w / 900);
  ctx.strokeRect(side, top, photo.width, photo.height);
  return out;
}
