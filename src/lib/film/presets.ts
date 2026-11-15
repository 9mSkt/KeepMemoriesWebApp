// Film looks as data (CLAUDE.md §8). Values are in normalised 0..1 channel units unless noted.
// To add a film: append an entry here — the engine, picker and server validation pick it up.

export type RGB = readonly [number, number, number];

export interface FilmPreset {
  id: string;
  label: string;
  labelTh: string;
  /** Exposure in stops. */
  exposure: number;
  /** S-curve strength; 1 = unchanged, > 1 more contrast, < 1 flatter. */
  contrast: number;
  /** 1 = unchanged, 0 = grey. Ignored when `mono`. */
  saturation: number;
  /** Convert to luminance (0.3R + 0.59G + 0.11B). */
  mono?: boolean;
  /** Added to each channel, weighted towards the shadows / highlights. */
  shadowTint: RGB;
  highlightTint: RGB;
  /** Lifts blacks to this level (0..1). */
  fade: number;
  /** Corner darkening (0..1). */
  vignette: number;
  /** Grain amplitude (0..1). */
  grain: number;
  /** Warm radial glow, screen-blended. Position and radius are fractions of the image width. */
  lightLeak?: { x: number; y: number; radius: number; color: RGB; opacity: number };
  /** Instant-photo border. Sizes are fractions of the image width. */
  frame?: { color: string; side: number; top: number; bottom: number };
}

const NONE: RGB = [0, 0, 0];

export const FILM_PRESETS = [
  {
    id: "original",
    label: "Original",
    labelTh: "ต้นฉบับ",
    exposure: 0,
    contrast: 1,
    saturation: 1,
    shadowTint: NONE,
    highlightTint: NONE,
    fade: 0,
    vignette: 0,
    grain: 0,
  },
  {
    id: "kodak-gold",
    label: "Kodak Gold",
    labelTh: "โกดัก โกลด์",
    exposure: 0.05,
    contrast: 1.12,
    saturation: 1.1,
    shadowTint: [0.06, 0.03, -0.04], // amber shadows
    highlightTint: [0.05, 0.035, -0.05], // +R, +Y highlights
    fade: 0.03,
    vignette: 0.25,
    grain: 0.06,
  },
  {
    id: "fuji-400",
    label: "Fuji 400",
    labelTh: "ฟูจิ 400",
    exposure: 0,
    contrast: 1.08,
    saturation: 1.05,
    shadowTint: [-0.04, 0.03, 0.035], // teal/green shadows
    highlightTint: [-0.01, 0.012, 0.005], // clean, magenta-free highlights
    fade: 0.04,
    vignette: 0.15,
    grain: 0.07,
  },
  {
    id: "classic-bw",
    label: "Classic B&W",
    labelTh: "ขาวดำคลาสสิก",
    exposure: 0,
    contrast: 1.2,
    saturation: 0,
    mono: true,
    shadowTint: NONE,
    highlightTint: NONE,
    fade: 0.02,
    vignette: 0.3,
    grain: 0.1,
  },
  {
    id: "polaroid",
    label: "Polaroid",
    labelTh: "โพลารอยด์",
    exposure: 0.08,
    contrast: 0.96,
    saturation: 0.85,
    shadowTint: [-0.02, 0.015, 0.04], // cyan shadows
    highlightTint: [0.03, -0.01, 0.02], // slight magenta highlights
    fade: 0.12,
    vignette: 0.15,
    grain: 0.04,
    frame: { color: "#FBFAF6", side: 0.05, top: 0.05, bottom: 0.2 },
  },
  {
    id: "seventies-fade",
    label: "70s Fade",
    labelTh: "ยุค 70",
    exposure: 0.05,
    contrast: 0.94,
    saturation: 0.8,
    shadowTint: [0.04, 0, -0.02],
    highlightTint: [0.08, 0.015, 0.035], // orange/pink highlights
    fade: 0.18,
    vignette: 0.2,
    grain: 0.08,
    lightLeak: { x: 0, y: 0, radius: 0.75, color: [1, 0.55, 0.25], opacity: 0.45 },
  },
] as const satisfies readonly FilmPreset[];

export type FilmPresetId = (typeof FILM_PRESETS)[number]["id"];

export const FILM_PRESET_IDS = FILM_PRESETS.map((p) => p.id) as FilmPresetId[];

export const DEFAULT_FILM: FilmPresetId = "kodak-gold";
export const DEFAULT_STRENGTH = 0.7;

export function getPreset(id: string): FilmPreset {
  return FILM_PRESETS.find((p) => p.id === id) ?? FILM_PRESETS[0];
}
