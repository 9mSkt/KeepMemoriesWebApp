"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ICON_STROKE } from "@/components/ui";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function EditTopBar({ title, step, backHref }: { title: string; step: string; backHref: string }) {
  const { t } = useI18n();
  return (
    <header className="pt-safe grid grid-cols-[44px_1fr_44px] items-center gap-2 px-3 pb-2">
      <Link
        href={backHref}
        aria-label={t("edit.back")}
        className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-cream focus-visible:outline-2 focus-visible:outline-gold"
      >
        <ChevronLeft size={24} strokeWidth={ICON_STROKE} />
      </Link>
      <h1 className="text-center font-serif text-2xl font-semibold text-ink">{title}</h1>
      <span className="text-center text-[13px] font-medium tabular-nums text-muted-text">{step}</span>
    </header>
  );
}
