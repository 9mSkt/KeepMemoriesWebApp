# Keep Memories

Wedding guests scan a QR code, take a photo with a vintage film look, add their name and a wish, and it lands
in the couple's Google Photos album. Guests need no app and no account.

- **Guests:** `/e/<slug>` → camera → choose a film → add words → *Memory saved!*
- **Couple:** `/host/new` → connect Google Photos → paste the album's share link → print the QR table cards

The full product and technical spec is in [`CLAUDE.md`](CLAUDE.md). Choices made where the spec was ambiguous are
logged in [`docs/decisions.md`](docs/decisions.md).

---

## Run it locally (no accounts needed)

Requires Node 20+ and pnpm. If `pnpm` isn't installed, use `npx pnpm@10` in place of `pnpm` below (or run
`npm i -g pnpm` once).

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

With no `.env.local`, the app runs in **local dev mode**:

| Service | Stand-in |
|---|---|
| Supabase | JSON file at `.data/db.json` |
| Google Photos | "Connect" succeeds instantly; photos are saved to `.data/uploads/<slug>/` (JPEG + a `.txt` with the description) |

Try it: open `/host/new`, create an event, click **Connect Google Photos**, then open the guest link shown under
**Share with guests**.

**Testing the camera on a phone:** browsers only allow the camera on HTTPS (or `localhost`). Use
`pnpm dev --experimental-https` and open `https://<your-PC's-IP>:3000` on the phone (accept the certificate
warning), or use a tunnel such as `cloudflared tunnel --url http://localhost:3000`. Without HTTPS the camera
screen falls back to the phone's own camera/gallery picker, which works fine.

### Checks

```bash
pnpm lint && pnpm typecheck
pnpm test           # unit tests (Vitest)
pnpm test:e2e       # end-to-end (Playwright, iPhone 14 + Pixel 7 viewports, dev mode)
```

First time only, install the e2e browsers: `npx playwright install chromium webkit`.
The e2e run starts its own `next dev` on port 3100 (`E2E_PORT` to change). It uses local dev mode, so run it
without Supabase/Google keys in `.env.local`.

---

## Set up the real services

Copy `.env.example` to `.env.local` and fill it in as you go.

### 1. Secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # SESSION_SECRET
```

`ENCRYPTION_KEY` encrypts the couple's Google refresh token (AES-256-GCM). Don't change it after the couple
has connected, or they'll need to reconnect.

### 2. Supabase (database)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run `supabase/migrations/0001_init.sql`, then `0002_cover_storage.sql`
   (or `supabase db push` with the Supabase CLI).
3. **Project Settings → API**: copy the **Project URL** → `SUPABASE_URL` and the **service_role** key →
   `SUPABASE_SERVICE_ROLE_KEY`. The service key is only ever used on the server; RLS is on with no public
   policies, so nothing is readable with the anon key.

### 3. Google Cloud (Google Photos)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs & Services → Library** → enable **Photos Library API**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - User type **External**; app name "Keep Memories"; your email as support and developer contact.
   - **Data access / Scopes:** add `openid`, `.../auth/userinfo.email` and
     `https://www.googleapis.com/auth/photoslibrary.appendonly`.
   - **Publishing status — important.** While the app is in **Testing**, Google expires refresh tokens after
     **7 days**, and uploads would stop. Either:
     - **(Recommended) click "Publish app" → In production.** You don't need Google's verification for a
       single couple. When connecting, they'll see "Google hasn't verified this app" → **Advanced → Go to
       Keep Memories (unsafe)** → continue. Or:
     - stay in Testing, add the couple's Google account under **Test users**, and have them connect **no more than
       7 days before the wedding** (and leave the upload window short).
     If access ever expires, Host Setup shows **Reconnect needed**. Reconnecting with the same Google account
     keeps the existing album.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** → *Web application*:
   - Authorised redirect URI: `https://<your-app>.vercel.app/api/google/callback`
     (add `http://localhost:3000/api/google/callback` too for local testing).
   - Copy the client ID/secret → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
5. `GOOGLE_REDIRECT_URI` = the same callback URL. Leave it empty to derive it from `APP_URL`.

> **Why the couple pastes a share link:** since March 2025 the Google Photos API only lets an app add to albums
> it created and can't share albums. So the app creates the album with the couple's sign-in, and the couple
> shares it themselves in Google Photos (**Album → Share → Copy link**) and pastes that link into Host Setup.
> Guests only *view* the album through that link; uploads always go through the server.

### 4. Deploy to Vercel

1. Push the repo to GitHub and import it at [vercel.com/new](https://vercel.com/new) (framework: Next.js; the
   build command `pnpm build` is detected automatically).
2. **Settings → Environment Variables:** add everything from `.env.example`. Set `APP_URL` to the
   production URL, e.g. `https://keep-memories.vercel.app`.
3. Deploy, then make sure the Google OAuth redirect URI matches the deployed URL exactly.

Production refuses to start in dev mode: missing Supabase, Google or secret variables cause errors instead of
silently using the local stand-ins.

Vercel's free plan limits request bodies to ~4.5 MB. Photos are resized to ≤ 2560 px and encoded below 3.5 MB
in the browser, and the server rejects anything over 4 MB.

---

## Couple's checklist (≈ 5 minutes)

1. Open `/host/new`, enter your names, date and a PIN. **Bookmark the host page.**
2. **Connect Google Photos** → sign in → the album "*Names* · Wedding" is created.
3. In the Google Photos app: open that album → **Share** → **Copy link** → paste into step 3 → **Save link**.
4. **Print card** (A6, or 4 per A4 sheet) or **Download QR** for your own designs.
5. Optional: adjust the upload window (closes 3 days after the wedding by default).

## Project layout

```
src/app/            pages (guest /e/[slug]/…, host /host/…) and API route handlers (/api/…)
src/components/     ui/ (design-system components), guest/, host/
src/lib/film/       film presets (data) + pixel pipeline + Web Worker
src/lib/image/      decode, text overlays, compose, JPEG encode
src/lib/google/     OAuth, Photos Library API, dev-mode fake
src/lib/db/         Supabase + dev JSON store behind one interface
src/lib/client/     device id, IndexedDB, upload client with retry/outbox
src/stores/         Zustand edit store
supabase/migrations SQL schema
e2e/                Playwright tests
```
