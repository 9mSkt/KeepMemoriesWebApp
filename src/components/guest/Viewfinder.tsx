"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { normalise } from "@/lib/image/decode";
import { cn } from "@/lib/cn";

export type Facing = "environment" | "user";
export type CameraStatus = "starting" | "live" | "unavailable";

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

/** Live camera via getUserMedia, with torch (where supported) and a 3:4 capture matching the viewfinder. */
export function useCamera(facing: Facing) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Each start gets a generation number; a start that was superseded (stop, flip, React re-running the
  // effect) discards its stream instead of racing the newer one.
  const generation = useRef(0);

  const start = useCallback(async () => {
    const gen = ++generation.current;
    stop();
    setTorchOn(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 3840 } },
        audio: false,
      });
      if (gen !== generation.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("no video element");
      video.srcObject = stream;
      await video.play().catch(() => {});
      // Only enable the shutter once real frames are arriving.
      if (!video.videoWidth) {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          video.addEventListener("loadeddata", done, { once: true });
          setTimeout(done, 3000);
        });
      }
      if (gen !== generation.current) return;
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as TorchCapabilities;
      setTorchSupported(Boolean(caps.torch));
      setStatus(video.videoWidth ? "live" : "unavailable");
    } catch {
      if (gen === generation.current) setStatus("unavailable");
    }
  }, [facing, stop]);

  useEffect(() => {
    void start();
    // Phones suspend the camera in the background; restart when the page is visible again.
    const onVisibility = () => {
      if (document.hidden) {
        generation.current++;
        stop();
      } else void start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      // Intentionally bump the latest value: this counter invalidates any in-flight start.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      stop();
    };
  }, [start, stop]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  /** Grab the current frame at full video resolution, cropped to the 3:4 viewfinder. */
  const capture = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const ratio = 3 / 4;
    let sw = vw;
    let sh = vh;
    if (vw / vh > ratio) sw = vh * ratio;
    else sh = vw / ratio;
    return normalise(video, { sx: (vw - sw) / 2, sy: (vh - sh) / 2, sw, sh });
  }, []);

  return { videoRef, status, torchSupported, torchOn, toggleTorch, capture };
}

export function Viewfinder({
  videoRef,
  mirrored,
  flash,
  children,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mirrored: boolean;
  /** Brief white flash on capture. */
  flash: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[24px] bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn("absolute inset-0 size-full object-cover", mirrored && "-scale-x-100")}
      />
      {/* Rule-of-thirds grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
        <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
        <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
        <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-white transition-opacity duration-200 ease-out",
          flash ? "opacity-80" : "opacity-0",
        )}
      />
      {children}
    </div>
  );
}
