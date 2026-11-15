import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  selected?: boolean;
};

export function Chip({ selected = false, className, type = "button", ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-[20px] border px-4 py-[9px]",
        "text-sm font-medium transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        selected
          ? "border-ink bg-ink text-white"
          : "border-line bg-white text-ink hover:border-gold",
        className,
      )}
      {...rest}
    />
  );
}
