# Decisions

Choices made where CLAUDE.md was ambiguous or in tension with itself. Newest last.

## 2026-11-15 — Milestone 1

### Text-safe `muted-text` token (#6F665E)
`muted` (#8B8178) reaches only ~3.5:1 on `ivory` and ~3.2:1 on `cream`, which fails WCAG AA (4.5:1) for the
small text it's specified for (labels at 13 px, overlines at 11 px). §15 requires all text to meet AA, so a
darker `muted-text` (#6F665E, ≈5.2:1 on ivory, ≈4.8:1 on cream, ≈5.6:1 on white) is used for all readable
secondary text. `muted` stays for non-text use (icons, decorative strokes).
Placeholder text still uses `muted` — placeholders aren't the field's label, and the label is always shown.

### Error colour
The palette has no error colour. Errors use a muted brick red `#9C4332` for text (≈6.6:1 on white) and
`#B4533F` for borders, which fit the warm palette better than a pure red.

### `upload_closes_at` default
Postgres column defaults can't reference other columns, so "wedding_date + 3 days" is applied by the app when
it creates an event (milestone 2) rather than in the migration.

### Fonts
All fonts load through `next/font/google`. DM Sans, Great Vibes and Cormorant Garamond are preloaded; Courier
Prime and the Thai fonts (Noto Sans Thai, Charm, Sarabun, Noto Serif Thai) are not, and only download when
their glyphs are used. Each Tailwind font family lists the Latin font first and the Thai fallback second
(`font-script` = Great Vibes → Charm, etc.), so mixed Thai/Latin text in the DOM picks the right font per
glyph. Canvas overlays will still detect Thai explicitly (milestone 5).

### Component sheet at `/design`
A client page that renders every UI component and token, for checking against Figma. It isn't linked from
the app; remove or gate it before launch if wanted.

### pnpm via npx
Node 26 doesn't ship Corepack, so on this machine pnpm runs as `npx pnpm@10 …`. `package.json` pins
`packageManager: pnpm@10.34.9`.

## 2026-11-15 — Milestones 2–8

### Local dev mode (no accounts needed)
Outside production, a missing Supabase config switches to a JSON-file store (`.data/db.json`), and missing
Google credentials switch to a fake Google Photos that writes JPEGs plus descriptions to `.data/uploads/`. This
makes the whole flow runnable and e2e-testable without credentials. Production throws instead of falling back.
Fake albums are marked by an id starting with `dev-album-`, so connecting a real Google account later replaces them.

### Host session and PIN
The host session is an httpOnly, HMAC-signed cookie per event (`km_host_<slug>`, 30 days). PINs are hashed with
bcryptjs (pure JS, so it works on Vercel without native builds). Login attempts are rate-limited in memory
(10 per 15 min per IP + event). That's per serverless instance, which is enough to slow guessing at this scale.

### OAuth state
State = signed `{slug, nonce}` (10 min). The nonce is also set as an httpOnly cookie scoped to the callback path,
and the callback requires the host session too. `prompt=consent` makes Google return a refresh token on every
connect. Reconnecting with the same Google account keeps the album; a different account gets a new album, since
an app can only add to albums it created in that account.

### "Reconnect needed" detection
The host page tries to get an access token on load (cached in memory until it's near expiry). `invalid_grant`
shows the reconnect state. No extra DB column is needed.

### Upload window and readiness
Uploads are open only when Google Photos is connected *and* now is inside the window. Without a connection,
guests see "The couple is still setting up their album". `upload_opens_at` empty means open immediately.

### Film preview = final render
The filter screen stacks the original under the full-strength film and sets CSS `opacity = strength`. That's
mathematically the same blend `processPixels` does, so the slider is instant. The text screen and the final
upload both use `filmPass` → `finishPhoto` (overlays, then frame). All sizes are relative to the image width, so
the preview (960 px) matches the upload (≤ 2560 px). Grain cells scale with width for the same reason. Each photo
keeps its own random seed, so grain doesn't change between preview and upload.

### Polaroid frame
The frame is drawn after the strength blend and only when strength > 0, so `strength = 0` returns exactly the
original pixels, as the spec's test requires. Overlays sit on the photo area, not the white border.

### IndexedDB stores raw bytes, not Blobs
Some WebKit/Safari builds fail to store Blobs in IndexedDB (found by the iPhone e2e run). Images are stored as
ArrayBuffer + MIME type and turned back into Blobs on read.

### "My photos today" keeps the full JPEG too
Besides the 400 px thumbnail, the full uploaded JPEG is kept on the phone so **Save to my phone** saves the
real photo, not the thumbnail.

### Offline / retry
3 attempts with exponential backoff (1 s, 2 s) for network errors, 429 and 5xx. If the phone is offline (or still
can't reach the server), the rendered JPEG goes into an IndexedDB outbox. The outbox is flushed on `online`,
on every guest screen load, and every 30 s; the saved screen shows such photos as "Waiting to send". Other 4xx
errors (e.g. uploads closed) aren't retried and show the server's message.

### Multiple photos
Picking several photos queues them. On the text screen, **Use these settings for all N photos** (default on)
sends them all with the same film and words. When it's off, each photo is sent and the next one opens on the
film screen.

### Camera flash
The flash button controls the torch and only appears where the browser supports it (most Android Chrome).
iOS Safari has no web torch API, so the button is hidden there rather than shown as broken.

### Selfies
The front-camera preview is mirrored (like the system camera); the saved photo isn't, so text in the scene
reads correctly.

### i18n
A small dictionary (`src/lib/i18n/en.json`, `th.json`) instead of next-intl. The guest screens are fully
bilingual; the host screens are English for v1. The choice is stored in localStorage (per spec) and mirrored to a
cookie so the server renders the right language first.

### Covers
Cover photos are resized in the browser to a 1200 px long edge (JPEG) and stored in a public Supabase Storage
bucket `covers` (migration 0002). In dev mode they're stored inline as data URLs.

### Slugs
`<names>-<6 random chars>` using an alphabet without lookalikes. Names with fewer than 3 Latin characters
(e.g. Thai-only names) become `wedding-<random>`. The minimum is 10 characters, per §5.

## Follow-ups

- **Back buttons:** the camera screen has a back button to the welcome screen, and *Memory saved* has one to the
  camera. A back to the edit screens after sending would land on an empty queue.
- **Copy guest link:** `navigator.clipboard` is missing on plain HTTP (e.g. the host page opened at
  `http://192.168.x.x:3000`), so the copy button falls back to `document.execCommand("copy")`. If both fail it
  says so, and the link sits in a read-only field that selects itself when tapped.
- **e2e build folder:** Playwright's dev server builds into `.next-e2e` (`NEXT_DIST_DIR`), so it can run while
  `pnpm dev` is using `.next`. Two dev servers sharing `.next` corrupt it.
