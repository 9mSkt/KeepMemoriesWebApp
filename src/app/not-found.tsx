"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-script text-[44px] leading-none text-ink">Keep Memories</p>
      <div className="h-px w-12 bg-gold" aria-hidden />
      <h1 className="font-serif text-2xl font-semibold text-ink">{t("notFound.title")}</h1>
      <p className="text-[15px] text-muted-text">{t("notFound.body")}</p>
    </main>
  );
}
