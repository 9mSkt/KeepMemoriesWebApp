"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera, Check, ChevronLeft, CloudOff, ExternalLink } from "lucide-react";
import { useEvent } from "@/components/guest/EventContext";
import { MyUploads, type UploadWithUrls } from "@/components/guest/MyUploads";
import { buttonClasses, ICON_STROKE } from "@/components/ui";
import { myUploads } from "@/lib/client/idb";
import { flushOutbox } from "@/lib/client/upload";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useEditHydrated, useEditStore } from "@/stores/editStore";

export default function SavedPage() {
  const event = useEvent();
  const { t } = useI18n();
  const hydrated = useEditHydrated();
  const lastSent = useEditStore((s) => s.lastSent);
  const [uploads, setUploads] = useState<UploadWithUrls[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load this device's uploads; refresh after the outbox sends anything.
  useEffect(() => {
    let urls: string[] = [];
    let cancelled = false;
    async function load() {
      const list = await myUploads.list(event.slug);
      if (cancelled) return;
      urls.forEach(URL.revokeObjectURL);
      const withUrls = list.map((u) => ({ ...u, thumbUrl: URL.createObjectURL(u.thumb) }));
      urls = withUrls.map((u) => u.thumbUrl);
      setUploads(withUrls);
      setLoaded(true);
    }
    void load();
    const retry = async () => {
      if ((await flushOutbox()) > 0) void load();
    };
    window.addEventListener("online", retry);
    const timer = setInterval(retry, 15_000);
    return () => {
      cancelled = true;
      urls.forEach(URL.revokeObjectURL);
      window.removeEventListener("online", retry);
      clearInterval(timer);
    };
  }, [event.slug]);

  const justSent = hydrated && lastSent ? uploads.filter((u) => lastSent.ids.includes(u.id)) : [];
  const hero = justSent[0] ?? uploads[0];
  const pending = justSent.some((u) => u.status === "pending");
  const count = justSent.length || 1;

  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col gap-7 px-6">
      <header className="-mx-3 -mb-6">
        <Link
          href={`/e/${event.slug}/camera`}
          aria-label={t("edit.back")}
          className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-gold"
        >
          <ChevronLeft size={24} strokeWidth={ICON_STROKE} />
        </Link>
      </header>
      <div className="mt-6 flex flex-col items-center text-center">
        {/* Tilted polaroid of the photo just sent */}
        <div className="w-[62%] max-w-[230px] -rotate-4 bg-white p-2.5 pb-9 shadow-soft">
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.thumbUrl} alt="" className="block aspect-[3/4] w-full object-cover" />
          ) : (
            <div className="aspect-[3/4] w-full bg-cream" />
          )}
        </div>

        <span
          className={`-mt-5 flex size-12 items-center justify-center rounded-full border-4 border-ivory text-white ${pending ? "bg-gold" : "bg-sage"}`}
          aria-hidden
        >
          {pending ? <CloudOff size={20} strokeWidth={2} /> : <Check size={22} strokeWidth={2.6} />}
        </span>

        <h1 className="mt-3 font-serif text-[34px] font-semibold text-ink">
          {pending ? t("saved.queuedTitle") : t("saved.title")}
        </h1>
        <p className="mt-1 max-w-xs text-[15px] leading-relaxed text-muted-text">
          {pending
            ? t("saved.queuedBody")
            : count > 1
              ? t("saved.bodyMany", { n: count, names: event.coupleNames })
              : t("saved.body", { names: event.coupleNames })}
        </p>
      </div>

      {loaded && <MyUploads uploads={uploads} />}

      <div className="mt-auto flex flex-col gap-3 pb-2">
        {event.isOpen && (
          <Link href={`/e/${event.slug}/camera`} className={buttonClasses()}>
            <Camera strokeWidth={ICON_STROKE} />
            {t("saved.another")}
          </Link>
        )}
        {event.sharedAlbumUrl && (
          <a href={event.sharedAlbumUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary" })}>
            {t("saved.viewAlbum").replace(" ↗", "")}
            <ExternalLink strokeWidth={ICON_STROKE} />
          </a>
        )}
      </div>
    </main>
  );
}
