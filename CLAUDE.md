# CLAUDE.md — Keep Memories (Wedding Guest Photo Web App)

This file is the product + technical specification for **Keep Memories**. Read it fully before writing code.
When something here conflicts with your assumptions, this file wins. If something is ambiguous, prefer the
simplest option that satisfies the acceptance criteria and note the decision in `docs/decisions.md`.

---

## 1. Product summary

Guests at a wedding scan a QR code on their table card, open a mobile web page (no app install, no sign-up),
take or pick a photo, apply a **vintage film filter**, add **text (name / wish / date stamp)**, and send it.
The photo lands in a **Google Photos album owned by the couple**. Guests can open the album's shared link to
see everyone's photos.

- Expected scale: ~50 guests, ~25 active uploaders, a few hundred photos. Free tiers are enough.
- Primary device: guests' phones (iOS Safari + Android Chrome). Desktop is secondary (host setup only).
- Languages: English + Thai (toggle on the welcome screen).

### In scope (v1)
1. Guest flow: welcome → camera/gallery → film filter → text overlay → send → saved
2. Film filters (vintage look), applied client-side and baked into the uploaded JPEG
3. Text overlays: guest name, wish, date stamp — baked into the image; also saved as the Google Photos description
4. Host (couple) setup: wedding details, connect Google Photos, paste shared-album link, download QR card
5. "My photos today" — the guest's own uploads, kept locally on their phone
6. Link to the shared Google Photos album for viewing everyone's photos

### Out of scope (v1)
Live slideshow, moderation queue, reactions, photo missions, video, in-app gallery of all guests' photos
(viewing everyone's photos happens in Google Photos via the shared link).

---

## 2. ⚠️ Google Photos API constraints (read before designing anything)

Since **31 March 2025** the Google Photos Library API changed:

- Apps can **only upload to, list and read albums/media that the app itself created**
  (scopes `photoslibrary.appendonly`, `photoslibrary.readonly.appcreateddata`, `photoslibrary.edit.appcreateddata`).
- **All shared-album endpoints are gone** (`albums.share`, `sharedAlbums.join/get/list/leave` → `403 PERMISSION_DENIED`).
- The `photoslibrary`, `photoslibrary.readonly` and `photoslibrary.sharing` scopes were removed.

**Consequences for this app — do not try to work around them:**

1. The app **cannot upload into an album from a pasted link**. Instead the couple signs in with Google once
   (OAuth) and the app **creates its own album** (`POST /v1/albums`) in the couple's library. All guest
   uploads go into that app-created album via the server using the couple's refresh token.
2. The app **cannot share the album through the API**. The couple shares it manually in the Google Photos app
   (Album → Share → Copy link) and **pastes that link into Host Setup**. That pasted link is only used to
   let guests *view* the album — it's never used for uploading.
3. Guests never sign in to Google. Only the couple does.
4. OAuth consent screen: if the Google Cloud project stays in **Testing** mode, refresh tokens **expire after
   7 days**. Either (a) set the app's publishing status to **In production** (unverified is fine for one
   owner; they'll see an "unverified app" warning they can click through), or (b) make sure the couple
   connects ≤ 7 days before the wedding. Document this in the README and show a warning in Host Setup
   if the token fails to refresh ("Reconnect Google Photos").

### Upload sequence (server-side)
```
1. access_token  = refresh(event.google_refresh_token)                 # oauth2.googleapis.com/token
2. POST https://photoslibrary.googleapis.com/v1/uploads
     headers: Authorization: Bearer <token>
              Content-Type: application/octet-stream
              X-Goog-Upload-Content-Type: image/jpeg
              X-Goog-Upload-Protocol: raw
     body:    <jpeg bytes>
   → returns uploadToken (plain text)
3. POST https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate
     { "albumId": event.google_album_id,
       "newMediaItems": [{ "description": "<name> — <wish>",          # ≤ 1000 chars
                           "simpleMediaItem": { "uploadToken": "...", "fileName": "<slug>-<ts>.jpg" } }] }
   → check newMediaItemResults[0].status
```
Scopes requested at connect time: `openid email https://www.googleapis.com/auth/photoslibrary.appendonly`.
Cache the access token in memory/DB until near expiry; refresh on 401.

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Route handlers for the API |
| Styling | **Tailwind CSS v4** | Tokens from §7 as CSS variables |
| Hosting | **Vercel (Hobby/free)** | Serverless request body limit ≈ 4.5 MB → keep JPEGs ≤ 3.5 MB |
| Database | **Supabase Postgres (free)** | Only stores event config + upload log; no photos |
| Photo storage | **Google Photos (couple's account)** | App never stores photos itself |
| Image processing | Client-side **Canvas 2D / WebGL** | Filters + text baked before upload |
| i18n | `next-intl` (or a small dictionary) | `en`, `th` |
| QR | `qrcode` npm package | PNG/SVG for the printable card |
| Tests | Vitest (unit), Playwright (mobile viewport e2e) | |

Package manager: **pnpm**. Node 20+.

---

## 4. Routes

### Pages
| Path | Who | Screen (Figma) |
|---|---|---|
| `/e/[slug]` | Guest | 01 Welcome |
| `/e/[slug]/camera` | Guest | 02 Camera |
| `/e/[slug]/edit/filter` | Guest | 03 Choose a film |
| `/e/[slug]/edit/text` | Guest | 04 Add your words |
| `/e/[slug]/saved` | Guest | 05 Memory saved |
| `/host/new` | Couple | Create event (names, date, host PIN) |
| `/host/[slug]` | Couple (PIN) | 06 Host setup |
| `/host/[slug]/qr` | Couple (PIN) | 07 Printable QR card (print CSS, A6) |

Guest edit state (the current image + choices) lives in a client store (Zustand) + IndexedDB, so a refresh
mid-edit doesn't lose the photo.

### API (route handlers)
| Method & path | Purpose |
|---|---|
| `POST /api/host/events` | Create event → returns `slug`, sets host session cookie |
| `POST /api/host/[slug]/login` | Verify host PIN → host session cookie (httpOnly, signed) |
| `GET  /api/host/[slug]/google/connect` | Start Google OAuth (state = signed slug + nonce) |
| `GET  /api/google/callback` | Exchange code, store encrypted refresh token, **create album** (`title = "<names> · Wedding"`) |
| `PATCH /api/host/[slug]` | Update names/date/cover/shared link/upload window |
| `GET  /api/e/[slug]` | Public event info (names, date, cover URL, shared link, isOpen) — never tokens |
| `POST /api/e/[slug]/upload` | multipart: `photo` (jpeg), `guestName`, `wish?`, `deviceId` → Google upload sequence |

---

## 5. Data model (Supabase)

```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- random, ≥ 10 chars, e.g. "ploy-krit-7fq2k9"
  couple_names text not null,                -- "Ploy & Krit"
  wedding_date date not null,
  venue text,
  cover_image_url text,                      -- optional, stored in Supabase Storage (public bucket)
  host_pin_hash text not null,               -- bcrypt/argon2
  google_email text,
  google_refresh_token_enc text,             -- AES-256-GCM with ENCRYPTION_KEY
  google_album_id text,
  google_album_title text,
  shared_album_url text,                     -- pasted by couple; must start with https://photos.app.goo.gl/ or https://photos.google.com/share/
  upload_opens_at timestamptz,
  upload_closes_at timestamptz,              -- default: wedding_date + 3 days
  created_at timestamptz default now()
);

create table uploads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  device_id text not null,                   -- random UUID kept in guest's localStorage
  guest_name text not null,
  wish text,
  filter text not null,
  google_media_item_id text,
  status text not null check (status in ('ok','failed')),
  error text,
  created_at timestamptz default now()
);
```
Access Supabase **only from the server** with the service-role key. Enable RLS with no public policies.

---

## 6. Guest flow — screen specs

Mobile frame 390 × 844. Safe-area padding (`env(safe-area-inset-*)`). Tap targets ≥ 44 px.

### 01 Welcome (`/e/[slug]`)
- Top-right language pill **EN | ไทย** (persist in localStorage).
- Arch-shaped cover photo (top corners fully rounded, 1 px gold stroke). Placeholder gradient if none.
- "THE WEDDING OF" (DM Sans 11, tracking 3, muted) → couple names (**Great Vibes 54**) → date (Cormorant Garamond Italic 19) → 48 px gold divider.
- Input **Your name** (required, 1–40 chars, prefilled from localStorage).
- Primary button **Start capturing memories** → `/camera`.
- Footnote: "No app or sign-up needed. Your photos go straight to the couple's Google Photos album."
- If uploads are closed: replace button with "Uploads are closed — view the album" (shared link).

### 02 Camera (`/e/[slug]/camera`)
- Dark background (`night`). Top bar: **Album** pill (opens shared album link in new tab; hidden if not set) · couple names (Great Vibes) · flash toggle.
- Viewfinder: live `getUserMedia({ video: { facingMode: 'environment', width: { ideal: 3840 } } })`, 3:4 crop, rounded 24, rule-of-thirds grid, top-left tag "Film: <current>", bottom-right orange date-stamp preview.
- Controls: gallery thumbnail button (left) → `<input type="file" accept="image/*" multiple>`; **shutter** (78 px ring) captures a frame to canvas at full video resolution; flip camera (right).
- Fallback when camera permission is denied/unsupported: show a big "Take a photo" button using `<input type="file" accept="image/*" capture="environment">`.
- Multiple picked photos are queued: each goes through filter+text with the same settings by default ("Apply to all").

### 03 Choose a film (`/e/[slug]/edit/filter`)
- Top bar: back · "Choose a film" (Cormorant SemiBold 24) · "1 / 2".
- Preview inside a white "print" frame (12 px border, soft shadow).
- Horizontal scroll list of filter thumbnails (68 × 68, radius 12, selected = 3 px gold outside stroke + bold label). Thumbnails are real downscaled previews of the guest's photo.
- **Film strength** slider 0–100 % (default 70 %) blends original ↔ filtered.
- Primary button **Next: add your words**.

### 04 Add your words (`/e/[slug]/edit/text`)
- Top bar: back · "Add your words" · "2 / 2".
- Live preview with overlays drawn on the photo:
  - **Wish** bottom-left, over a bottom gradient shade; **name** below as "— Aunt Nok".
  - **Date stamp** top-right, 1990s point-and-shoot style: Courier Prime Bold, orange `#FF8C33`, slight glow/blur, format `DD MM 'YY` (e.g. `12 12 '26`); date = wedding date.
- Inputs: **Your name** (prefilled), **A wish for the couple (optional, ≤ 120 chars)**.
- Text style chips: **Script** (Great Vibes; Thai fallback **Charm**) · **Typewriter** (Courier Prime; Thai fallback **Sarabun**) · **Classic** (Cormorant Garamond; Thai fallback **Noto Serif Thai**). Detect Thai characters and switch to the fallback font for that string.
- **Date** toggle (default on).
- Primary button **Send to the wedding album** (with upload icon) → render final JPEG → upload → `/saved`.
- Show upload progress; on failure keep the photo and show "Try again" (retry with exponential backoff; queue in IndexedDB if offline and retry when back online).

### 05 Memory saved (`/e/[slug]/saved`)
- Tilted (−4°) polaroid of the just-sent photo → sage check badge → "Memory saved!" (Cormorant SemiBold 34) → "Your photo is now in Ploy & Krit's Google Photos wedding album."
- **Your photos today** — thumbnails of this device's uploads (from IndexedDB; keep a 400 px thumbnail per upload) + count. Tapping a thumbnail opens it full screen with a **Save to my phone** button (Web Share API with files → fallback download).
- Primary **Take another photo** → `/camera`; secondary **View the shared album ↗** (shared link, new tab).

---

## 7. Host flow — screen specs

### `/host/new`
Form: couple names, wedding date, venue (optional), cover photo (optional), host PIN (4–8 digits, entered twice).
On submit → create event → redirect to `/host/[slug]` (already logged in). Show the host URL and tell the couple to bookmark it.

### 06 Host setup (`/host/[slug]`) — background `cream`, white step cards
1. **Wedding details** — names, date (editable). Badge "Done" when filled.
2. **Connect Google Photos** — button "Connect Google Photos" → OAuth. Connected state: "Album “<names> · Wedding” was created in your Google Photos. Guest photos upload here." + "Reconnect" link. Show an error state if refresh fails.
3. **Paste the album share link** — input + helper "In Google Photos: open the album → Share → Copy link." Validate the URL prefix. Include a 3-step illustrated hint.
4. **Share with guests** — QR preview (encodes `https://<host>/e/<slug>`) + **Download QR** (PNG 1024 px) + **Print table card** → `/host/[slug]/qr`.
Also show: upload window (opens/closes), total uploads count (from `uploads` table), last 10 uploads (guest name, time, status).

### 07 Printable QR card (`/host/[slug]/qr`)
A6 (105 × 148 mm) print layout, ivory background, inset 1 px gold border: "SHARE YOUR MOMENTS" → names (Great Vibes 52) → date `12 · 12 · 2026` → QR (176 px, white tile) → "Scan to snap photos with a vintage film look" → Thai line "สแกนเพื่อถ่ายภาพความทรงจำร่วมกับเรา". `@media print` with `@page { size: A6; margin: 0 }`. Option to print 4-up on A4.

---

## 8. Film filter engine (`src/lib/film/`)

Implement as a pure function `applyFilm(src: ImageBitmap, preset: FilmPreset, strength: number): HTMLCanvasElement`.
**Do not rely on `CanvasRenderingContext2D.filter`** (Safari support is inconsistent). Use per-pixel ops on
`ImageData` (fine for ≤ 12 MP in a Web Worker with `OffscreenCanvas` where available) or a WebGL fragment shader.

Pipeline per preset (in order): exposure → contrast (S-curve) → saturation → per-channel tone curves
(shadows/highlights tint) → fade (lift blacks) → vignette → grain (seeded noise, luminance-weighted) →
optional light leak (radial warm gradient, screen blend) → optional frame. Then blend with original by `strength`.

| Preset id | Label | Look (starting parameters — tune visually) |
|---|---|---|
| `original` | Original | no-op |
| `kodak-gold` | Kodak Gold | warm (+R, +Y highlights), contrast 1.12, sat 1.1, shadows → amber, grain 0.06, vignette 0.25 |
| `fuji-400` | Fuji 400 | cool greens/teal shadows, magenta-free highlights, contrast 1.08, sat 1.05, grain 0.07 |
| `classic-bw` | Classic B&W | luminance (0.3R+0.59G+0.11B), contrast 1.2, grain 0.10, vignette 0.3 |
| `polaroid` | Polaroid | faded (blacks lifted to 0.12), slight magenta/cyan cast, sat 0.85, soft vignette, white instant-photo frame (thicker bottom) |
| `seventies-fade` | 70s Fade | strong fade, orange/pink highlights, sat 0.8, light leak top-left, grain 0.08 |

Presets live in `src/lib/film/presets.ts` as data so new ones are easy to add. Unit-test that each preset is
deterministic for a fixed seed and that `strength = 0` returns the original pixels.

## 9. Image pipeline & upload (`src/lib/image/`)

1. Decode with `createImageBitmap(file, { imageOrientation: 'from-image' })` (fixes EXIF rotation).
   iPhone HEIC: Safari usually hands over JPEG via the file input; if `image/heic` arrives and decoding fails, show "Please choose a JPEG/PNG photo".
2. Downscale so the long edge ≤ **2560 px**.
3. `applyFilm` → draw text overlays (wait for `document.fonts.load()` of the chosen font first) → `canvas.toBlob('image/jpeg', 0.88)`.
4. If blob > 3.5 MB, re-encode at 0.8, then 0.72.
5. Upload via `XMLHttpRequest`/`fetch` with progress; include `guestName`, `wish`, `filter`, `deviceId`.
6. Server validates: event exists, uploads open, MIME is `image/jpeg`, size ≤ 4 MB, name 1–40 chars, wish ≤ 120 chars, simple rate limit (e.g. 30 uploads / device / 10 min).
7. After success, save a 400 px thumbnail + metadata to IndexedDB (`my-uploads` store) for screen 05.

---

## 10. Design system (from Figma)

Figma file: https://www.figma.com/design/5dM8m4CxR578xzhQmhCtEi
(Screens 01–03 and the component sheet are in Figma; screens 04–07 are specified in text above.)

### Color tokens (`--km-*`)
| Token | Hex | Use |
|---|---|---|
| `ivory` | `#FBF7F0` | Guest screen background |
| `cream` | `#F3EDE2` | Host background, pills |
| `sage` | `#8A9A7B` | Accents, success, slider fill, toggles |
| `sage-dark` | `#5F7052` | Primary button fill, secondary button text |
| `rose` | `#C9A19A` | Soft accent (optional highlights) |
| `gold` | `#B8975A` | Dividers, selected filter stroke, card border |
| `ink` | `#3A3530` | Main text, selected chip |
| `muted` | `#8B8178` | Secondary text |
| `line` | `#E4DACB` | Borders, slider track |
| `white` | `#FFFFFF` | Cards, inputs |
| `night` | `#1E1B18` | Camera screen background |
| `stamp` | `#FF8C33` | Date stamp only |

### Typography (Google Fonts via `next/font`)
| Role | Font | Size/weight |
|---|---|---|
| Couple names | Great Vibes | 28 (top bar) / 52–54 (hero) |
| Headings | Cormorant Garamond | SemiBold 24–34; Italic 18–19 for dates |
| UI / body | DM Sans | Regular 12–16, Medium 13–14, SemiBold 15–16 |
| Overline | DM Sans Medium/SemiBold 11, letter-spacing 2–3 px, uppercase |
| Date stamp | Courier Prime Bold 18–20 |
| Thai | Noto Sans Thai (UI), Charm / Sarabun / Noto Serif Thai (overlays) |

### Components
- **Button** — variants `primary` (sage-dark fill, white text), `secondary` (white fill, 1.5 px sage stroke, sage-dark text), `ghost`. Radius 28 (pill), padding 16 × 28, DM Sans SemiBold 16, optional leading/trailing 16–18 px icon. Full-width on mobile.
- **Input** — label (DM Sans Medium 13, muted) above a field (white, 1 px `line` border, radius 14, padding 14 × 16, 16 px text so iOS doesn't zoom).
- **Chip** — `selected` (ink fill, white text) / `default` (white, `line` border). Radius 20, padding 9 × 16.
- **FilterThumb** — 68 px rounded-12 preview + 12 px label; selected = 3 px gold outside stroke.
- **Toggle** — 44 × 26, sage when on.
- **Step card** (host) — white, radius 18, 1 px `line` border, padding 16, numbered circle (ink) → check (sage) when done, status badge (sage 15 % bg).
- Icons: `lucide-react`, 1.8 px stroke.

### Feel
Elegant, warm, romantic; generous whitespace; soft shadows (`0 8px 24px rgba(58,51,46,.12)`); subtle
transitions (150–250 ms ease-out); respect `prefers-reduced-motion`. Mobile-first; on desktop centre a 430 px column.

---

## 11. Project structure

```
src/
  app/
    e/[slug]/(guest pages)
    host/(new, [slug], [slug]/qr)
    api/(host, google, e)
    layout.tsx, globals.css
  components/ui/        Button, Input, Chip, FilterThumb, Toggle, StepCard
  components/guest/     Viewfinder, FilterPicker, TextOverlayEditor, MyUploads
  components/host/      ConnectGoogleCard, SharedLinkCard, QrCard
  lib/film/             presets.ts, applyFilm.ts, worker.ts
  lib/image/            decode.ts, overlay.ts, encode.ts
  lib/google/           oauth.ts, photos.ts (createAlbum, uploadBytes, batchCreate)
  lib/db/               supabase.ts, events.ts, uploads.ts
  lib/crypto.ts         AES-256-GCM encrypt/decrypt for refresh tokens
  lib/i18n/             en.json, th.json
  stores/               editStore.ts (Zustand)
docs/decisions.md
supabase/migrations/0001_init.sql
```

## 12. Environment variables (`.env.local`, never commit)
```
NEXT_PUBLIC_APP_URL=https://<your-app>.vercel.app
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=${NEXT_PUBLIC_APP_URL}/api/google/callback
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=            # 32 random bytes, base64
SESSION_SECRET=            # for signing host session cookies + OAuth state
```
Commit a `.env.example` with these keys and empty values.

## 13. Commands
```
pnpm install
pnpm dev          # http://localhost:3000  (camera needs HTTPS on phones → use `pnpm dev --experimental-https` or a tunnel)
pnpm lint && pnpm typecheck
pnpm test         # vitest
pnpm test:e2e     # playwright, iPhone 14 + Pixel 7 viewports
```

## 14. Build order (milestones)
1. Scaffold Next.js + Tailwind + tokens + fonts + UI components (match Figma); `.env.example`; Supabase migration.
2. Host: create event, PIN login, Google OAuth connect + album creation, shared-link field, QR download/print.
3. Guest: welcome + name, camera/gallery capture, edit store with IndexedDB persistence.
4. Film engine + filter screen (with tests).
5. Text overlay screen + final render/encode.
6. Upload API (Google upload sequence) + saved screen + My photos today + offline retry queue.
7. i18n (EN/TH), upload window, error states, rate limiting.
8. README with Google Cloud setup steps (enable Photos Library API, OAuth consent screen, publishing status, redirect URI) and Vercel + Supabase deploy steps.

## 15. Acceptance criteria
- A guest on iOS Safari and Android Chrome can go from QR scan to "Memory saved!" in under 30 seconds on 4G.
- The uploaded photo in Google Photos shows the chosen film look and the text overlays exactly as previewed, and its description contains the guest name and wish.
- Guests never see a Google sign-in. Tokens and album IDs never reach the client.
- Refreshing during editing doesn't lose the photo.
- A failed upload can be retried; offline uploads go out automatically when the connection returns.
- The host can complete setup (connect + paste link + print QR) in under 5 minutes.
- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95. All text meets WCAG AA contrast.

## 16. Conventions
- TypeScript strict; no `any` in `lib/`.
- Server-only modules import `'server-only'`.
- Never log tokens, PINs or image bytes.
- Small, focused commits with conventional-commit messages (`feat:`, `fix:`, `chore:` …).
