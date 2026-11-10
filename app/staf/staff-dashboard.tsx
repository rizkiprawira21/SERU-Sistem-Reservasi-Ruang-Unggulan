"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminBooking, StaffDashboard } from "@/lib/staff";
import { useToast } from "@/components/toast";
import { formatDateID } from "@/lib/time";
import { DecisionActions } from "@/components/decision-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AlertIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  DoorIcon,
  InboxIcon,
  RefreshIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";

const STATUS_TABS = [
  { value: "MENUNGGU", label: "Menunggu" },
  { value: "SEMUA", label: "Semua" },
  { value: "DISETUJUI", label: "Disetujui" },
  { value: "DITOLAK", label: "Ditolak" },
  { value: "DIBATALKAN", label: "Dibatalkan" },
];

export function StaffDashboardClient({ initial }: { initial: StaffDashboard }) {
  const { toast } = useToast();
  const [status, setStatus] = useState("MENUNGGU");
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const firstLoad = useRef(true);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams({ status });
        if (date) params.set("date", date);
        if (query.trim()) params.set("q", query.trim());
        const response = await fetch(`/api/staff/bookings?${params.toString()}`, {
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          window.location.href = "/masuk?next=%2Fstaf";
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as StaffDashboard & {
          message?: string;
        };
        if (!response.ok) {
          if (!silent) toast(payload.message ?? "Gagal memuat antrean.", "error");
          return;
        }
        setData(payload);
        setLastUpdated(
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
      } catch {
        if (!silent) toast("Koneksi bermasalah saat memuat antrean.", "error");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [status, date, query, toast],
  );

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      return;
    }
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filtered = data.bookings;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow">Dashboard admin</span>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Antrean reservasi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Periksa aturan dan konflik secara otomatis, lalu putuskan dengan
            cepat. Antrean diperbarui otomatis setiap 10 detik.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[0.68rem] text-muted sm:block">
            {lastUpdated ? `Diperbarui ${lastUpdated}` : "Memuat…"}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="btn btn-outline btn-sm"
          >
            <RefreshIcon size={15} className={loading ? "animate-spin" : ""} />
            Muat ulang
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Menunggu keputusan"
          value={data.stats.menunggu}
          tone="warning"
          icon={<InboxIcon size={17} />}
          hint="Perlu ditinjau"
        />
        <StatCard
          label="Disetujui hari ini"
          value={data.stats.disetujuiHariIni}
          tone="success"
          icon={<CalendarIcon size={17} />}
          hint="Keputusan hari ini"
        />
        <StatCard
          label="Ditolak hari ini"
          value={data.stats.ditolakHariIni}
          tone="danger"
          icon={<XIcon size={17} />}
          hint="Keputusan hari ini"
        />
        <StatCard
          label="Kegiatan hari ini"
          value={data.stats.kegiatanHariIni}
          tone="info"
          icon={<ClockIcon size={17} />}
          hint="Disetujui + menunggu"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.55fr_0.95fr]">
        <section aria-labelledby="antrean-title" className="min-w-0">
          <div className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="antrean-title" className="font-display text-xl font-semibold text-ink">
                Daftar pengajuan
              </h2>
              <span className="text-xs text-muted">{filtered.length} pengajuan</span>
            </div>

            <div
              className="no-scrollbar mt-3 flex w-full min-w-0 gap-1.5 overflow-x-auto pb-1"
              role="tablist"
              aria-label="Filter status"
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={status === tab.value}
                  onClick={() => setStatus(tab.value)}
                  className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${
                    status === tab.value
                      ? "border-primary bg-primary text-on-primary"
                      : "border-line bg-surface text-body hover:border-primary/40"
                  }`}
                >
                  {tab.label}
                  {tab.value === "MENUNGGU" ? (
                    <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[0.62rem]">
                      {data.stats.menunggu}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <div className="relative min-w-0">
                <label htmlFor="staff-search" className="sr-only">
                  Cari pengajuan
                </label>
                <SearchIcon
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  id="staff-search"
                  className="input !min-h-10 !pl-10 text-sm"
                  placeholder="Cari referensi, kegiatan, pemohon, ruangan…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="staff-date" className="sr-only">
                  Filter tanggal kegiatan
                </label>
                <input
                  id="staff-date"
                  type="date"
                  className="input !min-h-10 text-sm"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDate("");
                  setQuery("");
                }}
                className="btn btn-ghost btn-sm"
              >
                Reset
              </button>
            </div>
          </div>

          <div className={`mt-3 space-y-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {filtered.length === 0 ? (
              <div className="card p-10 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <InboxIcon size={26} />
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold text-ink">
                  Antrean bersih
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                  {status === "MENUNGGU"
                    ? "Tidak ada pengajuan yang menunggu keputusan saat ini."
                    : "Tidak ada pengajuan yang cocok dengan filter ini."}
                </p>
              </div>
            ) : (
              filtered.map((booking) => (
                <QueueRow key={booking.id} booking={booking} onChanged={() => void load(true)} />
              ))
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line p-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  Reservasi hari ini
                </h2>
                <p className="text-xs text-muted">{formatDateID(data.today)}</p>
              </div>
              <span className="badge" data-status="DISETUJUI">
                {data.todayBookings.length} kegiatan
              </span>
            </div>
            <div className="max-h-[26rem] overflow-auto p-3">
              {data.todayBookings.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">
                  Belum ada reservasi untuk hari ini.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.todayBookings.map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={`/staf/${booking.id}`}
                        className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-2"
                      >
                        <span className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-surface-2 px-1 py-1 text-center">
                          <span className="text-[0.7rem] font-bold text-ink">
                            {booking.timeLabel.slice(0, 5)}
                          </span>
                          <span className="text-[0.58rem] text-muted">WITA</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {booking.activity}
                          </span>
                          <span className="mt-0.5 block truncate text-[0.68rem] text-muted">
                            {booking.room.name} · {booking.applicant.name}
                          </span>
                        </span>
                        <span
                          className="badge !px-1.5"
                          data-status={booking.status}
                          aria-label={booking.statusLabel}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-lg font-semibold text-ink">Pengingat</h2>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-muted">
              <li className="flex gap-2">
                <AlertIcon size={14} className="mt-0.5 shrink-0 text-warning" />
                Pengajuan untuk kegiatan kurang dari 24 jam diberi penanda
                mendesak.
              </li>
              <li className="flex gap-2">
                <ClockIcon size={14} className="mt-0.5 shrink-0 text-muted" />
                Setujui hanya setelah memeriksa konflik terbaru. Sistem
                memeriksa ulang saat tombol ditekan.
              </li>
              <li className="flex gap-2">
                <XIcon size={14} className="mt-0.5 shrink-0 text-danger" />
                Penolakan wajib disertai alasan yang jelas untuk pemohon.
              </li>
            </ul>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
              <span className="text-xs text-body">Mode tampilan</span>
              <ThemeToggle compact />
            </div>
          </div>

          <div className="card-flat flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-ink">Kelola ruangan</p>
              <p className="text-xs text-muted">Tambah, ubah, atau nonaktifkan.</p>
            </div>
            <Link href="/staf/ruangan" className="btn btn-outline btn-sm">
              Buka <ArrowRightIcon size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
  hint,
}: {
  label: string;
  value: number;
  tone: "warning" | "success" | "danger" | "info";
  icon: React.ReactNode;
  hint: string;
}) {
  const toneClass = {
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  }[tone];
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
          {icon}
        </span>
        <span className="font-display text-3xl font-semibold leading-none text-ink">
          {value}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-ink">{label}</p>
      <p className="text-[0.68rem] text-muted">{hint}</p>
    </div>
  );
}

function QueueRow({
  booking,
  onChanged,
}: {
  booking: AdminBooking;
  onChanged: () => void;
}) {
  return (
    <article
      className={`card p-4 transition-shadow hover:shadow-lift ${
        booking.isUrgent && booking.status === "MENUNGGU"
          ? "border-warning/45 bg-warning-soft/20"
          : ""
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.7rem] font-semibold text-muted">
              {booking.ref}
            </span>
            <span className="badge" data-status={booking.status}>
              {booking.statusLabel}
            </span>
            {booking.isUrgent && booking.status === "MENUNGGU" ? (
              <span className="badge" data-status="DITOLAK">
                <AlertIcon size={11} /> Mendesak ·{" "}
                {booking.hoursUntilStart !== null
                  ? `${Math.max(0, Math.round(booking.hoursUntilStart))} jam lagi`
                  : ""}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1.5 truncate font-display text-lg font-semibold text-ink">
            {booking.activity}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body">
            <span className="flex items-center gap-1">
              <UsersIcon size={13} className="text-muted" />
              {booking.applicant.name} · {booking.applicant.typeLabel}
            </span>
            <span className="flex items-center gap-1">
              <DoorIcon size={13} className="text-muted" />
              {booking.room.name}
            </span>
            <span className="flex items-center gap-1">
              <CalendarIcon size={13} className="text-muted" />
              {booking.dateLabel}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon size={13} className="text-muted" />
              {booking.timeLabel} WITA
            </span>
          </p>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
            {booking.purpose}
          </p>
          <p className="mt-1.5 text-[0.65rem] text-muted">
            Diajukan {booking.createdAtLabel} · {booking.participants} peserta
            {booking.applicant.org ? ` · ${booking.applicant.org}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {booking.status === "MENUNGGU" ? (
            <DecisionActions
              booking={{
                id: booking.id,
                ref: booking.ref,
                activity: booking.activity,
                purpose: booking.purpose,
                dateLabel: booking.dateLabel,
                timeLabel: booking.timeLabel,
                roomName: booking.room.name,
                applicantName: booking.applicant.name,
              }}
              onDone={onChanged}
            />
          ) : null}
          <Link href={`/staf/${booking.id}`} className="btn btn-ghost btn-sm">
            Buka detail <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
