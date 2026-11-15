"use client";

import { Chip, Input, Toggle } from "@/components/ui";
import type { TextStyle } from "@/lib/image/overlay";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LIMITS } from "@/lib/validation";

const STYLES: { value: TextStyle; key: "text.script" | "text.typewriter" | "text.classic"; font: string }[] = [
  { value: "script", key: "text.script", font: "font-script text-lg" },
  { value: "typewriter", key: "text.typewriter", font: "font-typewriter" },
  { value: "classic", key: "text.classic", font: "font-serif text-[15px] font-semibold" },
];

export function TextOverlayEditor(props: {
  name: string;
  onName: (v: string) => void;
  nameError?: string;
  wish: string;
  onWish: (v: string) => void;
  style: TextStyle;
  onStyle: (v: TextStyle) => void;
  showDate: boolean;
  onShowDate: (v: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <Input
        label={t("text.nameLabel")}
        value={props.name}
        maxLength={LIMITS.guestNameMax}
        autoComplete="name"
        error={props.nameError}
        onChange={(e) => props.onName(e.target.value)}
      />
      <Input
        label={t("text.wishLabel")}
        placeholder={t("text.wishPlaceholder")}
        value={props.wish}
        maxLength={LIMITS.wishMax}
        showCount
        onChange={(e) => props.onWish(e.target.value)}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-medium text-muted-text">{t("text.style")}</legend>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <Chip key={s.value} selected={props.style === s.value} onClick={() => props.onStyle(s.value)}>
              <span className={s.font}>{t(s.key)}</span>
            </Chip>
          ))}
        </div>
      </fieldset>
      <Toggle label={t("text.date")} checked={props.showDate} onChange={props.onShowDate} />
    </div>
  );
}
