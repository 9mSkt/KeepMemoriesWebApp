"use client";

import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";
import { Button, ICON_STROKE } from "@/components/ui";
import { cn } from "@/lib/cn";

function LayoutLink({ href, selected, children }: { href: string; selected: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      replace
      aria-current={selected ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-[20px] border px-4 py-[9px] text-sm font-medium",
        selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-gold",
      )}
    >
      {children}
    </Link>
  );
}

export function PrintControls({ slug, fourUp }: { slug: string; fourUp: boolean }) {
  return (
    <div className="km-no-print pt-safe flex flex-col gap-4 bg-cream px-4 pb-2">
      <div className="flex items-center gap-2">
        <Link
          href={`/host/${slug}`}
          aria-label="Back to host setup"
          className="flex size-11 items-center justify-center rounded-full hover:bg-white"
        >
          <ChevronLeft size={24} strokeWidth={ICON_STROKE} />
        </Link>
        <h1 className="font-serif text-2xl font-semibold text-ink">Table card</h1>
      </div>
      <nav className="flex gap-2" aria-label="Layout">
        <LayoutLink href={`/host/${slug}/qr`} selected={!fourUp}>
          1 card (A6)
        </LayoutLink>
        <LayoutLink href={`/host/${slug}/qr?layout=4up`} selected={fourUp}>
          4 cards on A4
        </LayoutLink>
      </nav>
      <Button onClick={() => window.print()} leadingIcon={<Printer strokeWidth={ICON_STROKE} />}>
        Print
      </Button>
      <p className="text-center text-xs text-muted-text">
        In the print dialog choose {fourUp ? "A4" : "A6"} paper, scale 100%, and turn off headers and footers.
      </p>
    </div>
  );
}
