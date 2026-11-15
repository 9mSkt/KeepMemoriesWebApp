"use client";

import { useId, type InputHTMLAttributes, type Ref } from "react";
import { cn } from "@/lib/cn";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  id?: string;
  hint?: string;
  error?: string;
  /** Show "12 / 40" under the field when `maxLength` is set. */
  showCount?: boolean;
  ref?: Ref<HTMLInputElement>;
};

export function Input({
  label,
  id,
  hint,
  error,
  showCount,
  className,
  maxLength,
  value,
  ref,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  // The error replaces the hint, so describe the field by whichever one is shown.
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const count = typeof value === "string" ? value.length : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-[13px] font-medium text-muted-text">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          // 16 px text so iOS Safari doesn't zoom on focus.
          "w-full rounded-[14px] border bg-white px-4 py-3.5 text-base text-ink",
          "placeholder:text-muted transition-[border-color,box-shadow] duration-150 ease-out",
          "focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30",
          error ? "border-[#b4533f]" : "border-line",
        )}
        {...rest}
      />
      {(hint || error || (showCount && maxLength)) && (
        <div className="flex items-start justify-between gap-3 text-xs">
          <div>
            {error ? (
              <p id={errorId} className="text-[#9c4332]">
                {error}
              </p>
            ) : hint ? (
              <p id={hintId} className="text-muted-text">
                {hint}
              </p>
            ) : null}
          </div>
          {showCount && maxLength && count !== undefined && (
            <span className="shrink-0 tabular-nums text-muted-text" aria-hidden>
              {count} / {maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
