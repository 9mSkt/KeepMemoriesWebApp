import { LIMITS } from "../validation";
import { drawScaled } from "../film/applyFilm";

export function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("JPEG encoding failed"))), "image/jpeg", quality),
  );
}

/** Encode at 0.88 → 0.8 → 0.72 until under the upload target (CLAUDE.md §9.4), then shrink as a last resort. */
export async function encodeForUpload(canvas: HTMLCanvasElement): Promise<Blob> {
  for (const q of [0.88, 0.8, 0.72]) {
    const blob = await toJpeg(canvas, q);
    if (blob.size <= LIMITS.uploadTargetBytes) return blob;
  }
  let current = canvas;
  for (let i = 0; i < 4; i++) {
    current = drawScaled(current, Math.max(current.width, current.height) * 0.8);
    const blob = await toJpeg(current, 0.8);
    if (blob.size <= LIMITS.uploadTargetBytes) return blob;
  }
  return toJpeg(current, 0.7);
}

export function makeThumbnail(canvas: HTMLCanvasElement, maxEdge = 400): Promise<Blob> {
  return toJpeg(drawScaled(canvas, maxEdge), 0.8);
}
