import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventProvider } from "@/components/guest/EventContext";
import { getEvent, toPublicEvent } from "@/lib/db/events";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  return event
    ? { title: `${event.coupleNames} · Keep Memories`, robots: { index: false, follow: false } }
    : { title: "Keep Memories" };
}

export default async function GuestLayout({ children, params }: Props) {
  const event = await getEvent((await params).slug);
  if (!event) notFound();
  return <EventProvider event={toPublicEvent(event)}>{children}</EventProvider>;
}
