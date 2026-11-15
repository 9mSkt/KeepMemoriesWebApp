import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { buttonClasses, ICON_STROKE, StepCard } from "@/components/ui";
import type { HostEvent } from "@/lib/db/events";

export type Connection = "none" | "ok" | "reconnect" | "unknown";

const RESULT_MESSAGES: Record<string, string> = {
  denied: "Google sign-in was cancelled. Try again when you're ready.",
  scope: "Please allow Keep Memories to add photos to Google Photos (tick the box on Google's screen).",
  error: "Couldn't connect to Google Photos. Please try again.",
};

export function ConnectGoogleCard({
  event,
  connection,
  devGoogle,
  googleResult,
}: {
  event: HostEvent;
  connection: Connection;
  devGoogle: boolean;
  googleResult: string | null;
}) {
  const connectHref = `/api/host/${event.slug}/google/connect`;
  const needsReconnect = connection === "reconnect";
  const resultError = googleResult && RESULT_MESSAGES[googleResult];

  return (
    <StepCard
      step={2}
      title="Connect Google Photos"
      done={event.googleConnected && !needsReconnect}
      status={needsReconnect ? "Reconnect needed" : event.googleConnected ? "Connected" : undefined}
      tone={needsReconnect ? "error" : "success"}
    >
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink">
        {resultError && (
          <p role="alert" className="rounded-xl bg-[#b4533f]/10 px-3 py-2.5 text-[#9c4332]">
            {resultError}
          </p>
        )}

        {needsReconnect && (
          <div role="alert" className="flex gap-2.5 rounded-xl bg-[#b4533f]/10 px-3 py-2.5 text-[#9c4332]">
            <AlertTriangle size={18} strokeWidth={ICON_STROKE} className="mt-0.5 shrink-0" />
            <p>
              Google stopped accepting uploads for this album — usually because access expired. Guests can&apos;t send
              photos until you reconnect. Your existing album is kept.
            </p>
          </div>
        )}

        {event.googleConnected ? (
          <>
            <p className="flex gap-2">
              <CheckCircle2 size={18} strokeWidth={ICON_STROKE} className="mt-0.5 shrink-0 text-sage-dark" />
              <span>
                Album <strong>“{event.googleAlbumTitle}”</strong> was created in your Google Photos. Guest photos
                upload here.
                {event.googleEmail && <span className="block text-muted-text">{event.googleEmail}</span>}
              </span>
            </p>
            {devGoogle && (
              <p className="rounded-xl bg-cream px-3 py-2.5 text-xs text-muted-text">
                Dev mode: Google isn&apos;t configured, so photos are saved to <code>.data/uploads/{event.slug}/</code>{" "}
                on this computer instead.
              </p>
            )}
            {needsReconnect ? (
              <a href={connectHref} className={buttonClasses()}>
                Reconnect Google Photos
              </a>
            ) : (
              <a href={connectHref} className="self-start text-sm font-semibold text-sage-dark underline underline-offset-4">
                Reconnect
              </a>
            )}
          </>
        ) : (
          <>
            <p className="text-muted-text">
              Sign in once with the Google account that should own the wedding album. We&apos;ll create the album for
              you. Guests never sign in.
            </p>
            <a href={connectHref} className={buttonClasses()}>
              Connect Google Photos
            </a>
          </>
        )}
      </div>
    </StepCard>
  );
}
