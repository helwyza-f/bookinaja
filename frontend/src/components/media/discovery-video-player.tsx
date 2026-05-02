"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type DiscoveryVideoPlayerProps = {
  src?: string;
  hlsSrc?: string;
  poster?: string;
  className?: string;
};

export function DiscoveryVideoPlayer({
  src,
  hlsSrc,
  poster,
  className,
}: DiscoveryVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [playbackLabel, setPlaybackLabel] = useState(hlsSrc ? "Menyiapkan stream adaptif" : "Menyiapkan video");

  useEffect(() => {
    setReady(false);
    setError(false);

    const video = videoRef.current;
    if (!video) return;

    let mounted = true;
    let hlsInstance: { destroy: () => void } | null = null;

    const setup = async () => {
      if (!mounted) return;

      if (hlsSrc) {
        setPlaybackLabel("Menyiapkan stream adaptif");
        const supportsNativeHls = video.canPlayType("application/vnd.apple.mpegurl");
        if (supportsNativeHls) {
          video.src = hlsSrc;
          return;
        }

        try {
          const HlsModule = await import("hls.js");
          const HlsCtor = HlsModule.default;
          if (!mounted || !HlsCtor.isSupported()) {
            if (src) {
              video.src = src;
            }
            return;
          }
          const hls = new HlsCtor({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hls.loadSource(hlsSrc);
          hls.attachMedia(video);
          hls.on(HlsCtor.Events.ERROR, (_event: unknown, data: { fatal?: boolean }) => {
            if (data?.fatal) {
              if (src) {
                setPlaybackLabel("Fallback ke video standar");
                video.src = src;
                return;
              }
              setError(true);
            }
          });
          hlsInstance = hls;
          return;
        } catch {
          if (src) {
            video.src = src;
          } else {
            setError(true);
          }
          return;
        }
      }

      if (src) {
        setPlaybackLabel("Menyiapkan video");
        video.src = src;
      }
    };

    void setup();

    return () => {
      mounted = false;
      hlsInstance?.destroy();
    };
  }, [hlsSrc, src]);

  if (!src && !hlsSrc) {
    return (
      <div
        className={cn(
          "flex h-[260px] items-center justify-center bg-slate-950 text-white md:h-[420px]",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
          <PlayCircle className="h-5 w-5" />
          Video belum tersedia
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-[260px] w-full bg-slate-950 md:h-[420px]", className)}>
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 text-white backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full bg-black/35 px-4 py-2 text-sm font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" />
            {playbackLabel}
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 text-white">
          <div className="rounded-2xl bg-black/40 px-4 py-3 text-center text-sm font-semibold">
            Video belum bisa diputar.
          </div>
        </div>
      ) : null}
      <video
        ref={videoRef}
        poster={poster || undefined}
        className="h-full w-full object-cover"
        controls
        playsInline
        preload="metadata"
        onLoadedMetadata={() => setReady(true)}
        onCanPlay={() => setReady(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
