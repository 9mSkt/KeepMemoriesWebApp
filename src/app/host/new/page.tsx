"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CoverField } from "@/components/host/CoverField";
import { resizeCover } from "@/components/host/api";
import { Button, Input } from "@/components/ui";
import { LIMITS, isValidPin } from "@/lib/validation";

export default function NewEventPage() {
  const router = useRouter();
  const [cover, setCover] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const pin = String(form.get("pin"));
    const local: Record<string, string> = {};
    if (!isValidPin(pin)) local.pin = "PIN must be 4–8 digits.";
    else if (pin !== form.get("pinConfirm")) local.pinConfirm = "PINs don't match.";
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    setMessage(null);
    try {
      if (cover) form.set("cover", await resizeCover(cover));
      const res = await fetch("/api/host/events", { method: "POST", body: form });
      const body = (await res.json()) as { slug?: string; fields?: Record<string, string>; message?: string };
      if (res.ok && body.slug) {
        router.push(`/host/${body.slug}?new=1`);
        return;
      }
      setErrors(body.fields ?? {});
      setMessage(body.message && body.message !== "invalid" ? body.message : "Please check the highlighted fields.");
    } catch {
      setMessage("Couldn't create the event. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <main className="pt-safe pb-safe min-h-dvh bg-cream px-5">
      <header className="mb-6 mt-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[3px] text-muted-text">Keep Memories</p>
        <h1 className="mt-2 font-serif text-[32px] font-semibold text-ink">Create your wedding</h1>
        <p className="mt-1 text-[15px] text-muted-text">Takes about a minute. Guests won&apos;t need an app or account.</p>
      </header>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-[18px] border border-line bg-white p-5">
        <Input
          name="coupleNames"
          label="Your names"
          placeholder="Ploy & Krit"
          required
          maxLength={LIMITS.coupleNamesMax}
          error={errors.coupleNames}
        />
        <Input name="weddingDate" type="date" label="Wedding date" required error={errors.weddingDate} />
        <Input name="venue" label="Venue (optional)" maxLength={LIMITS.venueMax} error={errors.venue} />
        <CoverField onChange={(v) => setCover(v instanceof File ? v : null)} />
        {errors.cover && <p className="text-xs text-[#9c4332]">{errors.cover}</p>}

        <div className="mt-2 grid grid-cols-2 gap-3">
          <Input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="\d*"
            maxLength={LIMITS.pinMax}
            label="Host PIN"
            hint="4–8 digits"
            error={errors.pin}
          />
          <Input
            name="pinConfirm"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="\d*"
            maxLength={LIMITS.pinMax}
            label="PIN again"
            error={errors.pinConfirm}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-text">
          You&apos;ll use this PIN to open your host page on another device. Guests never need it.
        </p>

        {message && (
          <p role="alert" className="rounded-xl bg-[#b4533f]/10 px-4 py-3 text-sm text-[#9c4332]">
            {message}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create event"}
        </Button>
      </form>
    </main>
  );
}
