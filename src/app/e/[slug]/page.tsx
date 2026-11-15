"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Camera, ExternalLink } from "lucide-react";
import { useEvent } from "@/components/guest/EventContext";
import { LanguagePill } from "@/components/guest/LanguagePill";
import { Button, buttonClasses, ICON_STROKE, Input } from "@/components/ui";
import { getGuestName, setGuestName } from "@/lib/client/device";
import { myUploads } from "@/lib/client/idb";
import { formatLongDate } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LIMITS, cleanText } from "@/lib/validation";

export default function WelcomePage() {
  const event = useEvent();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [myCount, setMyCount] = useState(0);

  useEffect(() => {
    setName(getGuestName());
    myUploads.list(event.slug).then((l) => setMyCount(l.length)).catch(() => {});
    router.prefetch(`/e/${event.slug}/camera`);
  }, [event.slug, router]);

  function start(e: React.FormEvent) {
    e.preventDefault();
    const clean = cleanText(name);
    if (!clean) {
      setError(t("welcome.nameRequired"));
      return;
    }
    setGuestName(clean);
    router.push(`/e/${event.slug}/camera`);
  }

  const opensAt = event.uploadOpensAt
    ? new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(event.uploadOpensAt),
      )
    : "";

  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col px-6">
      <div className="flex justify-end">
        <LanguagePill />
      </div>

      {/* Arch cover: top corners fully rounded, 1 px gold stroke. */}
      <div className="mx-auto mt-4 aspect-[3/3.4] w-[62%] max-w-[240px] overflow-hidden rounded-t-full border border-gold bg-cream">
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-[radial-gradient(120%_90%_at_50%_10%,#fff_0%,var(--km-cream)_45%,color-mix(in_srgb,var(--km-rose)_55%,var(--km-cream))_100%)]" />
        )}
      </div>

      <div className="mt-7 flex flex-col items-center text-center">
        <p className="text-[11px] font-medium uppercase tracking-[3px] text-muted-text">{t("welcome.overline")}</p>
        <h1 className="mt-2 font-script text-[54px] leading-[1.05] text-ink">{event.coupleNames}</h1>
        <p className="mt-1 font-serif text-[19px] italic text-ink">{formatLongDate(event.weddingDate, locale)}</p>
        <div className="mt-4 h-px w-12 bg-gold" aria-hidden />
      </div>

      <div className="mt-auto flex flex-col gap-4 pt-8">
        {event.status === "open" ? (
          <form onSubmit={start} className="flex flex-col gap-4" noValidate>
            <Input
              label={t("welcome.nameLabel")}
              placeholder={t("welcome.namePlaceholder")}
              value={name}
              maxLength={LIMITS.guestNameMax}
              autoComplete="name"
              enterKeyHint="go"
              error={error}
              onChange={(e) => {
                setName(e.target.value);
                setError(undefined);
              }}
            />
            <Button type="submit" leadingIcon={<Camera strokeWidth={ICON_STROKE} />}>
              {t("welcome.start")}
            </Button>
          </form>
        ) : (
          <ClosedNotice status={event.status} albumUrl={event.sharedAlbumUrl} opensAt={opensAt} />
        )}

        {myCount > 0 && (
          <Link href={`/e/${event.slug}/saved`} className={buttonClasses({ variant: "ghost" })}>
            {t("welcome.myPhotos", { n: myCount })}
          </Link>
        )}

        <p className="text-center text-xs leading-relaxed text-muted-text">{t("welcome.footnote")}</p>
      </div>
    </main>
  );
}

function ClosedNotice({
  status,
  albumUrl,
  opensAt,
}: {
  status: "not_ready" | "not_started" | "closed" | "open";
  albumUrl: string | null;
  opensAt: string;
}) {
  const { t } = useI18n();
  if (status === "closed" && albumUrl) {
    return (
      <a href={albumUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses()}>
        {t("welcome.closed")}
        <ExternalLink strokeWidth={ICON_STROKE} />
      </a>
    );
  }
  const message =
    status === "closed"
      ? t("welcome.closedNoAlbum")
      : status === "not_started"
        ? t("welcome.notStarted", { time: opensAt })
        : t("welcome.notReady");
  return (
    <p role="status" className="rounded-2xl bg-cream px-5 py-4 text-center text-[15px] text-ink">
      {message}
    </p>
  );
}
