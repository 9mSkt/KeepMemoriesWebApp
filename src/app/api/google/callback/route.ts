import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encrypt, verify } from "@/lib/crypto";
import { db } from "@/lib/db";
import { getEvent } from "@/lib/db/events";
import { exchangeCode, GOOGLE_SCOPES } from "@/lib/google/oauth";
import { cacheAccessToken, createAlbum } from "@/lib/google/photos";
import { appUrl } from "@/lib/http";
import { isHost } from "@/lib/session";

const NONCE_COOKIE = "km_oauth_nonce";

export async function GET(req: Request) {
  const base = await appUrl();
  const url = new URL(req.url);
  const state = verify<{ slug: string; nonce: string }>(url.searchParams.get("state") ?? undefined);
  const jar = await cookies();
  const nonce = jar.get(NONCE_COOKIE)?.value;

  if (!state || !nonce || state.nonce !== nonce) {
    return NextResponse.redirect(`${base}/?error=oauth_state`);
  }
  const { slug } = state;
  const back = (result: string) => {
    const res = NextResponse.redirect(`${base}/host/${slug}?google=${result}`);
    res.cookies.delete({ name: NONCE_COOKIE, path: "/api/google/callback" });
    return res;
  };

  if (!(await isHost(slug))) return back("error");
  if (url.searchParams.get("error")) return back("denied");
  const code = url.searchParams.get("code");
  const event = await getEvent(slug);
  if (!code || !event) return back("error");

  try {
    const tokens = await exchangeCode(code, base);
    const appendScope = GOOGLE_SCOPES[2];
    if (!tokens.scopes.includes(appendScope)) return back("scope");
    if (!tokens.refreshToken) return back("error");

    // Keep the existing album when the same Google account reconnects; otherwise create a new one
    // (an app can only add to albums it created in *that* account).
    let albumId = event.googleAlbumId;
    let albumTitle = event.googleAlbumTitle;
    const sameAccount = event.googleEmail && tokens.email && event.googleEmail === tokens.email;
    if (!albumId || !sameAccount || albumId.startsWith("dev-album-")) {
      const album = await createAlbum(tokens.accessToken, `${event.coupleNames} · Wedding`);
      albumId = album.id;
      albumTitle = album.title;
    }

    await db().updateEvent(event.id, {
      googleEmail: tokens.email,
      googleRefreshTokenEnc: encrypt(tokens.refreshToken),
      googleAlbumId: albumId,
      googleAlbumTitle: albumTitle,
    });
    cacheAccessToken(event.id, tokens.accessToken, tokens.expiresIn);
    return back("connected");
  } catch (err) {
    console.error("Google connect failed:", err instanceof Error ? err.message : "unknown");
    return back("error");
  }
}
