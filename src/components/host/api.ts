"use client";

export type SaveResult = { ok: true } | { ok: false; message: string; fields: Record<string, string> };

/** PATCH /api/host/[slug] with FormData. */
export async function patchEvent(slug: string, form: FormData): Promise<SaveResult> {
  try {
    const res = await fetch(`/api/host/${slug}`, { method: "PATCH", body: form });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => ({}))) as { message?: string; fields?: Record<string, string> };
    return { ok: false, message: body.message ?? "Couldn't save. Please try again.", fields: body.fields ?? {} };
  } catch {
    return { ok: false, message: "You seem to be offline. Please try again.", fields: {} };
  }
}

/** Resize a cover photo in the browser so uploads stay small (long edge 1200 px, JPEG). */
export async function resizeCover(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85),
  );
  return new File([blob], "cover.jpg", { type: "image/jpeg" });
}

/** ISO timestamp → value for <input type="datetime-local"> in the browser's time zone. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value: string): string {
  return value ? new Date(value).toISOString() : "";
}
