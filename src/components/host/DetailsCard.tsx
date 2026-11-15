"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, StepCard } from "@/components/ui";
import type { HostEvent } from "@/lib/db/events";
import { LIMITS } from "@/lib/validation";
import { CoverField } from "./CoverField";
import { patchEvent, resizeCover } from "./api";

export function DetailsCard({ event }: { event: HostEvent }) {
  const router = useRouter();
  const [cover, setCover] = useState<File | "remove" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    const form = new FormData(e.currentTarget);
    if (cover instanceof File) form.set("cover", await resizeCover(cover));
    if (cover === "remove") form.set("removeCover", "1");
    const r = await patchEvent(event.slug, form);
    if (r.ok) {
      setErrors({});
      setCover(null);
      setStatus("saved");
      router.refresh();
    } else {
      setErrors(r.fields);
      setMessage(r.message);
      setStatus("error");
    }
  }

  return (
    <StepCard step={1} title="Wedding details" done status="Done">
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Input
          name="coupleNames"
          label="Your names"
          defaultValue={event.coupleNames}
          maxLength={LIMITS.coupleNamesMax}
          error={errors.coupleNames}
        />
        <Input name="weddingDate" type="date" label="Wedding date" defaultValue={event.weddingDate} error={errors.weddingDate} />
        <Input name="venue" label="Venue (optional)" defaultValue={event.venue ?? ""} maxLength={LIMITS.venueMax} error={errors.venue} />
        <CoverField currentUrl={event.coverImageUrl} onChange={setCover} />
        {errors.cover && <p className="text-xs text-[#9c4332]">{errors.cover}</p>}
        {status === "error" && !Object.keys(errors).length && <p className="text-sm text-[#9c4332]">{message}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary" fullWidth={false} disabled={status === "saving"} className="py-3">
            {status === "saving" ? "Saving…" : "Save details"}
          </Button>
          {status === "saved" && (
            <span role="status" className="text-sm font-medium text-sage-dark">
              Saved
            </span>
          )}
        </div>
      </form>
    </StepCard>
  );
}
