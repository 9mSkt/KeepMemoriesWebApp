import { NextResponse } from "next/server";
import { encrypt, randomToken, sign } from "@/lib/crypto";
import { db } from "@/lib/db";
import { getEvent } from "@/lib/db/events";
import { useFakeGoogle } from "@/lib/env";
import { FAKE_EMAIL, FAKE_REFRESH_TOKEN, fakeAlbumId } from "@/lib/google/fake";
import { buildAuthUrl } from "@/lib/google/oauth";
import { appUrl } from "@/lib/http";
import { isHost } from "@/lib/session";

const OAUTH_NONCE_COOKIE = "km_oauth_nonce";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = await appUrl();
  if (!(await isHost(slug))) return NextResponse.redirect(`${base}/host/${slug}`);
  const event = await getEvent(slug);
  if (!event) return NextResponse.redirect(`${base}/`);

  if (useFakeGoogle) {
    // Local dev without Google credentials: pretend the couple connected and an album was created.
    await db().updateEvent(event.id, {
      googleEmail: FAKE_EMAIL,
      googleRefreshTokenEnc: encrypt(FAKE_REFRESH_TOKEN),
      googleAlbumId: fakeAlbumId(slug),
      googleAlbumTitle: `${event.coupleNames} · Wedding`,
    });
    return NextResponse.redirect(`${base}/host/${slug}?google=connected`);
  }

  const nonce = randomToken();
  const state = sign({ slug, nonce }, 10 * 60);
  const res = NextResponse.redirect(buildAuthUrl(state, base));
  res.cookies.set(OAUTH_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google/callback",
    maxAge: 10 * 60,
  });
  return res;
}
