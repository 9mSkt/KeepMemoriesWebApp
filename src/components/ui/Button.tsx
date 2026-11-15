import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[28px] px-7 py-4 " +
  "font-sans text-base font-semibold leading-5 select-none " +
  "transition-[background-color,box-shadow,transform,opacity] duration-200 ease-out " +
  "active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold " +
  "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-sage-dark text-white shadow-soft hover:bg-[#53634a]",
  secondary: "bg-white text-sage-dark border-[1.5px] border-sage hover:bg-cream",
  ghost: "bg-transparent text-sage-dark hover:bg-cream",
};

/** Class string for a button look — use on `<Link>` / `<a>` so navigation stays a real link. */
export function buttonClasses({
  variant = "primary",
  fullWidth = true,
  className,
}: { variant?: ButtonVariant; fullWidth?: boolean; className?: string } = {}): string {
  return cn(base, variants[variant], fullWidth && "w-full", className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Defaults to true: buttons are full-width on mobile. */
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export function Button({
  variant = "primary",
  fullWidth = true,
  leadingIcon,
  trailingIcon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, fullWidth, className })} {...rest}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
