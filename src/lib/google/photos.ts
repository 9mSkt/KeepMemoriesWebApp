import "server-only";
import { decrypt } from "../crypto";
import type { EventRecord } from "../db/types";
import { GoogleAuthError, refreshAccessToken } from "./oauth";

const API = "https://photoslibrary.googleapis.com/v1";

export class GooglePhotosError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GooglePhotosError";
  }
}

async function check(res: Response, op: string): Promise<void> {
  if (res.ok) return;
  let detail = "";
  try {
    const body = (await res.json()) as { error?: { message?: string; status?: string } };
    detail = body.error?.status ?? body.error?.message ?? "";
  } catch {
    /* non-JSON body */
  }
  throw new GooglePhotosError(`${op} failed (${res.status}${detail ? ` ${detail}` : ""})`, res.status);
}

export async function createAlbum(accessToken: string, title: string): Promise<{ id: string; title: string }> {
  const res = await fetch(`${API}/albums`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ album: { title } }),
  });
  await check(res, "albums.create");
  const album = (await res.json()) as { id: string; title: string };
  return { id: album.id, title: album.title };
}

export async function uploadBytes(accessToken: string, bytes: Uint8Array): Promise<string> {
  const res = await fetch(`${API}/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "X-Goog-Upload-Content-Type": "image/jpeg",
      "X-Goog-Upload-Protocol": "raw",
    },
    body: bytes as BodyInit,
  });
  await check(res, "uploads");
  return (await res.text()).trim();
}

export async function batchCreate(
  accessToken: string,
  albumId: string,
  uploadToken: string,
  fileName: string,
  description: string,
): Promise<string> {
  const res = await fetch(`${API}/mediaItems:batchCreate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      albumId,
      newMediaItems: [{ description: description.slice(0, 1000), simpleMediaItem: { uploadToken, fileName } }],
    }),
  });
  await check(res, "mediaItems.batchCreate");
  const json = (await res.json()) as {
    newMediaItemResults?: { status?: { code?: number; message?: string }; mediaItem?: { id: string } }[];
  };
  const result = json.newMediaItemResults?.[0];
  // status.code is absent or 0 on success; message is "Success" / "OK".
  if (!result?.mediaItem || (result.status?.code && result.status.code !== 0)) {
    throw new GooglePhotosError(`batchCreate item failed: ${result?.status?.message ?? "no result"}`, 500);
  }
  return result.mediaItem.id;
}

// ── Access-token cache (per serverless instance) ─────────────────────────────

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function accessTokenFor(event: EventRecord, forceRefresh = false): Promise<string> {
  if (!event.googleRefreshTokenEnc) throw new GoogleAuthError("Google Photos is not connected");
  const cached = tokenCache.get(event.id);
  if (!forceRefresh && cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const { accessToken, expiresIn } = await refreshAccessToken(decrypt(event.googleRefreshTokenEnc));
  tokenCache.set(event.id, { token: accessToken, expiresAt: Date.now() + expiresIn * 1000 });
  return accessToken;
}

export function cacheAccessToken(eventId: string, token: string, expiresIn: number): void {
  tokenCache.set(eventId, { token, expiresAt: Date.now() + expiresIn * 1000 });
}

/** Run `fn` with a valid access token; on a 401 refresh once and retry. */
export async function withAccessToken<T>(event: EventRecord, fn: (token: string) => Promise<T>): Promise<T> {
  try {
    return await fn(await accessTokenFor(event));
  } catch (err) {
    if (err instanceof GooglePhotosError && err.status === 401) {
      tokenCache.delete(event.id);
      return fn(await accessTokenFor(event, true));
    }
    throw err;
  }
}

/** Host-setup health check: can we still get an access token? */
export async function checkConnection(event: EventRecord): Promise<"ok" | "reconnect" | "unknown"> {
  try {
    await accessTokenFor(event);
    return "ok";
  } catch (err) {
    return err instanceof GoogleAuthError ? "reconnect" : "unknown";
  }
}

export function photoDescription(guestName: string, wish: string | null): string {
  return wish ? `${guestName} — ${wish}` : guestName;
}
