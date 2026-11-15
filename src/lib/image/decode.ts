import { context2d, createCanvas, type FilmSource } from "../film/applyFilm";
import { toJpeg } from "./encode";

export const MAX_EDGE = 2560;

export class UnsupportedImageError extends Error {
  constructor() {
    super("unsupported_image");
    this.name = "UnsupportedImageError";
  }
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new UnsupportedImageError());
    };
    img.src = url;
  });
}

/** Decode a photo with EXIF orientation applied. Throws UnsupportedImageError (e.g. HEIC on Android). */
export async function decodeImage(blob: Blob): Promise<FilmSource> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      /* fall back to <img>, which also honours EXIF orientation in current browsers */
    }
  }
  return loadImage(blob);
}

function size(src: FilmSource) {
  return src instanceof HTMLImageElement
    ? { width: src.naturalWidth, height: src.naturalHeight }
    : { width: src.width, height: src.height };
}

export type Crop = { sx: number; sy: number; sw: number; sh: number };

/** Draw `src` (optionally a crop of it) into a canvas whose long edge is ≤ MAX_EDGE. */
export function normalise(src: FilmSource | HTMLVideoElement, crop?: Crop, mirror = false): HTMLCanvasElement {
  const full =
    src instanceof HTMLVideoElement ? { width: src.videoWidth, height: src.videoHeight } : size(src);
  const c = crop ?? { sx: 0, sy: 0, sw: full.width, sh: full.height };
  const scale = Math.min(1, MAX_EDGE / Math.max(c.sw, c.sh));
  const canvas = createCanvas(c.sw * scale, c.sh * scale);
  const ctx = context2d(canvas);
  ctx.imageSmoothingQuality = "high";
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src, c.sx, c.sy, c.sw, c.sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** File from the gallery/camera input → oriented, downscaled JPEG ready to edit. */
export async function fileToDraft(file: Blob): Promise<Blob> {
  const src = await decodeImage(file);
  const canvas = normalise(src);
  if ("close" in src) src.close();
  return toJpeg(canvas, 0.92);
}
