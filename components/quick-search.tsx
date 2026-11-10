"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addDays, dayIndex, todayISO, toMinutes } from "@/lib/time";
import { APP_CONFIG } from "@/lib/config";
import { CalendarIcon, ClockIcon, SearchIcon } from "./icons";

export function QuickSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const bounds = useMemo(() => {
    const today = todayISO();
    return {
      min: addDays(today, APP_CONFIG.minLeadDays),
      max: addDays(today, APP_CONFIG.maxAdvanceDays),
      suggested: addDays(today, 3),
    };
  }, []);
  const [date, setDate] = useState(bounds.suggested);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [error, setError] = useState<string | null>(null);

  const quickDates = useMemo(() => {
    let saturday = bounds.min;
    for (let i = 0; i < 7; i += 1) {
      if (dayIndex(saturday) === 6) break;
      saturday = addDays(saturday, 1);
    }
    return [
      { label: "H-2", value: bounds.min },
      { label: "Minggu depan", value: addDays(bounds.min, 7) },
      { label: "Sabtu", value: saturday },
    ];
  }, [bounds]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!date) {
      setError("Pilih tanggal terlebih dahulu.");
      return;
    }
    if (toMinutes(end) <= toMinutes(start)) {
      setError("Jam selesai harus lebih akhir daripada jam mulai.");
      return;
    }
    setError(null);
    router.push(
      `/pinjam?date=${encodeURIComponent(date)}&start=${encodeURIComponent(
        start,
      )}&end=${encodeURIComponent(end)}`,
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-2xl border border-white/15 bg-white/10 p-3 shadow-lg backdrop-blur-md ${
        compact ? "" : "sm:p-4"
      }`}
      aria-label="Cari ketersediaan ruangan"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
        <div className="relative col-span-2 sm:col-span-1">
          <label htmlFor="quick-date" className="sr-only">
            Tanggal
          </label>
          <CalendarIcon
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
          />
          <input
            id="quick-date"
            type="date"
            value={date}
            min={bounds.min}
            max={bounds.max}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/20 bg-white/95 pl-10 pr-3 text-sm text-[#1e2b24] shadow-sm"
            required
          />
        </div>
        <div className="relative">
          <label htmlFor="quick-start" className="sr-only">
            Jam mulai
          </label>
          <ClockIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
          />
          <input
            id="quick-start"
            type="time"
            value={start}
            step={1800}
            onChange={(e) => setStart(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/20 bg-white/95 pl-10 pr-2 text-sm text-[#1e2b24] shadow-sm"
            required
          />
        </div>
        <div className="relative">
          <label htmlFor="quick-end" className="sr-only">
            Jam selesai
          </label>
          <ClockIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
          />
          <input
            id="quick-end"
            type="time"
            value={end}
            step={1800}
            onChange={(e) => setEnd(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/20 bg-white/95 pl-10 pr-2 text-sm text-[#1e2b24] shadow-sm"
            required
          />
        </div>
        <button type="submit" className="btn btn-accent col-span-2 !h-11 sm:col-span-1">
          <SearchIcon size={17} />
          <span>Cek ketersediaan</span>
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1">
        <span className="text-[0.68rem] font-medium text-white/75">Pilih cepat</span>
        {quickDates.map((quick) => (
          <button
            key={quick.label}
            type="button"
            onClick={() => {
              setDate(quick.value);
              setError(null);
            }}
            aria-pressed={date === quick.value}
            className={`min-h-7 rounded-full border px-2.5 text-[0.68rem] font-medium transition-colors ${
              date === quick.value
                ? "border-[#f09010] bg-[#f09010] text-[#211306]"
                : "border-white/25 bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            {quick.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[0.7rem] text-white/75">
        <span>
          Pengajuan H-{APP_CONFIG.minLeadDays} s.d. {APP_CONFIG.maxAdvanceDays} hari
          ke depan · WITA
        </span>
        {error ? (
          <span role="alert" className="font-medium text-[#ffd9c9]">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
