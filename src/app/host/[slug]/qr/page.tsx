import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PrintControls } from "@/components/host/PrintControls";
import { formatDotDate } from "@/lib/dates";
import { getEvent } from "@/lib/db/events";
import { appUrl } from "@/lib/http";
import { qrSvg } from "@/lib/qr";
import { isHost } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Table card · Keep Memories", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ layout?: string }> };

export default async function QrCardPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const fourUp = (await searchParams).layout === "4up";
  const event = await getEvent(slug);
  if (!event) notFound();
  if (!(await isHost(slug))) redirect(`/host/${slug}`);

  const svg = await qrSvg(`${await appUrl()}/e/${slug}`);
  const card = <TableCard names={event.coupleNames} date={formatDotDate(event.weddingDate)} svg={svg} />;

  return (
    <>
      {/* Page size depends on the chosen layout: one A6 card, or four A6 cards on an A4 sheet. */}
      <style>{`
        @page { size: ${fourUp ? "A4" : "A6"}; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          body > div { max-width: none !important; min-height: 0 !important; }
          .km-no-print { display: none !important; }
          .km-sheet { padding: 0 !important; gap: 0 !important; background: none !important; }
        }
      `}</style>
      <PrintControls slug={slug} fourUp={fourUp} />
      <div
        className={`km-sheet flex justify-center bg-cream py-6 ${fourUp ? "" : ""}`}
        style={{ overflowX: "auto" }}
      >
        {fourUp ? (
          <div className="grid shrink-0 grid-cols-2" style={{ width: "210mm", height: "297mm" }}>
            {card}
            {card}
            {card}
            {card}
          </div>
        ) : (
          card
        )}
      </div>
    </>
  );
}

function TableCard({ names, date, svg }: { names: string; date: string; svg: string }) {
  return (
    <div
      className="relative flex shrink-0 flex-col items-center justify-center bg-ivory text-center text-ink"
      style={{ width: "105mm", height: "148mm", breakInside: "avoid" }}
    >
      {/* inset 1 px gold border */}
      <div aria-hidden className="pointer-events-none absolute border border-gold" style={{ inset: "6mm" }} />
      <p className="text-[11px] font-semibold uppercase tracking-[3px] text-muted-text">Share your moments</p>
      <p className="mt-3 px-8 font-script text-[52px] leading-[1.05]">{names}</p>
      <p className="mt-2 font-serif text-[17px] italic">{date}</p>
      <div
        className="mt-5 rounded-2xl bg-white p-3 [&>svg]:size-full"
        style={{ width: 176 + 24, height: 176 + 24 }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="mt-5 px-10 text-[13px] leading-snug">Scan to snap photos with a vintage film look</p>
      <p lang="th" className="mt-1 px-10 text-[13px] leading-snug text-muted-text">
        สแกนเพื่อถ่ายภาพความทรงจำร่วมกับเรา
      </p>
    </div>
  );
}
