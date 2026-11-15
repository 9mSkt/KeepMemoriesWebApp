import { NextResponse } from "next/server";
import { getEvent, toPublicEvent } from "@/lib/db/events";
import { jsonError } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return jsonError(404, "not_found", "Event not found.");
  return NextResponse.json(toPublicEvent(event), { headers: { "Cache-Control": "no-store" } });
}
