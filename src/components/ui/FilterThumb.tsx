import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type FilterThumbProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  label: string;
  /** Downscaled preview of the guest's photo with this film applied (object/data URL). */
  src?: string;
  selected?: boolean;
};

export function FilterThumb({
  label,
  src,
  selected = false,
  className,
  type = "button",
  ...rest
}: FilterThumbProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "group flex w-[76px] shrink-0 flex-col items-center gap-2 rounded-[14px] py-1",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "block size-[68px] overflow-hidden rounded-[12px] bg-line transition-shadow duration-150 ease-out",
          // 3 px gold stroke *outside* the thumbnail.
          selected ? "shadow-[0_0_0_3px_var(--km-gold)]" : "group-hover:shadow-[0_0_0_1px_var(--km-gold)]",
        )}
      >
        {src ? (
          // Local blob/data URLs — next/image adds nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" draggable={false} />
        ) : (
          <span className="block size-full bg-gradient-to-br from-cream via-rose/40 to-gold/50" />
        )}
      </span>
      <span className={cn("text-xs text-ink", selected ? "font-bold" : "font-normal")}>{label}</span>
    </button>
  );
}
