// Wedding dates are stored as plain yyyy-mm-dd strings (no time zone).

function parts(isoDate: string): { y: number; m: number; d: number } {
  const [y, m, d] = isoDate.split("-").map(Number);
  return { y, m, d };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 1990s point-and-shoot stamp: `12 12 '26`. */
export function formatDateStamp(isoDate: string): string {
  const { y, m, d } = parts(isoDate);
  return `${pad(d)} ${pad(m)} '${pad(y % 100)}`;
}

/** Printed card style: `12 · 12 · 2026`. */
export function formatDotDate(isoDate: string): string {
  const { y, m, d } = parts(isoDate);
  return `${pad(d)} · ${pad(m)} · ${y}`;
}

/** Long, localised date, e.g. "Saturday, 12 December 2026" / "วันเสาร์ที่ 12 ธันวาคม 2569". */
export function formatLongDate(isoDate: string, locale: "en" | "th"): string {
  const { y, m, d } = parts(isoDate);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Default upload window close: wedding date + 3 days (midnight UTC). */
export function defaultUploadClosesAt(isoDate: string): string {
  const { y, m, d } = parts(isoDate);
  return new Date(Date.UTC(y, m - 1, d + 3)).toISOString();
}
