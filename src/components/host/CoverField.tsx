"use client";

import { useEffect, useId, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { ICON_STROKE } from "@/components/ui";

/** Optional cover photo picker with an arch-shaped preview. */
export function CoverField({
  currentUrl,
  onChange,
}: {
  currentUrl?: string | null;
  /** File to upload, or "remove" to clear the existing cover, or null for unchanged. */
  onChange: (v: File | "remove" | null) => void;
}) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  useEffect(() => setPreview(currentUrl ?? null), [currentUrl]);

  return (
    <div className="flex items-center gap-4">
      <div className="h-[92px] w-[76px] shrink-0 overflow-hidden rounded-t-full border border-gold bg-cream">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted-text">Cover photo (optional)</span>
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={id}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium text-ink focus-within:outline-2 focus-within:outline-gold"
          >
            <ImagePlus size={16} strokeWidth={ICON_STROKE} />
            {preview ? "Change" : "Choose photo"}
          </label>
          {preview && (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                onChange("remove");
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted-text hover:bg-cream"
            >
              <X size={16} strokeWidth={ICON_STROKE} /> Remove
            </button>
          )}
        </div>
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setPreview(URL.createObjectURL(file));
            onChange(file);
          }}
        />
      </div>
    </div>
  );
}
