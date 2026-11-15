import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type StepCardProps = {
  step: number;
  title: string;
  done?: boolean;
  /** Badge text, e.g. "Done" or "Connected". Shown when provided. */
  status?: string;
  /** Use "error" for states like "Reconnect needed". */
  tone?: "success" | "error";
  children?: ReactNode;
  className?: string;
};

export function StepCard({
  step,
  title,
  done = false,
  status,
  tone = "success",
  children,
  className,
}: StepCardProps) {
  return (
    <section
      aria-label={`Step ${step}: ${title}`}
      className={cn("rounded-[18px] border border-line bg-white p-4", className)}
    >
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white",
            "transition-colors duration-200 ease-out",
            done ? "bg-sage" : "bg-ink",
          )}
        >
          {done ? <Check size={16} strokeWidth={2.4} /> : step}
        </span>
        <h2 className="flex-1 font-sans text-[15px] font-semibold text-ink">{title}</h2>
        {status && (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              tone === "error" ? "bg-[#b4533f]/12 text-[#9c4332]" : "bg-sage/15 text-sage-dark",
            )}
          >
            {status}
          </span>
        )}
      </header>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}
