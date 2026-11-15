import "server-only";
import { db, type EventRecord } from ".";

export type UploadWindowStatus = "open" | "not_ready" | "not_started" | "closed";

/** What guests see. Never includes tokens or the album id. */
export interface PublicEvent {
  slug: string;
  coupleNames: string;
  weddingDate: string;
  venue: string | null;
  coverImageUrl: string | null;
  sharedAlbumUrl: string | null;
  uploadOpensAt: string | null;
  uploadClosesAt: string | null;
  status: UploadWindowStatus;
  isOpen: boolean;
}

/** What the host setup screen sees. Still no tokens or album id. */
export interface HostEvent extends PublicEvent {
  googleConnected: boolean;
  googleEmail: string | null;
  googleAlbumTitle: string | null;
}

export function uploadStatus(e: EventRecord, now = new Date()): UploadWindowStatus {
  if (!e.googleAlbumId || !e.googleRefreshTokenEnc) return "not_ready";
  if (e.uploadOpensAt && now < new Date(e.uploadOpensAt)) return "not_started";
  if (e.uploadClosesAt && now > new Date(e.uploadClosesAt)) return "closed";
  return "open";
}

export function toPublicEvent(e: EventRecord): PublicEvent {
  const status = uploadStatus(e);
  return {
    slug: e.slug,
    coupleNames: e.coupleNames,
    weddingDate: e.weddingDate,
    venue: e.venue,
    coverImageUrl: e.coverImageUrl,
    sharedAlbumUrl: e.sharedAlbumUrl,
    uploadOpensAt: e.uploadOpensAt,
    uploadClosesAt: e.uploadClosesAt,
    status,
    isOpen: status === "open",
  };
}

export function toHostEvent(e: EventRecord): HostEvent {
  return {
    ...toPublicEvent(e),
    googleConnected: Boolean(e.googleAlbumId && e.googleRefreshTokenEnc),
    googleEmail: e.googleEmail,
    googleAlbumTitle: e.googleAlbumTitle,
  };
}

export function getEvent(slug: string): Promise<EventRecord | null> {
  // Slugs are lowercase [a-z0-9-]; reject anything else before touching the DB.
  if (!/^[a-z0-9-]{10,80}$/.test(slug)) return Promise.resolve(null);
  return db().getEventBySlug(slug);
}
