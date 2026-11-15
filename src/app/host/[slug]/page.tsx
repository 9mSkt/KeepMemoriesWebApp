import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookmarkCheck } from "lucide-react";
import { ConnectGoogleCard, type Connection } from "@/components/host/ConnectGoogleCard";
import { DetailsCard } from "@/components/host/DetailsCard";
import { HostLogin } from "@/components/host/HostLogin";
import { QrCard } from "@/components/host/QrCard";
import { SharedLinkCard } from "@/components/host/SharedLinkCard";
import { UploadsCard } from "@/components/host/UploadsCard";
import { ICON_STROKE } from "@/components/ui";
import { db } from "@/lib/db";
import { getEvent, toHostEvent } from "@/lib/db/events";
import { checkConnection } from "@/lib/google/photos";
import { appUrl } from "@/lib/http";
import { qrSvg } from "@/lib/qr";
import { isHost } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Host setup · Keep Memories", robots: { index: false, follow: false } };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ google?: string; new?: string }>;
};

export default async function HostSetupPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const record = await getEvent(slug);
  if (!record) notFound();
  if (!(await isHost(slug))) return <HostLogin slug={slug} coupleNames={record.coupleNames} />;

  const event = toHostEvent(record);
  const devGoogle = Boolean(record.googleAlbumId?.startsWith("dev-album-"));
  let connection: Connection = "none";
  if (event.googleConnected) connection = devGoogle ? "ok" : await checkConnection(record);

  const base = await appUrl();
  const guestUrl = `${base}/e/${slug}`;
  const hostUrl = `${base}/host/${slug}`;
  const [svg, total, failed, recent] = await Promise.all([
    qrSvg(guestUrl),
    db().countUploads(record.id),
    db().countUploads(record.id, "failed"),
    db().recentUploads(record.id, 10),
  ]);

  return (
    <main className="pt-safe pb-safe min-h-dvh bg-cream px-4">
      <header className="mb-5 mt-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[3px] text-muted-text">Host setup</p>
        <h1 className="mt-1 font-script text-[44px] leading-tight text-ink">{event.coupleNames}</h1>
      </header>

      {query.new === "1" && (
        <div role="status" className="mb-4 flex gap-3 rounded-[18px] border border-gold/50 bg-white p-4 text-sm leading-relaxed text-ink">
          <BookmarkCheck size={20} strokeWidth={ICON_STROKE} className="mt-0.5 shrink-0 text-gold" />
          <div className="min-w-0">
            <p className="font-semibold">Bookmark this page</p>
            <p className="text-muted-text">You&apos;ll need this address and your PIN to come back:</p>
            <code className="mt-1 block break-all text-xs">{hostUrl}</code>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <DetailsCard event={event} />
        <ConnectGoogleCard event={event} connection={connection} devGoogle={devGoogle} googleResult={query.google ?? null} />
        <SharedLinkCard event={event} />
        <QrCard slug={slug} guestUrl={guestUrl} qrSvg={svg} />
        <UploadsCard
          event={event}
          total={total}
          failed={failed}
          recent={recent.map((u) => ({ id: u.id, guestName: u.guestName, createdAt: u.createdAt, status: u.status }))}
        />
      </div>
    </main>
  );
}
