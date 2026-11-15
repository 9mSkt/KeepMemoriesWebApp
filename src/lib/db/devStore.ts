import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EventRecord, NewEvent, NewUpload, Store, UploadRecord } from "./types";

// Local development stand-in for Supabase: a JSON file in `.data/`. Never used in production.

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "db.json");

type Data = { events: EventRecord[]; uploads: UploadRecord[] };

function load(): Data {
  if (!existsSync(FILE)) return { events: [], uploads: [] };
  return JSON.parse(readFileSync(FILE, "utf8")) as Data;
}

function save(data: Data): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, FILE);
}

export function createDevStore(): Store {
  return {
    async createEvent(e: NewEvent) {
      const data = load();
      if (data.events.some((x) => x.slug === e.slug)) throw new Error("duplicate slug");
      const event: EventRecord = {
        ...e,
        id: randomUUID(),
        googleEmail: null,
        googleRefreshTokenEnc: null,
        googleAlbumId: null,
        googleAlbumTitle: null,
        sharedAlbumUrl: null,
        uploadOpensAt: null,
        createdAt: new Date().toISOString(),
      };
      data.events.push(event);
      save(data);
      return event;
    },

    async getEventBySlug(slug) {
      return load().events.find((e) => e.slug === slug) ?? null;
    },

    async updateEvent(id, patch) {
      const data = load();
      const i = data.events.findIndex((e) => e.id === id);
      if (i < 0) throw new Error("event not found");
      const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      data.events[i] = { ...data.events[i], ...defined };
      save(data);
      return data.events[i];
    },

    async insertUpload(u: NewUpload) {
      const data = load();
      data.uploads.push({ ...u, id: randomUUID(), createdAt: new Date().toISOString() });
      save(data);
    },

    async countUploads(eventId, status) {
      return load().uploads.filter((u) => u.eventId === eventId && (!status || u.status === status)).length;
    },

    async recentUploads(eventId, limit) {
      return load()
        .uploads.filter((u) => u.eventId === eventId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },

    async countDeviceUploadsSince(eventId, deviceId, sinceIso) {
      return load().uploads.filter(
        (u) => u.eventId === eventId && u.deviceId === deviceId && u.createdAt >= sinceIso,
      ).length;
    },

    async saveCoverImage(_slug, bytes, contentType) {
      // Small (client-resized) covers are kept inline as a data URL in dev.
      return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
    },
  };
}
