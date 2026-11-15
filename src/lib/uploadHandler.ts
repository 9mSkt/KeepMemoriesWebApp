import "server-only";
import { db, type EventRecord } from "./db";
import { uploadStatus } from "./db/events";
import { fakeUpload } from "./google/fake";
import { GoogleAuthError } from "./google/oauth";
import { batchCreate, GooglePhotosError, photoDescription, uploadBytes, withAccessToken } from "./google/photos";
import { LIMITS, cleanText, validateGuestName, validateWish } from "./validation";
import { FILM_PRESET_IDS } from "./film/presets";

export type UploadResult =
  | { ok: true; status: 200 }
  | { ok: false; status: number; error: string; message: string };

const fail = (status: number, error: string, message: string): UploadResult => ({ ok: false, status, error, message });

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Validate a guest upload and send it through the Google Photos upload sequence (CLAUDE.md §2, §9.6). */
export async function handleUpload(event: EventRecord, form: FormData): Promise<UploadResult> {
  const status = uploadStatus(event);
  if (status === "not_ready") return fail(409, "not_ready", "The couple hasn't finished setting up the album yet.");
  if (status === "not_started") return fail(403, "not_started", "Uploads haven't opened yet.");
  if (status === "closed") return fail(403, "closed", "Uploads are closed.");

  const photo = form.get("photo");
  const guestName = cleanText(form.get("guestName"));
  const wishRaw = cleanText(form.get("wish"));
  const wish = wishRaw || null;
  const filter = cleanText(form.get("filter"));
  const deviceId = cleanText(form.get("deviceId"));

  if (!(photo instanceof File)) return fail(400, "invalid", "No photo was sent.");
  if (photo.type !== "image/jpeg") return fail(415, "invalid", "Photo must be a JPEG.");
  if (photo.size > LIMITS.uploadMaxBytes) return fail(413, "too_large", "Photo is too large.");
  if (validateGuestName(guestName)) return fail(400, "invalid", "Name must be 1–40 characters.");
  if (wish && validateWish(wish)) return fail(400, "invalid", "Wish must be 120 characters or fewer.");
  if (!(FILM_PRESET_IDS as readonly string[]).includes(filter)) return fail(400, "invalid", "Unknown film.");
  if (!/^[A-Za-z0-9-]{8,64}$/.test(deviceId)) return fail(400, "invalid", "Missing device id.");

  const since = new Date(Date.now() - LIMITS.rateLimitWindowMs).toISOString();
  if ((await db().countDeviceUploadsSince(event.id, deviceId, since)) >= LIMITS.rateLimitUploads) {
    return fail(429, "rate_limited", "That's a lot of photos! Please wait a few minutes and try again.");
  }

  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (!isJpeg(bytes)) return fail(415, "invalid", "Photo must be a JPEG.");

  const fileName = `${event.slug}-${Date.now()}.jpg`;
  const description = photoDescription(guestName, wish);
  const log = { eventId: event.id, deviceId, guestName, wish, filter };

  try {
    let mediaItemId: string;
    if (event.googleAlbumId!.startsWith("dev-album-")) {
      mediaItemId = fakeUpload(event.slug, fileName, bytes, description);
    } else {
      mediaItemId = await withAccessToken(event, async (token) => {
        const uploadToken = await uploadBytes(token, bytes);
        return batchCreate(token, event.googleAlbumId!, uploadToken, fileName, description);
      });
    }
    await db().insertUpload({ ...log, googleMediaItemId: mediaItemId, status: "ok", error: null });
    return { ok: true, status: 200 };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Upload failed:", message);
    await db()
      .insertUpload({ ...log, googleMediaItemId: null, status: "failed", error: message.slice(0, 500) })
      .catch(() => {});
    if (err instanceof GoogleAuthError) {
      return fail(503, "google_auth", "The album is temporarily unavailable. The couple has been asked to reconnect.");
    }
    if (err instanceof GooglePhotosError && err.status === 429) {
      return fail(503, "busy", "Google Photos is busy. We'll try again.");
    }
    return fail(502, "google_failed", "Couldn't save to Google Photos. We'll try again.");
  }
}
