import { createStore, del, entries, get, set, type UseStore } from "idb-keyval";

// IndexedDB stores (one database each — idb-keyval keeps one store per database).
//   drafts     photos being edited, so a refresh mid-edit doesn't lose them
//   my-uploads this device's sent photos (400 px thumbnail + full JPEG for "Save to my phone")
//   outbox     rendered photos waiting to be sent (offline)
//
// Images are stored as ArrayBuffers, not Blobs: some WebKit/Safari builds can't put Blobs in IndexedDB.

export interface Draft {
  id: string;
  slug: string;
  blob: Blob;
  seed: number;
  createdAt: number;
}

export interface MyUpload {
  id: string;
  slug: string;
  thumb: Blob;
  full: Blob;
  guestName: string;
  wish: string;
  filter: string;
  status: "sent" | "pending";
  createdAt: number;
}

export interface OutboxItem {
  id: string;
  slug: string;
  photo: Blob;
  guestName: string;
  wish: string;
  filter: string;
  deviceId: string;
  createdAt: number;
}

type Packed = { bytes: ArrayBuffer; type: string };
type Stored<T, K extends keyof T> = Omit<T, K> & { [P in K]: Packed };

async function pack(blob: Blob): Promise<Packed> {
  return { bytes: await blob.arrayBuffer(), type: blob.type || "image/jpeg" };
}
function unpack(p: Packed): Blob {
  return new Blob([p.bytes], { type: p.type });
}

let stores: { drafts: UseStore; uploads: UseStore; outbox: UseStore } | null = null;

function s() {
  stores ??= {
    drafts: createStore("km-drafts", "drafts"),
    uploads: createStore("km-my-uploads", "my-uploads"),
    outbox: createStore("km-outbox", "outbox"),
  };
  return stores;
}

type StoredDraft = Stored<Draft, "blob">;
type StoredUpload = Stored<MyUpload, "thumb" | "full">;
type StoredOutbox = Stored<OutboxItem, "photo">;

const fromUpload = (u: StoredUpload): MyUpload => ({ ...u, thumb: unpack(u.thumb), full: unpack(u.full) });

export const drafts = {
  async get(id: string): Promise<Draft | undefined> {
    const d = await get<StoredDraft>(id, s().drafts);
    return d && { ...d, blob: unpack(d.blob) };
  },
  async put(d: Draft): Promise<void> {
    await set(d.id, { ...d, blob: await pack(d.blob) } satisfies StoredDraft, s().drafts);
  },
  delete: (id: string) => del(id, s().drafts),
};

export const myUploads = {
  async put(u: MyUpload): Promise<void> {
    const stored: StoredUpload = { ...u, thumb: await pack(u.thumb), full: await pack(u.full) };
    await set(u.id, stored, s().uploads);
  },
  async list(slug: string): Promise<MyUpload[]> {
    const all = await entries<string, StoredUpload>(s().uploads);
    return all
      .map(([, v]) => v)
      .filter((u) => u.slug === slug)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(fromUpload);
  },
  async markSent(id: string): Promise<void> {
    const u = await get<StoredUpload>(id, s().uploads);
    if (u) await set(id, { ...u, status: "sent" }, s().uploads);
  },
};

export const outbox = {
  async put(o: OutboxItem): Promise<void> {
    await set(o.id, { ...o, photo: await pack(o.photo) } satisfies StoredOutbox, s().outbox);
  },
  delete: (id: string) => del(id, s().outbox),
  async list(): Promise<OutboxItem[]> {
    const all = await entries<string, StoredOutbox>(s().outbox);
    return all
      .map(([, v]) => ({ ...v, photo: unpack(v.photo) }))
      .sort((a, b) => a.createdAt - b.createdAt);
  },
};
