"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Reveal } from "./reveal";
import {
  ArrowRightIcon,
  BuildingIcon,
  ClockIcon,
  DoorIcon,
  SearchIcon,
  UsersIcon,
} from "./icons";

export type CatalogRoom = {
  id: string;
  slug: string;
  name: string;
  category: string;
  imageUrl: string | null;
  building: string;
  floor: string;
  capacity: number;
  facilities: string[];
  hoursSummary: string;
  allowedDays: string;
  specialNote: string | null;
};

const CATEGORY_TONE: Record<string, string> = {
  Aula: "from-[#007090] to-[#0a8aa5]",
  "Ruang kelas": "from-[#0a6b7f] to-[#0e8da5]",
  Studio: "from-[#d97a0a] to-[#f0a43a]",
  Laboratorium: "from-[#0b5f75] to-[#1689a3]",
  "Ruang rapat": "from-[#345c66] to-[#5c8390]",
  Galeri: "from-[#c85f2e] to-[#e58b52]",
  Serbaguna: "from-[#0f5a54] to-[#1b7f78]",
};

export function RoomCatalog({ rooms }: { rooms: CatalogRoom[] }) {
  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(rooms.map((r) => r.category)))],
    [rooms],
  );
  const [active, setActive] = useState("Semua");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();
    return rooms.filter((room) => {
      const categoryMatch = active === "Semua" || room.category === active;
      if (!categoryMatch) return false;
      if (!keyword) return true;
      return [room.name, room.category, room.building, ...room.facilities]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [rooms, active, deferredQuery]);

  const isFiltering = active !== "Semua" || deferredQuery.trim().length > 0;
  const shown = isFiltering || showAll ? filtered : filtered.slice(0, 3);

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Filter kategori ruangan"
        >
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={active === category}
              onClick={() => setActive(category)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
                active === category
                  ? "border-primary bg-primary text-on-primary"
                  : "border-line bg-surface text-body hover:border-primary/40 hover:text-ink"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 md:w-72">
          <label htmlFor="room-search" className="sr-only">
            Cari ruangan atau fasilitas
          </label>
          <SearchIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="room-search"
            className="input !min-h-11 !pl-10 text-sm"
            placeholder="Cari ruangan"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted" aria-live="polite">
          Menampilkan <strong className="text-ink">{shown.length}</strong> dari {filtered.length} ruangan
        </p>
        {isFiltering && filtered.length === 0 ? (
          <button
            type="button"
            onClick={() => {
              setActive("Semua");
              setQuery("");
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Reset pencarian
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="card mt-4 p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <SearchIcon size={26} />
          </span>
          <p className="mt-4 font-display text-xl font-semibold text-ink">
            Ruangan tidak ditemukan
          </p>
          <p className="mt-1 text-sm text-muted">
            Coba kata kunci lain, misalnya “lab”, “studio”, atau “aula”.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((room, index) => {
            const tone = CATEGORY_TONE[room.category] ?? "from-[#007090] to-[#0a8aa5]";
            return (
              <Reveal key={room.id} delay={Math.min(index * 60, 360)} className="h-full">
              <article
                className="card group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  event.currentTarget.style.setProperty(
                    "--spot-x",
                    `${event.clientX - rect.left}px`,
                  );
                  event.currentTarget.style.setProperty(
                    "--spot-y",
                    `${event.clientY - rect.top}px`,
                  );
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(320px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(240,144,16,0.13), transparent 65%)",
                  }}
                />
                <div className="relative h-44 overflow-hidden bg-[#0b2a33]">
                  {room.imageUrl ? (
                    <Image
                      src={room.imageUrl}
                      alt={`Ruangan ${room.name} di IDB Bali`}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${tone}`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#041c24]/65 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-[#041c24]/60 px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-wider text-white backdrop-blur">
                    {room.category}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {room.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <BuildingIcon size={12} /> {room.building}, {room.floor}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <UsersIcon size={12} /> {room.capacity} orang
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {room.facilities.slice(0, 3).map((facility) => (
                      <span key={facility} className="chip !text-[0.66rem]">
                        {facility}
                      </span>
                    ))}
                    {room.facilities.length > 3 ? (
                      <span className="chip !text-[0.66rem]">
                        +{room.facilities.length - 3}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-start gap-1.5 text-[0.7rem] leading-snug text-muted">
                    <ClockIcon size={12} className="mt-0.5 shrink-0" />
                    <span>
                      {room.allowedDays} · {room.hoursSummary}
                    </span>
                  </div>

                  {room.specialNote ? (
                    <p className="mt-2 rounded-lg bg-warning-soft px-2.5 py-1.5 text-[0.68rem] leading-snug text-warning">
                      {room.specialNote}
                    </p>
                  ) : null}

                  <Link
                    href={`/pinjam?room=${room.id}`}
                    className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <DoorIcon size={14} />
                    Cek jadwal ruangan
                    <ArrowRightIcon
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
              </article>
              </Reveal>
            );
          })}
        </div>
      )}

      {!isFiltering && filtered.length > 3 ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="btn btn-outline"
          >
            {showAll
              ? "Tampilkan lebih sedikit"
              : `Lihat selengkapnya (${filtered.length - 3} ruangan lain)`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
