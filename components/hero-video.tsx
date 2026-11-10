"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "./icons";

/**
 * Video hero 10 detik yang sama dengan referensi kampus IDB Bali
 * (hero-campus.mp4), diputar berulang, tanpa audio, dengan kontrol jeda.
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionAllowed(!media.matches);
  }, []);

  useEffect(() => {
    if (!motionAllowed) return;
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => setFailed(true));
  }, [motionAllowed]);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  const showVideo = motionAllowed && !failed;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#041c24]">
      <Image
        src="/rooms/hero-campus-poster.jpg"
        alt="Suasana kampus IDB Bali"
        fill
        priority
        sizes="100vw"
        className={`object-cover transition-opacity duration-700 ${
          playing ? "opacity-0" : "opacity-100"
        }`}
      />
      {showVideo ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/rooms/hero-campus-poster.jpg"
            onPlaying={() => {
              setPlaying(true);
              setPaused(false);
            }}
            onPause={() => setPaused(true)}
            onPlay={() => setPaused(false)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              playing ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src="/rooms/hero-campus.mp4" type="video/mp4" />
          </video>
          <button
            type="button"
            onClick={toggle}
            aria-label={paused ? "Putar video latar" : "Jeda video latar"}
            className="absolute bottom-24 right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white lg:bottom-6"
          >
            {paused ? <PlayIcon size={18} /> : <PauseIcon size={18} />}
          </button>
        </>
      ) : null}
    </div>
  );
}
