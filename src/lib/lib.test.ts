import { describe, expect, it } from "vitest";
import { defaultUploadClosesAt, formatDateStamp, formatDotDate } from "./dates";
import { wrapText } from "./image/overlay";
import { translate } from "./i18n";
import en from "./i18n/en.json";
import th from "./i18n/th.json";
import { makeSlug } from "./slug";
import { containsThai, isValidIsoDate, isValidPin, isValidSharedAlbumUrl } from "./validation";

describe("dates", () => {
  it("formats the point-and-shoot stamp", () => {
    expect(formatDateStamp("2026-12-12")).toBe("12 12 '26");
    expect(formatDateStamp("2027-01-05")).toBe("05 01 '27");
  });
  it("formats the table-card date", () => {
    expect(formatDotDate("2026-12-12")).toBe("12 · 12 · 2026");
  });
  it("closes uploads 3 days after the wedding", () => {
    expect(defaultUploadClosesAt("2026-12-30")).toBe("2027-01-02T00:00:00.000Z");
  });
});

describe("validation", () => {
  it("accepts only Google Photos share links", () => {
    expect(isValidSharedAlbumUrl("https://photos.app.goo.gl/abc123")).toBe(true);
    expect(isValidSharedAlbumUrl("https://photos.google.com/share/AF1Qip")).toBe(true);
    expect(isValidSharedAlbumUrl("https://photos.app.goo.gl/")).toBe(false);
    expect(isValidSharedAlbumUrl("http://photos.app.goo.gl/abc")).toBe(false);
    expect(isValidSharedAlbumUrl("https://evil.example/https://photos.app.goo.gl/x")).toBe(false);
  });
  it("checks PINs", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("12345678")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("123456789")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
  });
  it("checks dates", () => {
    expect(isValidIsoDate("2026-12-12")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("12/12/2026")).toBe(false);
  });
  it("detects Thai", () => {
    expect(containsThai("ขอให้รักกัน")).toBe(true);
    expect(containsThai("Love you")).toBe(false);
    expect(containsThai("Love ทุกวัน")).toBe(true);
  });
});

describe("slug", () => {
  it("is readable, random and at least 10 characters", () => {
    expect(makeSlug("Ploy & Krit", () => 0)).toBe("ploy-krit-aaaaaa");
    expect(makeSlug("พลอย และ กฤต", () => 0)).toBe("wedding-aaaaaa");
    expect(makeSlug("A & B", () => 0)).toBe("a-b-aaaaaa");
    expect(makeSlug("Ab", () => 0)).toBe("wedding-aaaaaa");
    expect(makeSlug("José & Zoë").startsWith("jose-zoe-")).toBe(true);
    for (const n of ["Ab", "Ploy & Krit", "x".repeat(100)]) expect(makeSlug(n).length).toBeGreaterThanOrEqual(10);
  });
});

describe("i18n", () => {
  it("has a Thai string for every English key", () => {
    expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort());
  });
  it("fills in variables", () => {
    expect(translate("en", "saved.body", { names: "Ploy & Krit" })).toBe(
      "Your photo is now in Ploy & Krit's Google Photos wedding album.",
    );
  });
});

describe("wrapText", () => {
  const measure = (s: string) => s.length; // 1 unit per character

  it("wraps on word boundaries", () => {
    expect(wrapText(measure, "love you both forever", 10, 3)).toEqual(["love you", "both", "forever"]);
  });
  it("ellipsises text that doesn't fit", () => {
    const lines = wrapText(measure, "one two three four five six seven", 9, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
  });
  it("does not ellipsise text that fits exactly", () => {
    expect(wrapText(measure, "aaa bbb", 3, 2)).toEqual(["aaa", "bbb"]);
  });
  it("wraps Thai (no spaces) by word segments", () => {
    const lines = wrapText(measure, "ขอให้รักกันตลอดไป", 8, 3);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe("ขอให้รักกันตลอดไป");
  });
});
