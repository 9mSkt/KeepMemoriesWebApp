import { myUploads, outbox, type OutboxItem } from "./idb";

// Browser upload client: XHR for progress, exponential-backoff retries, and an IndexedDB outbox that's
// flushed when the phone comes back online.

export type UploadResponse = { ok: true } | { ok: false; status: number; error: string; message: string };

export interface UploadPayload {
  slug: string;
  photo: Blob;
  guestName: string;
  wish: string;
  filter: string;
  deviceId: string;
}

export function uploadOnce(p: UploadPayload, onProgress?: (fraction: number) => void): Promise<UploadResponse> {
  return new Promise((resolve) => {
    const form = new FormData();
    form.append("photo", new File([p.photo], "photo.jpg", { type: "image/jpeg" }));
    form.append("guestName", p.guestName);
    form.append("wish", p.wish);
    form.append("filter", p.filter);
    form.append("deviceId", p.deviceId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/e/${encodeURIComponent(p.slug)}/upload`);
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ ok: true });
      let body: { error?: string; message?: string } = {};
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        /* not JSON */
      }
      resolve({ ok: false, status: xhr.status, error: body.error ?? "server", message: body.message ?? "" });
    };
    const networkError = () => resolve({ ok: false, status: 0, error: "network", message: "" });
    xhr.onerror = networkError;
    xhr.ontimeout = networkError;
    xhr.onabort = networkError;
    xhr.send(form);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Network errors and 5xx/429 are worth retrying; other 4xx (closed, invalid) are not. */
export function isRetryable(r: UploadResponse): boolean {
  return !r.ok && (r.status === 0 || r.status === 429 || r.status >= 500);
}

export type SendOutcome = { kind: "sent" } | { kind: "queued" } | { kind: "error"; response: UploadResponse };

/**
 * Upload with up to 3 attempts (1 s, 2 s backoff). If the phone is offline — or still can't reach the
 * server after retrying — the photo goes into the outbox and is sent later automatically.
 */
export async function sendPhoto(
  p: UploadPayload,
  myUploadId: string,
  onProgress?: (fraction: number) => void,
): Promise<SendOutcome> {
  const queue = async (): Promise<SendOutcome> => {
    await outbox.put({ ...p, id: myUploadId, createdAt: Date.now() });
    return { kind: "queued" };
  };
  if (typeof navigator !== "undefined" && navigator.onLine === false) return queue();

  let last: UploadResponse = { ok: false, status: 0, error: "network", message: "" };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1));
    last = await uploadOnce(p, onProgress);
    if (last.ok) return { kind: "sent" };
    if (!isRetryable(last)) break;
  }
  if (!last.ok && last.status === 0) return queue();
  return { kind: "error", response: last };
}

let flushing = false;

/** Send everything in the outbox. Returns how many were sent. Safe to call often. */
export async function flushOutbox(): Promise<number> {
  if (flushing || (typeof navigator !== "undefined" && navigator.onLine === false)) return 0;
  flushing = true;
  let sent = 0;
  try {
    const items: OutboxItem[] = await outbox.list();
    for (const item of items) {
      const r = await uploadOnce(item);
      if (r.ok) {
        await outbox.delete(item.id);
        await myUploads.markSent(item.id);
        sent++;
      } else if (r.status === 0) {
        break; // still offline — try again later
      } else if (!isRetryable(r)) {
        await outbox.delete(item.id); // permanently rejected (e.g. uploads closed)
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}
