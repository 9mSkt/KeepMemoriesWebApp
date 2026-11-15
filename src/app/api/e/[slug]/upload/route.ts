import { NextResponse } from "next/server";
import { getEvent } from "@/lib/db/events";
import { jsonError } from "@/lib/http";
import { handleUpload } from "@/lib/uploadHandler";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return jsonError(404, "not_found", "Event not found.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "invalid", "Upload was incomplete.");
  }

  const result = await handleUpload(event, form);
  if (result.ok) return NextResponse.json({ ok: true });
  return jsonError(result.status, result.error, result.message);
}
