"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HeroVideo } from "./hero-video";
import { QuickSearch } from "./quick-search";
import {
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  ShieldIcon,
} from "./icons";

function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active]);

  return value;
}

export function HeroStage({
  roomCount,
  categoryCount,
}: {
  roomCount: number;
  categoryCount: number;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);
  const [active, setActive] = useState(false);
  const rooms = useCountUp(roomCount, active);
  const categories = useCountUp(categoryCount, active);

  useEffect(() => {
    setActive(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = sectionRef.current?.offsetHeight ?? window.innerHeight;
        setOffset(Math.min(window.scrollY, height));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const contentOpacity = Math.max(0, 1 - offset / 1100);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative isolate -mt-16 flex min-h-[100svh] items-center overflow-hidden bg-[#041c24] pb-24 lg:pb-0"
    >
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translate3d(0, ${offset * 0.22}px, 0) scale(1.03)` }}
      >
        <HeroVideo />
      </div>
      <div className="absolute inset-0 bg-[#041c24]/35" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#041c24]/95 via-[#041c24]/82 to-[#041c24]/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#041c24] via-transparent to-[#041c24]/45" />
      <div className="bali-ornament opacity-40" aria-hidden />

      <div
        className="page-shell relative flex w-full flex-col justify-center py-16 will-change-transform sm:py-20 lg:py-24"
        style={{
          transform: `translate3d(0, ${offset * 0.08}px, 0)`,
          opacity: contentOpacity,
        }}
      >
        <div className="max-w-3xl">
          <span className="eyebrow !text-[0.62rem] !tracking-[0.14em] !text-[#f6b65a] sm:!text-[0.72rem] sm:!tracking-[0.18em]">
            Sistem Reservasi Ruang Unggulan · IDB Bali
          </span>
          <h1 className="mt-4 max-w-[21ch] text-balance font-display text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.02em] text-white sm:max-w-none sm:text-[3.3rem] lg:text-[4.1rem]">
            Ruang bersama,{" "}
            <span className="italic text-[#ffc46a]">untuk karya bersama.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[0.98rem] leading-relaxed text-white/80 sm:text-lg">
            Temukan ruang unggulan kampus IDB Bali, ajukan reservasi, dan pantau
            keputusannya dalam satu alur yang ringkas.
          </p>
          <div className="mt-7 max-w-[46rem] sm:mt-8">
            <QuickSearch />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.7rem] text-white/70 sm:text-xs">
            <span className="flex items-center gap-1.5">
              <ShieldIcon size={14} /> Slot ditahan saat menunggu
            </span>
            <span className="flex items-center gap-1.5">
              <CheckIcon size={14} /> Anti-bentrok di server
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon size={14} /> Semua waktu WITA
            </span>
          </div>
        </div>

        <div className="mt-10 border-t border-white/15 pt-6 sm:mt-12">
          <div className="flex flex-wrap gap-x-10 gap-y-5 sm:gap-x-14">
            <div>
              <p className="font-display text-3xl font-semibold tabular-nums text-white">
                {rooms}
              </p>
              <p className="text-xs text-white/60">ruang unggulan</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold tabular-nums text-white">
                {categories}
              </p>
              <p className="text-xs text-white/60">kategori ruang</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold tabular-nums text-white">0</p>
              <p className="text-xs text-white/60">jadwal bentrok</p>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="#cara-kerja"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white lg:flex"
        aria-label="Gulir ke cara kerja"
      >
        Gulir
        <ChevronDownIcon size={16} className="animate-bounce" />
      </Link>
    </section>
  );
}
