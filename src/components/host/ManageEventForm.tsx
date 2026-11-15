"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button, ICON_STROKE, Input } from "@/components/ui";

/** Pull the event code out of a guest link (/e/<slug>), a host link (/host/<slug>) or a bare code. */
export function parseEventSlug(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const match = text.match(/\/(?:e|host)\/([A-Za-z0-9-]+)/);
  const slug = (match ? match[1] : text.replace(/^\/+|\/+$/g, "")).toLowerCase();
  return /^[a-z0-9-]{10,80}$/.test(slug) ? slug : null;
}

/** "I already have an event": paste the guest link or event code → host setup (asks for the PIN). */
export function ManageEventForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const slug = parseEventSlug(value);
    if (!slug) {
      setError("Paste your guest link (…/e/your-code) or the event code.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/e/${slug}`);
      if (res.status === 404) {
        setError("We couldn't find an event with that link or code.");
        setBusy(false);
        return;
      }
    } catch {
      // Network hiccup: let the host page handle it.
    }
    router.push(`/host/${slug}`);
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        I already have an event
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3 text-left" noValidate>
      <Input
        label="Your guest link or event code"
        placeholder="…/e/ploy-krit-7fq2k9"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        hint="It's in the link your guests use, or on your QR card. You'll be asked for your host PIN."
        error={error}
      />
      <Button
        type="submit"
        variant="secondary"
        disabled={busy}
        trailingIcon={busy ? <Loader2 className="animate-spin" /> : <ArrowRight strokeWidth={ICON_STROKE} />}
      >
        Open host setup
      </Button>
    </form>
  );
}
