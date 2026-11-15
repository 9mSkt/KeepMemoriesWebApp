"use client";

import { myUploads, type Draft } from "@/lib/client/idb";
import { sendPhoto, type SendOutcome } from "@/lib/client/upload";
import { renderFinal } from "@/lib/image/compose";
import { decodeImage } from "@/lib/image/decode";
import { encodeForUpload, makeThumbnail } from "@/lib/image/encode";
import type { Overlays } from "@/lib/image/overlay";

export interface SendSettings {
  slug: string;
  deviceId: string;
  guestName: string;
  wish: string;
  presetId: string;
  strength: number;
  overlays: Overlays;
}

/** Render one draft at full size exactly like the preview, then upload (or queue it if offline). */
export async function renderAndSend(
  draft: Draft,
  s: SendSettings,
  onPhase: (phase: "render" | "upload", fraction: number) => void,
): Promise<SendOutcome> {
  onPhase("render", 0);
  const source = await decodeImage(draft.blob);
  const canvas = await renderFinal(source, {
    presetId: s.presetId,
    strength: s.strength,
    seed: draft.seed,
    overlays: s.overlays,
  });
  if ("close" in source) source.close();
  const [photo, thumb] = await Promise.all([encodeForUpload(canvas), makeThumbnail(canvas)]);

  onPhase("upload", 0);
  const outcome = await sendPhoto(
    { slug: s.slug, photo, guestName: s.guestName, wish: s.wish, filter: s.presetId, deviceId: s.deviceId },
    draft.id,
    (f) => onPhase("upload", f),
  );

  if (outcome.kind !== "error") {
    await myUploads.put({
      id: draft.id,
      slug: s.slug,
      thumb,
      full: photo,
      guestName: s.guestName,
      wish: s.wish,
      filter: s.presetId,
      status: outcome.kind === "sent" ? "sent" : "pending",
      createdAt: Date.now(),
    });
  }
  return outcome;
}
