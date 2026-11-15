import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { sign, verify } from "./crypto";

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days — the couple bookmarks the host page.

const cookieName = (slug: string) => `km_host_${slug}`;

type HostSession = { slug: string };

export function setHostSession(res: NextResponse, slug: string): void {
  res.cookies.set(cookieName(slug), sign<HostSession>({ slug }, SESSION_TTL), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function isHost(slug: string): Promise<boolean> {
  const jar = await cookies();
  const session = verify<HostSession>(jar.get(cookieName(slug))?.value);
  return session?.slug === slug;
}
