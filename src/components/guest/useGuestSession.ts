"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getGuestName } from "@/lib/client/device";
import { useEditHydrated, useEditStore } from "@/stores/editStore";
import { useEvent } from "./EventContext";

/**
 * Common guard for the capture/edit screens: loads persisted edit state for this event and sends the
 * guest back to the welcome screen if they have no name yet or uploads aren't open.
 */
export function useGuestSession() {
  const event = useEvent();
  const router = useRouter();
  const hydrated = useEditHydrated();
  const forEvent = useEditStore((s) => s.forEvent);
  const [guestName, setGuestName] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    forEvent(event.slug);
    const name = getGuestName();
    if (!name || !event.isOpen) {
      router.replace(`/e/${event.slug}`);
      return;
    }
    setGuestName(name);
  }, [hydrated, event.slug, event.isOpen, forEvent, router]);

  return { event, ready: hydrated && guestName !== null, guestName: guestName ?? "" };
}
