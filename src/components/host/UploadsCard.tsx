"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { HostEvent } from "@/lib/db/events";
import { isoToLocalInput, localInputToIso, patchEvent } from "./api";

export type RecentUpload = { id: string; guestName: string; createdAt: string; status: "ok" | "failed" };

const STATUS_LABEL: Record<HostEvent["status"], string> = {
  open: "Open now",
  not_ready: "Waiting for Google Photos",
  not_started: "Not open yet",
  closed: "Closed",
};

export function UploadsCard({
  event,
  total,
  failed,
  recent,
}: {
  event: HostEvent;
  total: number;
  failed: number;
  recent: RecentUpload[];
}) {
  const router = useRouter();
  const [opens, setOpens] = useState(isoToLocalInput(event.uploadOpensAt));
  const [closes, setCloses] = useState(isoToLocalInput(event.uploadClosesAt));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData();
    form.set("uploadOpensAt", localInputToIso(opens));
    form.set("uploadClosesAt", localInputToIso(closes));
    const r = await patchEvent(event.slug, form);
    setSaving(false);
    if (r.ok) {
      setErrors({});
      setSaved(true);
      router.refresh();
    } else setErrors(Object.keys(r.fields).length ? r.fields : { uploadClosesAt: r.message });
  }

  const time = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  return (
    <section aria-labelledby="uploads-heading" className="flex flex-col gap-4 rounded-[18px] border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 id="uploads-heading" className="text-[15px] font-semibold text-ink">
          Guest uploads
        </h2>
        <span className="rounded-full bg-sage/15 px-2.5 py-1 text-xs font-semibold text-sage-dark">{STATUS_LABEL[event.status]}</span>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-cream px-3 py-2.5">
          <dt className="text-xs text-muted-text">Photos received</dt>
          <dd className="font-serif text-[28px] font-semibold leading-tight text-ink">{total - failed}</dd>
        </div>
        <div className="rounded-xl bg-cream px-3 py-2.5">
          <dt className="text-xs text-muted-text">Failed attempts</dt>
          <dd className="font-serif text-[28px] font-semibold leading-tight text-ink">{failed}</dd>
        </div>
      </dl>

      <form onSubmit={save} className="flex flex-col gap-3">
        <p className="text-[13px] font-medium text-muted-text">Upload window (your local time)</p>
        <div className="grid grid-cols-1 gap-3">
          <Input
            type="datetime-local"
            label="Opens (leave empty = open now)"
            value={opens}
            onChange={(e) => {
              setOpens(e.target.value);
              setSaved(false);
            }}
            error={errors.uploadOpensAt}
          />
          <Input
            type="datetime-local"
            label="Closes"
            value={closes}
            onChange={(e) => {
              setCloses(e.target.value);
              setSaved(false);
            }}
            error={errors.uploadClosesAt}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" fullWidth={false} disabled={saving} className="py-3">
            {saving ? "Saving…" : "Save window"}
          </Button>
          {saved && (
            <span role="status" className="text-sm font-medium text-sage-dark">
              Saved
            </span>
          )}
        </div>
      </form>

      <div>
        <h3 className="mb-2 text-[13px] font-medium text-muted-text">Latest uploads</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-text">No photos yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink">{u.guestName}</span>
                <span className="shrink-0 tabular-nums text-muted-text">{time(u.createdAt)}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    u.status === "ok" ? "bg-sage/15 text-sage-dark" : "bg-[#b4533f]/12 text-[#9c4332]"
                  }`}
                >
                  {u.status === "ok" ? "Saved" : "Failed"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
