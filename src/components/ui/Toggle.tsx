"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
};

export function Toggle({ checked, onChange, label, hideLabel, disabled, className }: ToggleProps) {
  const id = useId();
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-3", className)}>
      <label htmlFor={id} className={cn("text-sm font-medium text-ink", hideLabel && "sr-only")}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[26px] w-11 shrink-0 rounded-full transition-colors duration-200 ease-out",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
          "disabled:opacity-50",
          // Extend the tap target to 44 px tall without changing the visual size.
          "before:absolute before:-inset-y-[9px] before:inset-x-0 before:content-['']",
          checked ? "bg-sage" : "bg-line",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-[3px] top-[3px] size-5 rounded-full bg-white shadow-sm",
            "transition-transform duration-200 ease-out",
            checked && "translate-x-[18px]",
          )}
        />
      </button>
    </div>
  );
}
