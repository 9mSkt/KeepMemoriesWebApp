import { containsThai } from "../validation";

export type TextStyle = "script" | "typewriter" | "classic";

export interface Overlays {
  wish: string;
  name: string;
  style: TextStyle;
  /** e.g. "12 12 '26"; null hides the stamp. */
  dateStamp: string | null;
}

// Font CSS variables set by next/font in the root layout (src/app/fonts.ts).
const FONT_VARS = {
  script: { latin: "--font-great-vibes", thai: "--font-charm", weight: "400" },
  typewriter: { latin: "--font-courier-prime", thai: "--font-sarabun", weight: "400" },
  classic: { latin: "--font-cormorant", thai: "--font-noto-serif-thai", weight: "600" },
} as const;

const STAMP_VAR = "--font-courier-prime";

const SIZES: Record<TextStyle, { wish: number; name: number; lineHeight: number }> = {
  script: { wish: 0.072, name: 0.056, lineHeight: 1.12 },
  typewriter: { wish: 0.042, name: 0.038, lineHeight: 1.35 },
  classic: { wish: 0.058, name: 0.044, lineHeight: 1.2 },
};

function cssVar(name: string): string {
  if (typeof document === "undefined") return "serif";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "serif";
}

/** Font family list for `text`: the Thai fallback leads when the string contains Thai. */
export function familyFor(style: TextStyle, text: string): string {
  const v = FONT_VARS[style];
  return containsThai(text) ? `${cssVar(v.thai)}, ${cssVar(v.latin)}` : `${cssVar(v.latin)}, ${cssVar(v.thai)}`;
}

function fontFor(style: TextStyle, text: string, px: number): string {
  return `${FONT_VARS[style].weight} ${px}px ${familyFor(style, text)}`;
}

/** Wait for the fonts the overlays need so canvas text never falls back to a system font. */
export async function ensureFonts(o: Overlays): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const loads: Promise<unknown>[] = [];
  const nameLine = `— ${o.name}`;
  for (const text of [o.wish, nameLine]) {
    if (text.trim()) loads.push(document.fonts.load(fontFor(o.style, text, 40), text));
  }
  if (o.dateStamp) loads.push(document.fonts.load(`700 40px ${cssVar(STAMP_VAR)}`, o.dateStamp));
  await Promise.all(loads).catch(() => {});
}

/** Split into wrap-able tokens. Thai has no spaces between words, so use Intl.Segmenter when available. */
function tokens(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) return Array.from(new Seg("th", { granularity: "word" }).segment(text), (s) => s.segment);
  return containsThai(text) ? Array.from(text) : text.split(/(\s+)/);
}

export function wrapText(
  measure: (s: string) => number,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  let truncated = false;
  for (const tok of tokens(text)) {
    const next = line + tok;
    if (measure(next) <= maxWidth || line.trim() === "") {
      line = next;
      continue;
    }
    lines.push(line.trimEnd());
    line = tok.trimStart();
    if (lines.length === maxLines) {
      truncated = true;
      break;
    }
  }
  if (!truncated && line.trim()) lines.push(line.trimEnd());
  if (truncated) {
    // Ellipsise the last line if text was cut.
    let last = lines[maxLines - 1];
    while (last && measure(`${last}…`) > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

/** Draw wish, name and date stamp onto the photo. All sizes are relative to the width, so preview = final. */
export function drawOverlays(ctx: CanvasRenderingContext2D, w: number, h: number, o: Overlays): void {
  const pad = w * 0.055;
  const size = SIZES[o.style];
  const wishPx = Math.round(w * size.wish);
  const namePx = Math.round(w * size.name);
  const wish = o.wish.trim();
  const name = o.name.trim();
  const nameLine = name ? `— ${name}` : "";

  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  let wishLines: string[] = [];
  if (wish) {
    ctx.font = fontFor(o.style, wish, wishPx);
    wishLines = wrapText((s) => ctx.measureText(s).width, wish, w - pad * 2, 3);
  }

  if (wishLines.length || nameLine) {
    const blockHeight = wishLines.length * wishPx * size.lineHeight + (nameLine ? namePx * 1.5 : 0);
    const shadeTop = Math.max(0, h - blockHeight - pad * 3);
    const shade = ctx.createLinearGradient(0, shadeTop, 0, h);
    shade.addColorStop(0, "rgba(24,18,12,0)");
    shade.addColorStop(0.55, "rgba(24,18,12,0.38)");
    shade.addColorStop(1, "rgba(24,18,12,0.62)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, shadeTop, w, h - shadeTop);

    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = w * 0.006;
    let y = h - pad;
    if (nameLine) {
      ctx.font = fontFor(o.style, nameLine, namePx);
      ctx.fillText(nameLine, pad, y, w - pad * 2);
      y -= namePx * 1.5;
    }
    if (wishLines.length) {
      ctx.font = fontFor(o.style, wish, wishPx);
      for (let i = wishLines.length - 1; i >= 0; i--) {
        ctx.fillText(wishLines[i], pad, y, w - pad * 2);
        y -= wishPx * size.lineHeight;
      }
    }
  }

  if (o.dateStamp) {
    // 1990s point-and-shoot stamp: orange LED digits with a soft glow.
    const px = Math.round(w * 0.05);
    ctx.font = `700 ${px}px ${cssVar(STAMP_VAR)}`;
    ctx.textAlign = "right";
    ctx.fillStyle = "#FF8C33";
    const x = w - pad * 0.9;
    const y = pad * 0.85 + px * 0.8;
    ctx.shadowColor = "rgba(255,120,30,0.9)";
    ctx.shadowBlur = w * 0.014;
    ctx.globalAlpha = 0.55;
    ctx.fillText(o.dateStamp, x, y);
    ctx.shadowBlur = w * 0.004;
    ctx.globalAlpha = 0.95;
    ctx.fillText(o.dateStamp, x, y);
  }
  ctx.restore();
}
