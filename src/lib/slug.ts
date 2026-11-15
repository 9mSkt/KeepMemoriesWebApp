const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/o/1/l lookalikes

export function randomSuffix(length = 6, random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return out;
}

/** "Ploy & Krit" → "ploy-krit-7fq2k9". Names without Latin letters (e.g. Thai) become "wedding-…". */
export function makeSlug(coupleNames: string, random?: () => number): string {
  const base = coupleNames
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  // Slugs must be ≥ 10 chars (§5): a base of ≥ 3 chars + "-" + 6 random chars.
  return `${base.length >= 3 ? base : "wedding"}-${randomSuffix(6, random)}`;
}
