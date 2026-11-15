import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEvent, toHostEvent } from "@/lib/db/events";
import { jsonError } from "@/lib/http";
import { type FieldErrors, parseEventFields, readCover, storeCover } from "@/lib/host";
import { isHost } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await isHost(slug))) return jsonError(401, "unauthorized", "Please enter your host PIN again.");
  const event = await getEvent(slug);
  if (!event) return jsonError(404, "not_found", "Event not found.");

  const form = await req.formData();
  const errors: FieldErrors = {};
  const patch = parseEventFields(form, errors, { requireCore: false });
  const cover = await readCover(form, errors);
  if (form.get("removeCover") === "1") patch.coverImageUrl = null;
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "invalid", fields: errors }, { status: 400 });
  }
  if (cover) patch.coverImageUrl = await storeCover(slug, cover);

  const updated = await db().updateEvent(event.id, patch);
  return NextResponse.json(toHostEvent(updated));
}
