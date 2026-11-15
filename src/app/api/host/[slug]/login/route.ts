import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getEvent } from "@/lib/db/events";
import { clientIp, jsonError, rateLimited } from "@/lib/http";
import { setHostSession } from "@/lib/session";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (rateLimited(`login:${slug}:${await clientIp()}`, 10, 15 * 60 * 1000)) {
    return jsonError(429, "rate_limited", "Too many attempts. Wait 15 minutes and try again.");
  }

  const event = await getEvent(slug);
  if (!event) return jsonError(404, "not_found", "Event not found.");

  const body = (await req.json().catch(() => ({}))) as { pin?: unknown };
  const pin = typeof body.pin === "string" ? body.pin : "";
  if (!pin || !(await bcrypt.compare(pin, event.hostPinHash))) {
    return jsonError(401, "wrong_pin", "That PIN isn't right.");
  }

  const res = NextResponse.json({ ok: true });
  setHostSession(res, slug);
  return res;
}
