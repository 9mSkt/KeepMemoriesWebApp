import type { FilmPreset } from "./presets";

// Pure per-pixel film pipeline on RGBA bytes — no DOM, so it runs in tests, the main thread and a Worker.
// Order (CLAUDE.md §8): exposure → contrast (S-curve) → saturation → tone curves → fade → vignette → grain
// → light leak. Then blend with the original by `strength`.

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function sCurve(v: number, c: number): number {
  if (c === 1) return v;
  return v < 0.5 ? 0.5 * Math.pow(2 * v, c) : 1 - 0.5 * Math.pow(2 * (1 - v), c);
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** Deterministic hash noise in [-1, 1] for an integer cell + seed. */
function noise(x: number, y: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/** 0..255 → 0..1 after exposure + contrast (same for every channel). */
function toneLut(p: FilmPreset): Float32Array {
  const lut = new Float32Array(256);
  const gain = Math.pow(2, p.exposure);
  for (let i = 0; i < 256; i++) lut[i] = sCurve(clamp01((i / 255) * gain), p.contrast);
  return lut;
}

/** Per-channel tone curve (shadow/highlight tint) + fade, indexed by 0..1023. */
function curveLuts(p: FilmPreset): Float32Array[] {
  return [0, 1, 2].map((c) => {
    const lut = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const v = i / 1023;
      const tinted = clamp01(v + p.shadowTint[c] * (1 - v) * (1 - v) + p.highlightTint[c] * v * v);
      lut[i] = p.fade + tinted * (1 - p.fade);
    }
    return lut;
  });
}

export interface ProcessOptions {
  seed: number;
}

/**
 * Apply `preset` to `data` (RGBA, width × height) in place, blended with the original by `strength` (0..1).
 * `strength = 0` leaves the pixels untouched.
 */
export function processPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  preset: FilmPreset,
  strength: number,
  { seed }: ProcessOptions,
): void {
  const s = clamp01(strength);
  if (s === 0 || preset.id === "original") return;

  const tone = toneLut(preset);
  const [lr, lg, lb] = curveLuts(preset);
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.hypot(cx, cy);
  // Grain cells scale with resolution so the preview and the full-size render look alike.
  const cell = Math.max(1, Math.round(width / 1280));
  const leak = preset.lightLeak;
  const leakX = leak ? leak.x * width : 0;
  const leakY = leak ? leak.y * width : 0;
  const leakR = leak ? leak.radius * width : 1;

  for (let y = 0; y < height; y++) {
    const gy = (y / cell) | 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const or = data[i];
      const og = data[i + 1];
      const ob = data[i + 2];

      // exposure + contrast
      let r = tone[or];
      let g = tone[og];
      let b = tone[ob];

      // saturation / mono
      if (preset.mono) {
        r = g = b = 0.3 * r + 0.59 * g + 0.11 * b;
      } else if (preset.saturation !== 1) {
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = clamp01(l + (r - l) * preset.saturation);
        g = clamp01(l + (g - l) * preset.saturation);
        b = clamp01(l + (b - l) * preset.saturation);
      }

      // tone curves + fade
      r = lr[(r * 1023 + 0.5) | 0];
      g = lg[(g * 1023 + 0.5) | 0];
      b = lb[(b * 1023 + 0.5) | 0];

      // vignette
      if (preset.vignette > 0) {
        const d = Math.hypot(x - cx, y - cy) / maxDist;
        const v = 1 - preset.vignette * smoothstep(0.45, 1.05, d);
        r *= v;
        g *= v;
        b *= v;
      }

      // grain, strongest in the mid-tones
      if (preset.grain > 0) {
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const n = noise((x / cell) | 0, gy, seed) * preset.grain * (0.35 + 2.6 * l * (1 - l));
        r += n;
        g += n;
        b += n;
      }

      // light leak (screen blend)
      if (leak) {
        const a = leak.opacity * (1 - smoothstep(0, leakR, Math.hypot(x - leakX, y - leakY)));
        if (a > 0) {
          r = 1 - (1 - clamp01(r)) * (1 - leak.color[0] * a);
          g = 1 - (1 - clamp01(g)) * (1 - leak.color[1] * a);
          b = 1 - (1 - clamp01(b)) * (1 - leak.color[2] * a);
        }
      }

      // blend with the original by strength
      data[i] = or + (clamp01(r) * 255 - or) * s;
      data[i + 1] = og + (clamp01(g) * 255 - og) * s;
      data[i + 2] = ob + (clamp01(b) * 255 - ob) * s;
    }
  }
}
