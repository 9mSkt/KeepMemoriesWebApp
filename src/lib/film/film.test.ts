import { describe, expect, it } from "vitest";
import { FILM_PRESETS, getPreset } from "./presets";
import { processPixels } from "./process";

function samplePixels(w: number, h: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = (i * 37) % 256;
    data[i * 4 + 1] = (i * 91) % 256;
    data[i * 4 + 2] = (i * 13 + 60) % 256;
    data[i * 4 + 3] = 255;
  }
  return data;
}

const W = 48;
const H = 64;

describe("film presets", () => {
  it.each(FILM_PRESETS.map((p) => [p.id]))("%s is deterministic for a fixed seed", (id) => {
    const a = samplePixels(W, H);
    const b = samplePixels(W, H);
    processPixels(a, W, H, getPreset(id), 0.8, { seed: 42 });
    processPixels(b, W, H, getPreset(id), 0.8, { seed: 42 });
    expect(a).toEqual(b);
  });

  it.each(FILM_PRESETS.map((p) => [p.id]))("%s with strength 0 returns the original pixels", (id) => {
    const original = samplePixels(W, H);
    const data = samplePixels(W, H);
    processPixels(data, W, H, getPreset(id), 0, { seed: 7 });
    expect(data).toEqual(original);
  });

  it("every preset except Original changes the image at full strength", () => {
    for (const p of FILM_PRESETS.filter((x) => x.id !== "original")) {
      const data = samplePixels(W, H);
      processPixels(data, W, H, p, 1, { seed: 1 });
      expect(data, p.id).not.toEqual(samplePixels(W, H));
    }
  });

  it("grain depends on the seed", () => {
    const a = samplePixels(W, H);
    const b = samplePixels(W, H);
    processPixels(a, W, H, getPreset("classic-bw"), 1, { seed: 1 });
    processPixels(b, W, H, getPreset("classic-bw"), 1, { seed: 2 });
    expect(a).not.toEqual(b);
  });

  it("Classic B&W produces grey pixels", () => {
    const data = samplePixels(W, H);
    processPixels(data, W, H, getPreset("classic-bw"), 1, { seed: 3 });
    for (let i = 0; i < data.length; i += 4) {
      expect(data[i]).toBe(data[i + 1]);
      expect(data[i + 1]).toBe(data[i + 2]);
    }
  });

  it("half strength sits between the original and the full film", () => {
    const orig = samplePixels(W, H);
    const full = samplePixels(W, H);
    const half = samplePixels(W, H);
    const p = getPreset("kodak-gold");
    processPixels(full, W, H, p, 1, { seed: 5 });
    processPixels(half, W, H, p, 0.5, { seed: 5 });
    for (let i = 0; i < orig.length; i += 97) {
      const expected = (orig[i] + full[i]) / 2;
      expect(Math.abs(half[i] - expected)).toBeLessThanOrEqual(1);
    }
  });

  it("alpha is never touched", () => {
    const data = samplePixels(W, H);
    processPixels(data, W, H, getPreset("seventies-fade"), 1, { seed: 9 });
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
  });
});
