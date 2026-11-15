import Link from "next/link";
import { ManageEventForm } from "@/components/host/ManageEventForm";
import { buttonClasses } from "@/components/ui";

export default function Home() {
  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[3px] text-muted-text">Wedding photos, on film</p>
      <h1 className="font-script text-[54px] leading-none text-ink">Keep Memories</h1>
      <div className="h-px w-12 bg-gold" aria-hidden />
      <p className="max-w-xs font-serif text-[19px] italic text-ink">
        Guests scan a QR code, snap a photo, and it lands in your Google Photos album.
      </p>
      <div className="mt-4 flex w-full max-w-sm flex-col items-center gap-3">
        <Link href="/host/new" className={buttonClasses()}>
          Create your wedding event
        </Link>
        <ManageEventForm />
      </div>
    </main>
  );
}
