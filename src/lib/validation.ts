// Limits and validators shared by the browser and the server.

export const LIMITS = {
  guestNameMax: 40,
  wishMax: 120,
  coupleNamesMax: 60,
  venueMax: 120,
  pinMin: 4,
  pinMax: 8,
  /** Server rejects photos above this (Vercel's body limit is ~4.5 MB). */
  uploadMaxBytes: 4 * 1024 * 1024,
  /** Client re-encodes until the JPEG is below this. */
  uploadTargetBytes: 3.5 * 1024 * 1024,
  coverMaxBytes: 2 * 1024 * 1024,
  rateLimitUploads: 30,
  rateLimitWindowMs: 10 * 60 * 1000,
} as const;

const SHARED_ALBUM_PREFIXES = ["https://photos.app.goo.gl/", "https://photos.google.com/share/"];

export function isValidSharedAlbumUrl(url: string): boolean {
  return SHARED_ALBUM_PREFIXES.some((p) => url.startsWith(p) && url.length > p.length);
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${LIMITS.pinMin},${LIMITS.pinMax}}$`).test(pin);
}

/** yyyy-mm-dd that is a real calendar date. */
export function isValidIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function validateGuestName(name: string): string | null {
  if (name.length < 1) return "name_required";
  if (name.length > LIMITS.guestNameMax) return "name_too_long";
  return null;
}

export function validateWish(wish: string): string | null {
  return wish.length > LIMITS.wishMax ? "wish_too_long" : null;
}

const THAI = /[฀-๿]/;
export function containsThai(text: string): boolean {
  return THAI.test(text);
}
