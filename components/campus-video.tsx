"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@/components/icons";

export function CampusVideo({ className = "" }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function applyPreference() {
      if (reducedMotion.matches) {
        video?.pause();
        setPlaying(false);
      }
    }

    applyPreference();
    reducedMotion.addEventListener("change", applyPreference);
    return () => reducedMotion.removeEventListener("change", applyPreference);
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  return (
    <>
      <video
        ref={videoRef}
        className={className}
        src="/rooms/hero-campus.mp4"
        poster="/rooms/hero-campus-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Video suasana kampus IDB Bali"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? "Jeda video" : "Putar video"}
        title={playing ? "Jeda video" : "Putar video"}
        className="absolute bottom-3 left-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-[#041c24]/45 text-white backdrop-blur-md transition-colors hover:bg-[#041c24]/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
      </button>
    </>
  );
}
