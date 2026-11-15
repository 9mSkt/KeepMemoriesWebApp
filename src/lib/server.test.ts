// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { decrypt, encrypt, sign, verify } = await import("./crypto");
const { uploadStatus } = await import("./db/events");
const { photoDescription } = await import("./google/photos");
type EventRecord = import("./db/types").EventRecord;

describe("crypto", () => {
  it("round-trips refresh tokens with AES-256-GCM", () => {
    const enc = encrypt("1//refresh-token");
    expect(enc).not.toContain("refresh");
    expect(decrypt(enc)).toBe("1//refresh-token");
    expect(encrypt("same")).not.toBe(encrypt("same")); // random IV
  });

  it("rejects tampered ciphertext", () => {
    const enc = Buffer.from(encrypt("secret"), "base64");
    enc[enc.length - 1] ^= 1;
    expect(() => decrypt(enc.toString("base64"))).toThrow();
  });

  it("signs and verifies tokens", () => {
    const token = sign({ slug: "ploy-krit-abc123" }, 60);
    expect(verify<{ slug: string }>(token)?.slug).toBe("ploy-krit-abc123");
  });

  it("rejects forged, tampered and expired tokens", () => {
    const token = sign({ slug: "a" }, 60);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ slug: "b", exp: 9e9 })).toString("base64url");
    expect(verify(`${forged}.${sig}`)).toBeNull();
    expect(verify(`${body}.${sig.slice(0, -2)}xx`)).toBeNull();
    expect(verify(sign({ slug: "a" }, -1))).toBeNull();
    expect(verify(undefined)).toBeNull();
    expect(verify("garbage")).toBeNull();
  });
});

describe("upload window", () => {
  const base: EventRecord = {
    id: "1",
    slug: "ploy-krit-abc123",
    coupleNames: "Ploy & Krit",
    weddingDate: "2026-12-12",
    venue: null,
    coverImageUrl: null,
    hostPinHash: "x",
    googleEmail: "a@b.c",
    googleRefreshTokenEnc: "enc",
    googleAlbumId: "album",
    googleAlbumTitle: "Ploy & Krit · Wedding",
    sharedAlbumUrl: null,
    uploadOpensAt: null,
    uploadClosesAt: "2026-12-15T00:00:00.000Z",
    createdAt: "2026-11-01T00:00:00.000Z",
  };
  const at = (iso: string) => new Date(iso);

  it("is not ready until Google Photos is connected", () => {
    expect(uploadStatus({ ...base, googleAlbumId: null }, at("2026-12-12T10:00:00Z"))).toBe("not_ready");
  });
  it("respects opens/closes", () => {
    const e = { ...base, uploadOpensAt: "2026-12-12T08:00:00.000Z" };
    expect(uploadStatus(e, at("2026-12-12T07:00:00Z"))).toBe("not_started");
    expect(uploadStatus(e, at("2026-12-12T09:00:00Z"))).toBe("open");
    expect(uploadStatus(e, at("2026-12-16T00:00:00Z"))).toBe("closed");
  });
});

describe("photo description", () => {
  it("joins name and wish", () => {
    expect(photoDescription("Aunt Nok", "Be happy")).toBe("Aunt Nok — Be happy");
    expect(photoDescription("Aunt Nok", null)).toBe("Aunt Nok");
  });
});
