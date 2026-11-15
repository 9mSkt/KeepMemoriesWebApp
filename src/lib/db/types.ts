/** Full event row. Server-only: contains the encrypted refresh token and album id. */
export interface EventRecord {
  id: string;
  slug: string;
  coupleNames: string;
  weddingDate: string; // yyyy-mm-dd
  venue: string | null;
  coverImageUrl: string | null;
  hostPinHash: string;
  googleEmail: string | null;
  googleRefreshTokenEnc: string | null;
  googleAlbumId: string | null;
  googleAlbumTitle: string | null;
  sharedAlbumUrl: string | null;
  uploadOpensAt: string | null; // ISO timestamp
  uploadClosesAt: string | null;
  createdAt: string;
}

export type NewEvent = Pick<
  EventRecord,
  "slug" | "coupleNames" | "weddingDate" | "venue" | "coverImageUrl" | "hostPinHash" | "uploadClosesAt"
>;

export type EventPatch = Partial<
  Pick<
    EventRecord,
    | "coupleNames"
    | "weddingDate"
    | "venue"
    | "coverImageUrl"
    | "googleEmail"
    | "googleRefreshTokenEnc"
    | "googleAlbumId"
    | "googleAlbumTitle"
    | "sharedAlbumUrl"
    | "uploadOpensAt"
    | "uploadClosesAt"
  >
>;

export interface UploadRecord {
  id: string;
  eventId: string;
  deviceId: string;
  guestName: string;
  wish: string | null;
  filter: string;
  googleMediaItemId: string | null;
  status: "ok" | "failed";
  error: string | null;
  createdAt: string;
}

export type NewUpload = Omit<UploadRecord, "id" | "createdAt">;

export interface Store {
  createEvent(e: NewEvent): Promise<EventRecord>;
  getEventBySlug(slug: string): Promise<EventRecord | null>;
  updateEvent(id: string, patch: EventPatch): Promise<EventRecord>;
  insertUpload(u: NewUpload): Promise<void>;
  countUploads(eventId: string, status?: "ok" | "failed"): Promise<number>;
  recentUploads(eventId: string, limit: number): Promise<UploadRecord[]>;
  countDeviceUploadsSince(eventId: string, deviceId: string, sinceIso: string): Promise<number>;
  /** Public URL for an uploaded cover image. */
  saveCoverImage(slug: string, bytes: Uint8Array, contentType: string): Promise<string>;
}
