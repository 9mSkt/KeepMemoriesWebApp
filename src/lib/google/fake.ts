import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// Dev-only stand-in for Google Photos (used when GOOGLE_CLIENT_ID is unset outside production):
// "connecting" succeeds immediately and uploads are written to `.data/uploads/<slug>/`.

export const FAKE_EMAIL = "dev-mode@localhost";
export const FAKE_REFRESH_TOKEN = "fake-refresh-token";

export function fakeAlbumId(slug: string): string {
  return `dev-album-${slug}`;
}

export function fakeUpload(slug: string, fileName: string, bytes: Uint8Array, description: string): string {
  const dir = path.join(process.cwd(), ".data", "uploads", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, fileName), bytes);
  writeFileSync(path.join(dir, `${fileName}.txt`), description);
  return `dev-media-${fileName}`;
}
