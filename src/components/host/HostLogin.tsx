"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { Button, ICON_STROKE, Input } from "@/components/ui";
import { LIMITS } from "@/lib/validation";

export function HostLogin({ slug, coupleNames }: { slug: string; coupleNames: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/host/${slug}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setError(body.message ?? "That PIN isn't right.");
    } catch {
      setError("You seem to be offline. Please try again.");
    }
    setBusy(false);
  }

  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col justify-center bg-cream px-5">
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-[18px] border border-line bg-white p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-cream text-ink">
            <Lock size={20} strokeWidth={ICON_STROKE} />
          </span>
          <p className="font-script text-[36px] leading-tight text-ink">{coupleNames}</p>
          <h1 className="text-[15px] font-semibold text-ink">Host setup</h1>
        </div>
        <Input
          label="Host PIN"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={LIMITS.pinMax}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          error={error}
          autoFocus
        />
        <Button type="submit" disabled={busy || pin.length < LIMITS.pinMin}>
          {busy ? "Checking…" : "Open host setup"}
        </Button>
      </form>
    </main>
  );
}
