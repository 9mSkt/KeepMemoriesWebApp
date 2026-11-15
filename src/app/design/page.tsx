"use client";

import { useState } from "react";
import { ArrowRight, Upload } from "lucide-react";
import { Button, Chip, FilterThumb, ICON_STROKE, Input, StepCard, Toggle } from "@/components/ui";

// Living component sheet for checking the UI kit against Figma. Not linked from the app.

const SWATCHES = [
  "ivory", "cream", "sage", "sage-dark", "rose", "gold",
  "ink", "muted", "muted-text", "line", "white", "night", "stamp",
] as const;

const FILMS = ["Original", "Kodak Gold", "Fuji 400", "Classic B&W", "Polaroid", "70s Fade"];
const STYLES = ["Script", "Typewriter", "Classic"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[3px] text-muted-text">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSheet() {
  const [name, setName] = useState("Aunt Nok");
  const [film, setFilm] = useState("Kodak Gold");
  const [style, setStyle] = useState("Script");
  const [date, setDate] = useState(true);

  return (
    <main className="pt-safe pb-safe flex flex-col gap-10 px-5">
      <h1 className="font-serif text-[34px] font-semibold text-ink">Component sheet</h1>

      <Section title="Colour tokens">
        <ul className="grid grid-cols-4 gap-3">
          {SWATCHES.map((s) => (
            <li key={s} className="flex flex-col items-center gap-1.5">
              <span
                className="size-14 rounded-xl border border-line"
                style={{ background: `var(--km-${s})` }}
              />
              <span className="text-[11px] text-muted-text">{s}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography">
        <p className="text-[11px] font-medium uppercase tracking-[3px] text-muted-text">The wedding of</p>
        <p className="font-script text-[54px] leading-none">Ploy &amp; Krit</p>
        <p className="font-script text-[28px] leading-none">Ploy &amp; Krit</p>
        <p className="font-serif text-[19px] italic">Saturday, 12 December 2026</p>
        <p className="font-serif text-[34px] font-semibold">Memory saved!</p>
        <p className="font-serif text-2xl font-semibold">Choose a film</p>
        <p className="text-base">Body — DM Sans 16. ไทย — Noto Sans Thai.</p>
        <p
          className="font-typewriter text-xl font-bold text-stamp"
          style={{ textShadow: "0 0 4px rgba(255,140,51,.65)" }}
        >
          12 12 &apos;26
        </p>
        <div className="flex flex-col gap-1 rounded-xl bg-night p-4 text-white">
          <span className="font-script text-2xl">ขอให้รักกันตลอดไป — Script (Charm)</span>
          <span className="font-typewriter text-lg">ขอให้รักกันตลอดไป — Typewriter (Sarabun)</span>
          <span className="font-serif text-lg">ขอให้รักกันตลอดไป — Classic (Noto Serif Thai)</span>
        </div>
        <div className="h-px w-12 bg-gold" aria-hidden />
      </Section>

      <Section title="Buttons">
        <Button>Start capturing memories</Button>
        <Button trailingIcon={<ArrowRight strokeWidth={ICON_STROKE} />}>Next: add your words</Button>
        <Button leadingIcon={<Upload strokeWidth={ICON_STROKE} />}>Send to the wedding album</Button>
        <Button variant="secondary">View the shared album ↗</Button>
        <Button variant="ghost">Reconnect</Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Inputs">
        <Input
          label="Your name"
          value={name}
          maxLength={40}
          showCount
          onChange={(e) => setName(e.target.value)}
        />
        <Input label="Shared album link" placeholder="https://photos.app.goo.gl/…" hint="In Google Photos: open the album → Share → Copy link." />
        <Input label="Host PIN" inputMode="numeric" error="PIN must be 4–8 digits." defaultValue="12" />
      </Section>

      <Section title="Chips & toggle">
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <Chip key={s} selected={style === s} onClick={() => setStyle(s)}>
              {s}
            </Chip>
          ))}
        </div>
        <Toggle label="Date" checked={date} onChange={setDate} />
      </Section>

      <Section title="Filter thumbnails">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
          {FILMS.map((f) => (
            <FilterThumb key={f} label={f} selected={film === f} onClick={() => setFilm(f)} />
          ))}
        </div>
      </Section>

      <Section title="Step cards (host)">
        <div className="flex flex-col gap-3 rounded-2xl bg-cream p-3">
          <StepCard step={1} title="Wedding details" done status="Done">
            <p className="text-sm text-muted-text">Ploy &amp; Krit · 12 December 2026</p>
          </StepCard>
          <StepCard step={2} title="Connect Google Photos" status="Reconnect needed" tone="error">
            <Button>Connect Google Photos</Button>
          </StepCard>
          <StepCard step={3} title="Paste the album share link" />
        </div>
      </Section>
    </main>
  );
}
