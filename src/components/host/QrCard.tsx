"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, Download, Printer } from "lucide-react";
import { buttonClasses, Button, ICON_STROKE, StepCard } from "@/components/ui";

/**
 * Copy text to the clipboard. `navigator.clipboard` only exists on HTTPS/localhost, so when the host page is
 * opened over plain HTTP (e.g. http://192.168.x.x:3000 on a phone) fall back to a hidden textarea + execCommand.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.left = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length); // iOS Safari
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

export function QrCard({ slug, guestUrl, qrSvg }: { slug: string; guestUrl: string; qrSvg: string }) {
  const [copied, setCopied] = useState(false);

  async function downloadPng() {
    const QRCode = (await import("qrcode")).default;
    const dataUrl = await QRCode.toDataURL(guestUrl, { width: 1024, margin: 2, errorCorrectionLevel: "M" });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `keep-memories-${slug}-qr.png`;
    a.click();
  }

  const [copyFailed, setCopyFailed] = useState(false);

  async function copy() {
    const ok = await copyText(guestUrl);
    setCopied(ok);
    setCopyFailed(!ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  }

  return (
    <StepCard step={4} title="Share with guests">
      <div className="flex flex-col items-center gap-4">
        <div
          className="size-44 rounded-2xl border border-line bg-white p-3 [&>svg]:size-full"
          role="img"
          aria-label={`QR code for ${guestUrl}`}
          // SVG generated server-side by the `qrcode` package from our own URL.
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div className="flex w-full items-center gap-2 rounded-xl bg-cream px-3 py-2">
          <input
            readOnly
            value={guestUrl}
            aria-label="Guest link"
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 truncate bg-transparent font-mono text-xs text-ink outline-none"
          />
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Link copied" : "Copy guest link"}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-sage-dark hover:bg-white"
          >
            {copied ? <Check size={18} strokeWidth={ICON_STROKE} /> : <Copy size={18} strokeWidth={ICON_STROKE} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p role="status" className="-mt-2 text-center text-xs text-muted-text empty:hidden">
          {copyFailed ? "Couldn't copy automatically — tap the link, select it and copy." : ""}
        </p>
        <div className="grid w-full grid-cols-2 gap-3">
          <Button variant="secondary" onClick={downloadPng} leadingIcon={<Download strokeWidth={ICON_STROKE} />} className="px-4">
            Download QR
          </Button>
          <Link href={`/host/${slug}/qr`} className={buttonClasses({ className: "px-4" })}>
            <Printer strokeWidth={ICON_STROKE} />
            Print card
          </Link>
        </div>
      </div>
    </StepCard>
  );
}
