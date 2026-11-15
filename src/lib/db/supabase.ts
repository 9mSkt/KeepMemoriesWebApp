import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";
import type { EventPatch, EventRecord, NewEvent, NewUpload, Store, UploadRecord } from "./types";

type EventRow = {
  id: string;
  slug: string;
  couple_names: string;
  wedding_date: string;
  venue: string | null;
  cover_image_url: string | null;
  host_pin_hash: string;
  google_email: string | null;
  google_refresh_token_enc: string | null;
  google_album_id: string | null;
  google_album_title: string | null;
  shared_album_url: string | null;
  upload_opens_at: string | null;
  upload_closes_at: string | null;
  created_at: string;
};

type UploadRow = {
  id: string;
  event_id: string;
  device_id: string;
  guest_name: string;
  wish: string | null;
  filter: string;
  google_media_item_id: string | null;
  status: "ok" | "failed";
  error: string | null;
  created_at: string;
};

const COVER_BUCKET = "covers";

const toEvent = (r: EventRow): EventRecord => ({
  id: r.id,
  slug: r.slug,
  coupleNames: r.couple_names,
  weddingDate: r.wedding_date,
  venue: r.venue,
  coverImageUrl: r.cover_image_url,
  hostPinHash: r.host_pin_hash,
  googleEmail: r.google_email,
  googleRefreshTokenEnc: r.google_refresh_token_enc,
  googleAlbumId: r.google_album_id,
  googleAlbumTitle: r.google_album_title,
  sharedAlbumUrl: r.shared_album_url,
  uploadOpensAt: r.upload_opens_at,
  uploadClosesAt: r.upload_closes_at,
  createdAt: r.created_at,
});

const toUpload = (r: UploadRow): UploadRecord => ({
  id: r.id,
  eventId: r.event_id,
  deviceId: r.device_id,
  guestName: r.guest_name,
  wish: r.wish,
  filter: r.filter,
  googleMediaItemId: r.google_media_item_id,
  status: r.status,
  error: r.error,
  createdAt: r.created_at,
});

const PATCH_COLUMNS: Record<keyof EventPatch, keyof EventRow> = {
  coupleNames: "couple_names",
  weddingDate: "wedding_date",
  venue: "venue",
  coverImageUrl: "cover_image_url",
  googleEmail: "google_email",
  googleRefreshTokenEnc: "google_refresh_token_enc",
  googleAlbumId: "google_album_id",
  googleAlbumTitle: "google_album_title",
  sharedAlbumUrl: "shared_album_url",
  uploadOpensAt: "upload_opens_at",
  uploadClosesAt: "upload_closes_at",
};

function fail(op: string, error: { message: string } | null): never {
  throw new Error(`Supabase ${op} failed: ${error?.message ?? "unknown error"}`);
}

export function createSupabaseStore(): Store {
  const db: SupabaseClient = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async createEvent(e: NewEvent) {
      const { data, error } = await db
        .from("events")
        .insert({
          slug: e.slug,
          couple_names: e.coupleNames,
          wedding_date: e.weddingDate,
          venue: e.venue,
          cover_image_url: e.coverImageUrl,
          host_pin_hash: e.hostPinHash,
          upload_closes_at: e.uploadClosesAt,
        })
        .select()
        .single<EventRow>();
      if (error || !data) fail("createEvent", error);
      return toEvent(data);
    },

    async getEventBySlug(slug) {
      const { data, error } = await db.from("events").select().eq("slug", slug).maybeSingle<EventRow>();
      if (error) fail("getEventBySlug", error);
      return data ? toEvent(data) : null;
    },

    async updateEvent(id, patch) {
      const row: Partial<EventRow> = {};
      for (const [key, value] of Object.entries(patch) as [keyof EventPatch, string | null][]) {
        if (value !== undefined) (row as Record<string, string | null>)[PATCH_COLUMNS[key]] = value;
      }
      const { data, error } = await db.from("events").update(row).eq("id", id).select().single<EventRow>();
      if (error || !data) fail("updateEvent", error);
      return toEvent(data);
    },

    async insertUpload(u: NewUpload) {
      const { error } = await db.from("uploads").insert({
        event_id: u.eventId,
        device_id: u.deviceId,
        guest_name: u.guestName,
        wish: u.wish,
        filter: u.filter,
        google_media_item_id: u.googleMediaItemId,
        status: u.status,
        error: u.error,
      });
      if (error) fail("insertUpload", error);
    },

    async countUploads(eventId, status) {
      let q = db.from("uploads").select("id", { count: "exact", head: true }).eq("event_id", eventId);
      if (status) q = q.eq("status", status);
      const { count, error } = await q;
      if (error) fail("countUploads", error);
      return count ?? 0;
    },

    async recentUploads(eventId, limit) {
      const { data, error } = await db
        .from("uploads")
        .select()
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(limit)
        .returns<UploadRow[]>();
      if (error) fail("recentUploads", error);
      return (data ?? []).map(toUpload);
    },

    async countDeviceUploadsSince(eventId, deviceId, sinceIso) {
      const { count, error } = await db
        .from("uploads")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("device_id", deviceId)
        .gte("created_at", sinceIso);
      if (error) fail("countDeviceUploadsSince", error);
      return count ?? 0;
    },

    async saveCoverImage(slug, bytes, contentType) {
      const path = `${slug}/${Date.now()}.jpg`;
      const { error } = await db.storage.from(COVER_BUCKET).upload(path, bytes, { contentType, upsert: true });
      if (error) fail("saveCoverImage", error);
      return db.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl;
    },
  };
}
