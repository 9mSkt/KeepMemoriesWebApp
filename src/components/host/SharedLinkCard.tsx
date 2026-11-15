"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, FolderOpen, Share2 } from "lucide-react";
import { Button, ICON_STROKE, Input, StepCard } from "@/components/ui";
import type { HostEvent } from "@/lib/db/events";
import { isValidSharedAlbumUrl } from "@/lib/validation";
import { patchEvent } from "./api";

const HINT_STEPS = [
  { icon: FolderOpen, label: "Open the album in Google Photos" },
  { icon: Share2, label: "Tap Share" },
  { icon: Copy, label: "Tap Copy link" },
];

export function SharedLinkCard({ event }: { event: HostEvent }) {
  const router = useRouter();
  const [url, setUrl] = useState(event.sharedAlbumUrl ?? "");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = url.trim();
    if (clean && !isValidSharedAlbumUrl(clean)) {
      setError("Paste a link that starts with https://photos.app.goo.gl/ or https://photos.google.com/share/");
      return;
    }
    setSaving(true);
    const form = new FormData();
    form.set("sharedAlbumUrl", clean);
    const r = await patchEvent(event.slug, form);
    setSaving(false);
    if (r.ok) {
      setSaved(true);
      setError(undefined);
      router.refresh();
    } else setError(r.fields.sharedAlbumUrl ?? r.message);
  }

  return (
    <StepCard step={3} title="Paste the album share link" done={Boolean(event.sharedAlbumUrl)} status={event.sharedAlbumUrl ? "Done" : undefined}>
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted-text">
          Google doesn&apos;t let apps share albums, so share it yourself and paste the link here. Guests use it to see
          everyone&apos;s photos.
          {!event.googleConnected && " Connect Google Photos first so the album exists."}
        </p>
        <ol className="grid grid-cols-3 gap-2" aria-label="How to copy the link">
          {HINT_STEPS.map(({ icon: Icon, label }, i) => (
            <li key={label} className="flex flex-col items-center gap-1.5 rounded-xl bg-cream px-2 py-3 text-center">
              <span className="relative flex size-9 items-center justify-center rounded-full bg-white text-ink">
                <Icon size={18} strokeWidth={ICON_STROKE} />
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">
                  {i + 1}
                </span>
              </span>
              <span className="text-[11px] leading-tight text-ink">{label}</span>
            </li>
          ))}
        </ol>
        <Input
          label="Shared album link"
          type="url"
          inputMode="url"
          placeholder="https://photos.app.goo.gl/…"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSaved(false);
            setError(undefined);
          }}
          hint="In Google Photos: open the album → Share → Copy link."
          error={error}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" fullWidth={false} disabled={saving} className="py-3">
            {saving ? "Saving…" : "Save link"}
          </Button>
          {saved && (
            <span role="status" className="text-sm font-medium text-sage-dark">
              Saved
            </span>
          )}
        </div>
      </form>
    </StepCard>
  );
}
