"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { PublicEvent } from "@/lib/db/events";
import { flushOutbox } from "@/lib/client/upload";

const EventContext = createContext<PublicEvent | null>(null);

export function EventProvider({ event, children }: { event: PublicEvent; children: ReactNode }) {
  // Send any photos queued while offline: now, when the connection returns, and every 30 s.
  useEffect(() => {
    const flush = () => void flushOutbox().catch(() => {});
    flush();
    window.addEventListener("online", flush);
    const timer = setInterval(flush, 30_000);
    return () => {
      window.removeEventListener("online", flush);
      clearInterval(timer);
    };
  }, []);

  return <EventContext.Provider value={event}>{children}</EventContext.Provider>;
}

export function useEvent(): PublicEvent {
  const e = useContext(EventContext);
  if (!e) throw new Error("useEvent must be used inside <EventProvider>");
  return e;
}
