"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "th", label: "ไทย" },
];

export function LanguagePill() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t("lang.switch")} className="flex rounded-full bg-cream p-1 text-[13px] font-semibold">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.value}
          aria-pressed={locale === o.value}
          onClick={() => setLocale(o.value)}
          className={cn(
            "min-h-9 min-w-11 rounded-full px-3 transition-colors duration-150 ease-out",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
            locale === o.value ? "bg-white text-ink shadow-sm" : "text-muted-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
