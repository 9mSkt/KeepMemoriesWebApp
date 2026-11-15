import "server-only";
import { db, type EventPatch } from "./db";
import { LIMITS, cleanText, isValidIsoDate, isValidSharedAlbumUrl } from "./validation";

// Shared parsing for the create-event and update-event endpoints (FormData from the host screens).

export type FieldErrors = Record<string, string>;

const JPEG_OR_PNG = ["image/jpeg", "image/png", "image/webp"];

export async function readCover(form: FormData, errors: FieldErrors): Promise<File | null> {
  const cover = form.get("cover");
  if (!(cover instanceof File) || cover.size === 0) return null;
  if (!JPEG_OR_PNG.includes(cover.type)) errors.cover = "Cover must be a JPEG, PNG or WebP image.";
  else if (cover.size > LIMITS.coverMaxBytes) errors.cover = "Cover image is too large (max 2 MB).";
  return errors.cover ? null : cover;
}

export async function storeCover(slug: string, cover: File): Promise<string> {
  return db().saveCoverImage(slug, new Uint8Array(await cover.arrayBuffer()), cover.type);
}

function optionalIso(value: FormDataEntryValue | null, field: string, errors: FieldErrors): string | null | undefined {
  if (value === null) return undefined;
  const s = cleanText(value);
  if (s === "") return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    errors[field] = "Invalid date and time.";
    return undefined;
  }
  return d.toISOString();
}

/** Parse the editable event fields. Only fields present in the form are returned. */
export function parseEventFields(form: FormData, errors: FieldErrors, { requireCore }: { requireCore: boolean }) {
  const patch: EventPatch = {};

  if (form.has("coupleNames") || requireCore) {
    const names = cleanText(form.get("coupleNames"));
    if (!names) errors.coupleNames = "Enter your names.";
    else if (names.length > LIMITS.coupleNamesMax) errors.coupleNames = `Max ${LIMITS.coupleNamesMax} characters.`;
    else patch.coupleNames = names;
  }

  if (form.has("weddingDate") || requireCore) {
    const date = cleanText(form.get("weddingDate"));
    if (!isValidIsoDate(date)) errors.weddingDate = "Choose the wedding date.";
    else patch.weddingDate = date;
  }

  if (form.has("venue")) {
    const venue = cleanText(form.get("venue"));
    if (venue.length > LIMITS.venueMax) errors.venue = `Max ${LIMITS.venueMax} characters.`;
    else patch.venue = venue || null;
  }

  if (form.has("sharedAlbumUrl")) {
    const url = cleanText(form.get("sharedAlbumUrl"));
    if (url && !isValidSharedAlbumUrl(url)) {
      errors.sharedAlbumUrl = "Paste a link that starts with https://photos.app.goo.gl/ or https://photos.google.com/share/";
    } else patch.sharedAlbumUrl = url || null;
  }

  const opens = optionalIso(form.get("uploadOpensAt"), "uploadOpensAt", errors);
  if (opens !== undefined) patch.uploadOpensAt = opens;
  const closes = optionalIso(form.get("uploadClosesAt"), "uploadClosesAt", errors);
  if (closes !== undefined) patch.uploadClosesAt = closes;
  if (opens && closes && new Date(opens) >= new Date(closes)) {
    errors.uploadClosesAt = "Closing time must be after the opening time.";
  }

  return patch;
}
