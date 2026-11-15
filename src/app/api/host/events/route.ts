import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { defaultUploadClosesAt } from "@/lib/dates";
import { db } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/http";
import { type FieldErrors, parseEventFields, readCover, storeCover } from "@/lib/host";
import { setHostSession } from "@/lib/session";
import { makeSlug } from "@/lib/slug";
import { isValidPin } from "@/lib/validation";

export async function POST(req: Request) {
  if (rateLimited(`create:${await clientIp()}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many events created. Try again later." }, { status: 429 });
  }

  const form = await req.formData();
  const errors: FieldErrors = {};
  const fields = parseEventFields(form, errors, { requireCore: true });

  const pin = String(form.get("pin") ?? "");
  const pinConfirm = String(form.get("pinConfirm") ?? "");
  if (!isValidPin(pin)) errors.pin = "PIN must be 4–8 digits.";
  else if (pin !== pinConfirm) errors.pinConfirm = "PINs don't match.";

  const cover = await readCover(form, errors);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "invalid", fields: errors }, { status: 400 });
  }

  const hostPinHash = await bcrypt.hash(pin, 10);
  const coupleNames = fields.coupleNames!;
  const weddingDate = fields.weddingDate!;

  // Retry on the (very unlikely) slug collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = makeSlug(coupleNames);
    if (await db().getEventBySlug(slug)) continue;
    const coverImageUrl = cover ? await storeCover(slug, cover) : null;
    const event = await db().createEvent({
      slug,
      coupleNames,
      weddingDate,
      venue: fields.venue ?? null,
      coverImageUrl,
      hostPinHash,
      uploadClosesAt: defaultUploadClosesAt(weddingDate),
    });
    const res = NextResponse.json({ slug: event.slug }, { status: 201 });
    setHostSession(res, event.slug);
    return res;
  }
  return NextResponse.json({ error: "server", message: "Could not create the event. Please try again." }, { status: 500 });
}
