"use client";

import { useRef, useMemo } from "react";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  onNextVideo?: () => void;
  onShowComments?: () => void;
  onCloseApp?: () => void;
}

type Zone = "left" | "center" | "right";

export default function VideoPlayer({
  video,
  onNextVideo,
  onShowComments,
  onCloseApp,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tapCounts = useRef<Record<Zone, number>>({ left: 0, center: 0, right: 0 });
  const timers = useRef<Record<Zone, ReturnType<typeof setTimeout> | null>>({
    left: null,
    center: null,
    right: null,
  });

  const seekBy = (seconds: number) => {
    const el = videoRef.current;
    if (!el) return;
    const nextTime = Math.max(0, Math.min((el.currentTime || 0) + seconds, el.duration || Number.MAX_VALUE));
    el.currentTime = nextTime;
  };

  const handlePause = () => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
  };

  const handleNext = () => {
    onNextVideo?.();
  };

  const handleShowComments = () => {
    onShowComments?.();
  };

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.close();
      // fallback if window.close is blocked
      setTimeout(() => {
        if (!window.closed) {
          window.location.href = "about:blank";
        }
      }, 150);
    }
    onCloseApp?.();
  };

  const processTaps = (zone: Zone, count: number) => {
    if (zone === "left") {
      if (count >= 3) {
        handleShowComments();
      } else if (count === 2) {
        seekBy(-10);
      }
    } else if (zone === "center") {
      if (count >= 3) {
        handleNext();
      } else if (count === 1) {
        handlePause();
      }
    } else if (zone === "right") {
      if (count >= 3) {
        handleClose();
      } else if (count === 2) {
        seekBy(10);
      }
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const zone: Zone = x < rect.width / 3 ? "left" : x > (2 * rect.width) / 3 ? "right" : "center";

    tapCounts.current[zone] += 1;
    if (timers.current[zone]) clearTimeout(timers.current[zone] as NodeJS.Timeout);

    timers.current[zone] = setTimeout(() => {
      const count = tapCounts.current[zone];
      processTaps(zone, count);
      tapCounts.current[zone] = 0;
      timers.current[zone] = null;
    }, 320);
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden select-none"
      onClick={handleTap}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='854' height='480'%3E%3Crect fill='%23222' width='854' height='480'/%3E%3C/svg%3E"
      >
        <source
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${video?.filepath}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
      {/* Tap hint overlay (non-interactive, visual only) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  );
}
