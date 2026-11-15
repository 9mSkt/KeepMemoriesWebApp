import {
  Charm,
  Cormorant_Garamond,
  Courier_Prime,
  DM_Sans,
  Great_Vibes,
  Noto_Sans_Thai,
  Noto_Serif_Thai,
  Sarabun,
} from "next/font/google";

// Fonts used on every screen are preloaded. Thai and overlay-only fonts are not:
// their @font-face rules still ship, but the browser only downloads them when a
// glyph in their unicode-range is actually rendered.

export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-great-vibes",
  display: "swap",
});

export const cormorant = Cormorant_Garamond({
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

export const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier-prime",
  display: "swap",
  preload: false,
});

export const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-noto-sans-thai",
  display: "swap",
  preload: false,
});

export const charm = Charm({
  weight: ["400", "700"],
  subsets: ["thai"],
  variable: "--font-charm",
  display: "swap",
  preload: false,
});

export const sarabun = Sarabun({
  weight: ["400", "700"],
  subsets: ["thai"],
  variable: "--font-sarabun",
  display: "swap",
  preload: false,
});

export const notoSerifThai = Noto_Serif_Thai({
  subsets: ["thai"],
  variable: "--font-noto-serif-thai",
  display: "swap",
  preload: false,
});

export const fontVariables = [
  dmSans,
  greatVibes,
  cormorant,
  courierPrime,
  notoSansThai,
  charm,
  sarabun,
  notoSerifThai,
]
  .map((f) => f.variable)
  .join(" ");
