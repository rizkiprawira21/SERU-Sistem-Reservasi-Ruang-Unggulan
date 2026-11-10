"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import {
  AlertIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DoorIcon,
  InfoIcon,
  SparkleIcon,
  UsersIcon,
  WifiIcon,
} from "@/components/icons";
import {
  addDays,
  durationLabel,
  formatDateID,
  formatRange,
  monthGrid,
  parseDateUTC,
  toDateISO,
  toMinutes,
  toTime,
} from "@/lib/time";

type BusyRange = { startMin: number; endMin: number; kind: "booking" | "block" };

type RoomOption = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string | null;
  building: string;
  floor: string;
  capacity: number;
  facilities: string[];
  maxDurationMin: number;
  hoursSummary: string;
  allowedDays: string;
  specialNote: string | null;
  status: "AVAILABLE" | "BOOKED" | "HELD" | "BLOCKED" | "RULE";
  label: string;
  reason: string | null;
  busy: BusyRange[];
};

type Suggestions = {
  alternativeRooms: { id: string; name: string; building: string }[];
  alternativeSlots: {
    date: string;
    dateLabel: string;
    startMin: number;
    endMin: number;
    roomName: string;
  }[];
};

type AvailabilityResponse = {
  date: string;
  startMin: number;
  endMin: number;
  rooms: RoomOption[];
  availableCount: number;
  suggestions: Suggestions;
};

type UserInfo = {
  name: string;
  email: string;
  type: string;
  identity: string | null;
  org: string | null;
  whatsapp: string | null;
};

type Props = {
  user: UserInfo;
  initialDate: string;
  initialStart: string;
  initialEnd: string;
  initialRoomId?: string;
  bounds: { today: string; min: string; max: string; suggested: string };
};

const TIME_OPTIONS = Array.from({ length: 29 }, (_, index) => 7 * 60 + index * 30);

export function BookingWizard({
  user,
  initialDate,
  initialStart,
  initialEnd,
  initialRoomId,
  bounds,
}: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [date, setDate] = useState(initialDate);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [monthCursor, setMonthCursor] = useState(() => `${initialDate.slice(0, 7)}-01`);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId ?? null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [facilityFilter, setFacilityFilter] = useState("");
  const [capacityFilter, setCapacityFilter] = useState(0);

  const [activity, setActivity] = useState("");
  const [participants, setParticipants] = useState("");
  const [purpose, setPurpose] = useState("");
  const [declaration, setDeclaration] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{
    message: string;
    suggestions?: Suggestions;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; ref: string } | null>(null);

  const selectedRoom = data?.rooms.find((room) => room.id === selectedRoomId) ?? null;
  const duration = toMinutes(end) - toMinutes(start);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, created]);

  useEffect(() => {
    if (!timeError) return;
    if (toMinutes(end) > toMinutes(start)) setTimeError(null);
  }, [start, end, timeError]);

  function selectDate(next: string) {
    setDate(next);
    setMonthCursor(`${next.slice(0, 7)}-01`);
    setData(null);
    setSelectedRoomId(null);
    setRequestError(null);
  }

  function changeStart(value: string) {
    setStart(value);
    if (toMinutes(end) <= toMinutes(value)) {
      const minEnd = Math.min(toMinutes(value) + 60, 21 * 60);
      setEnd(toTime(minEnd));
    }
  }

  function validateTime(): boolean {
    if (toMinutes(end) <= toMinutes(start)) {
      setTimeError("Jam selesai harus lebih akhir daripada jam mulai.");
      return false;
    }
    if (toMinutes(end) - toMinutes(start) < 60) {
      setTimeError("Durasi minimum 1 jam.");
      return false;
    }
    setTimeError(null);
    return true;
  }

  async function checkAvailability(
    overrides?: {
      date?: string;
      start?: string;
      end?: string;
    },
    preferredRoomId?: string,
  ) {
    const useDate = overrides?.date ?? date;
    const useStart = overrides?.start ?? start;
    const useEnd = overrides?.end ?? end;
    if (overrides) {
      setDate(useDate);
      setStart(useStart);
      setEnd(useEnd);
      setMonthCursor(`${useDate.slice(0, 7)}-01`);
    }
    if (!validateTime() && !overrides) return;
    setLoading(true);
    setRequestError(null);
    setConflict(null);
    try {
      const response = await fetch(
        `/api/rooms/availability?date=${encodeURIComponent(
          useDate,
        )}&start=${encodeURIComponent(useStart)}&end=${encodeURIComponent(useEnd)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => ({}))) as
        | AvailabilityResponse
        | { message?: string };
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/masuk?next=%2Fpinjam";
          return;
        }
        const message =
          "message" in payload && payload.message
            ? payload.message
            : "Tidak dapat memeriksa ketersediaan. Coba lagi.";
        setRequestError(message);
        toast(message, "error");
        return;
      }
      const result = payload as AvailabilityResponse;
      setData(result);
      setSelectedRoomId((current) => {
        const candidates = [preferredRoomId, current, initialRoomId];
        for (const candidate of candidates) {
          if (
            candidate &&
            result.rooms.some(
              (room) => room.id === candidate && room.status === "AVAILABLE",
            )
          ) {
            return candidate;
          }
        }
        return null;
      });
      setStep(2);
    } catch {
      const message = "Koneksi bermasalah. Periksa jaringan lalu coba lagi.";
      setRequestError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  function applySuggestion(slot: Suggestions["alternativeSlots"][number]) {
    void checkAvailability({
      date: slot.date,
      start: toTime(slot.startMin),
      end: toTime(slot.endMin),
    });
  }

  function selectAlternativeRoom(roomId: string) {
    setConflict(null);
    void checkAvailability(undefined, roomId);
  }

  function chooseRoom(roomId: string) {
    setSelectedRoomId(roomId);
    setStep(3);
  }

  async function submitBooking() {
    if (!selectedRoom || !data) return;
    const errors: Record<string, string> = {};
    if (activity.trim().length < 3) errors.activity = "Nama kegiatan minimal 3 karakter.";
    const participantCount = Number(participants);
    if (!Number.isInteger(participantCount) || participantCount < 1) {
      errors.participants = "Jumlah peserta minimal 1 orang.";
    } else if (participantCount > selectedRoom.capacity) {
      errors.participants = `Melebihi kapasitas ruangan (${selectedRoom.capacity} orang).`;
    }
    if (purpose.trim().length < 20) {
      errors.purpose = "Alasan reservasi wajib diisi minimal 20 karakter.";
    }
    if (!declaration) {
      errors.declaration = "Centang pernyataan sebelum mengirim pengajuan.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast("Lengkapi dulu data yang wajib diisi.", "error");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setConflict(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          date,
          startMin: toMinutes(start),
          endMin: toMinutes(end),
          activity: activity.trim(),
          purpose: purpose.trim(),
          participants: participantCount,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        booking?: { id: string; ref: string };
        details?: { suggestions?: Suggestions };
        error?: string;
      };
      if (!response.ok || !payload.booking) {
        if (response.status === 409) {
          setConflict({
            message:
              payload.message ??
              "Ruangan tidak tersedia pada rentang waktu tersebut. Pilih jadwal atau ruangan lain.",
            suggestions: payload.details?.suggestions,
          });
          toast("Slot baru saja berubah. Lihat saran alternatif.", "error");
        } else {
          setFormError(payload.message ?? "Pengajuan gagal dikirim. Coba lagi.");
          toast(payload.message ?? "Pengajuan gagal dikirim.", "error");
        }
        return;
      }
      setCreated(payload.booking);
      toast("Pengajuan berhasil dikirim.", "success", "Slot ditahan sementara");
    } catch {
      setFormError("Koneksi bermasalah. Pengajuan belum terkirim, silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setStep(1);
    setData(null);
    setSelectedRoomId(null);
    setCreated(null);
    setActivity("");
    setParticipants("");
    setPurpose("");
    setDeclaration(false);
    setFieldErrors({});
    setConflict(null);
    setFormError(null);
    setOnlyAvailable(false);
    setFacilityFilter("");
    setCapacityFilter(0);
    setDate(bounds.suggested);
    setMonthCursor(`${bounds.suggested.slice(0, 7)}-01`);
    setStart("09:00");
    setEnd("12:00");
  }

  if (created) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card overflow-hidden text-center">
          <div className="relative bg-primary px-6 py-10 text-on-primary">
            <div
              aria-hidden
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, white 0 1px, transparent 1.6px), radial-gradient(circle at 70% 70%, white 0 1px, transparent 1.6px)",
                backgroundSize: "30px 30px, 44px 44px",
              }}
            />
            <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <CheckIcon size={30} />
            </span>
            <h2 className="relative mt-5 font-display text-3xl font-semibold text-white">
              Pengajuan terkirim
            </h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/80">
              Slot ruangan ditahan sementara sampai admin memutuskan. Anda akan
              menerima email saat status berubah.
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Nomor referensi
            </p>
            <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <p className="font-mono text-2xl font-bold tracking-wide text-ink">
                {created.ref}
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(created.ref);
                    toast("Nomor referensi disalin.", "success");
                  } catch {
                    toast("Salin nomor referensi secara manual.", "info");
                  }
                }}
                className="btn btn-outline btn-sm"
              >
                Salin
              </button>
            </div>
            <dl className="mt-6 grid gap-3 rounded-2xl border border-line bg-surface-2/50 p-4 text-left text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted">Ruangan</dt>
                <dd className="text-right font-medium text-ink">{selectedRoom?.name}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted">Jadwal</dt>
                <dd className="text-right font-medium text-ink">
                  {formatDateID(date)}
                  <br />
                  {formatRange(toMinutes(start), toMinutes(end))} WITA
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted">Status</dt>
                <dd>
                  <span className="badge" data-status="MENUNGGU">
                    Menunggu persetujuan
                  </span>
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link href={`/riwayat/${created.id}`} className="btn btn-primary flex-1">
                Lihat status pengajuan
              </Link>
              <Link href="/riwayat" className="btn btn-outline flex-1">
                Riwayat saya
              </Link>
            </div>
            <button type="button" onClick={resetAll} className="btn btn-ghost btn-block mt-2">
              Ajukan ruangan lain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepIndicator step={step} onPick={(next) => setStep(next)} />

      {step === 1 ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="card p-5 sm:p-6" aria-labelledby="pilih-tanggal">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="pilih-tanggal" className="font-display text-xl font-semibold text-ink">
                  Pilih tanggal
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Pengajuan H-2 sampai 30 hari ke depan.
                </p>
              </div>
              <CalendarIcon size={22} className="text-primary" />
            </div>

            <CalendarPicker
              date={date}
              monthCursor={monthCursor}
              min={bounds.min}
              max={bounds.max}
              today={bounds.today}
              onSelect={selectDate}
              onMonthChange={setMonthCursor}
            />

            <div className="mt-5 rounded-xl bg-primary-soft/60 px-3 py-2.5 text-sm text-primary">
              <span className="font-semibold">{formatDateID(date)}</span>
            </div>
          </section>

          <section className="card p-5 sm:p-6" aria-labelledby="pilih-jam">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="pilih-jam" className="font-display text-xl font-semibold text-ink">
                  Tentukan jam
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Jam operasional 07.00–21.00 WITA.
                </p>
              </div>
              <ClockIcon size={22} className="text-primary" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="field">
                <label className="label" htmlFor="start-time">
                  Jam mulai
                </label>
                <select
                  id="start-time"
                  className="select"
                  value={start}
                  onChange={(event) => changeStart(event.target.value)}
                >
                  {TIME_OPTIONS.slice(0, -1).map((min) => (
                    <option key={min} value={toTime(min)}>
                      {toTime(min).replace(":", ".")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="end-time">
                  Jam selesai
                </label>
                <select
                  id="end-time"
                  className="select"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  aria-invalid={Boolean(timeError)}
                  aria-describedby={timeError ? "time-error" : undefined}
                >
                  {TIME_OPTIONS.slice(1).map((min) => (
                    <option key={min} value={toTime(min)}>
                      {toTime(min).replace(":", ".")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-surface-2/60 px-3 py-2.5 text-sm">
              <span className="text-muted">Durasi</span>
              <span className="font-semibold text-ink">
                {duration > 0 ? durationLabel(duration) : "—"}
              </span>
            </div>

            {timeError ? (
              <p id="time-error" role="alert" className="mt-3 error-text">
                {timeError}
              </p>
            ) : null}
            {requestError ? (
              <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-danger">
                <AlertIcon size={16} className="mt-0.5 shrink-0" />
                {requestError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void checkAvailability()}
              disabled={loading}
              className="btn btn-primary btn-block mt-5"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Memeriksa ketersediaan…
                </>
              ) : (
                <>
                  Cek ketersediaan
                  <ArrowRightIcon size={16} />
                </>
              )}
            </button>
            <p className="mt-3 flex items-start gap-1.5 text-[0.72rem] leading-relaxed text-muted">
              <InfoIcon size={13} className="mt-0.5 shrink-0" />
              Ruangan yang tidak sesuai aturan atau sudah dipesan tetap tampil,
              tetapi tidak dapat dipilih.
            </p>
          </section>

          <div className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "Aturan hari ruangan",
                  body: "Lab iMac, Lecture 2B, A 1.2, dan Studio 3 hanya akhir pekan. Aula tutup hari Minggu.",
                },
                {
                  title: "Durasi maksimum",
                  body: "Umumnya 4 jam per pengajuan. Aula dapat dipinjam hingga 8 jam.",
                },
                {
                  title: "Persetujuan admin",
                  body: "Slot ditahan saat menunggu. Penolakan selalu disertai alasan.",
                },
              ].map((item) => (
                <div key={item.title} className="card-flat p-4">
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 && data ? (
        <div className="mt-6">
          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <CalendarIcon size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{formatDateID(data.date)}</p>
                <p className="text-xs text-muted">
                  {formatRange(data.startMin, data.endMin)} WITA ·{" "}
                  {durationLabel(data.endMin - data.startMin)}
                </p>
              </div>
            </div>
            <button type="button" className="btn btn-outline btn-sm self-start" onClick={() => setStep(1)}>
              <ArrowLeftIcon size={15} /> Ubah jadwal
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-muted">
              {data.availableCount} ruangan tersedia · klik ruangan untuk lanjut
            </span>
            <button
              type="button"
              onClick={() => setOnlyAvailable((value) => !value)}
              aria-pressed={onlyAvailable}
              className={`min-h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                onlyAvailable
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line bg-surface text-body hover:border-primary/40"
              }`}
            >
              Hanya tersedia
            </button>
            <label className="sr-only" htmlFor="capacity-filter">
              Kapasitas minimum
            </label>
            <select
              id="capacity-filter"
              value={capacityFilter}
              onChange={(event) => setCapacityFilter(Number(event.target.value))}
              className="h-9 rounded-full border border-line bg-surface px-3 text-xs text-body"
            >
              <option value={0}>Semua kapasitas</option>
              <option value={20}>≥ 20 orang</option>
              <option value={40}>≥ 40 orang</option>
              <option value={80}>≥ 80 orang</option>
              <option value={120}>≥ 120 orang</option>
            </select>
            <label className="sr-only" htmlFor="facility-filter">
              Fasilitas
            </label>
            <select
              id="facility-filter"
              value={facilityFilter}
              onChange={(event) => setFacilityFilter(event.target.value)}
              className="h-9 rounded-full border border-line bg-surface px-3 text-xs text-body"
            >
              <option value="">Semua fasilitas</option>
              {Array.from(new Set(data.rooms.flatMap((room) => room.facilities)))
                .sort()
                .map((facility) => (
                  <option key={facility} value={facility}>
                    {facility}
                  </option>
                ))}
            </select>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {data.rooms
              .filter(
                (room) =>
                  (!onlyAvailable || room.status === "AVAILABLE") &&
                  (capacityFilter === 0 || room.capacity >= capacityFilter) &&
                  (!facilityFilter || room.facilities.includes(facilityFilter)),
              )
              .map((room) => {
                const isSelected = selectedRoomId === room.id;
                const available = room.status === "AVAILABLE";
                return (
                  <article
                    key={room.id}
                    className={`card overflow-hidden transition-shadow ${
                      isSelected ? "ring-2 ring-primary" : "hover:shadow-lift"
                    }`}
                  >
                    {room.imageUrl ? (
                      <div className="relative h-32 overflow-hidden">
                        <Image
                          src={room.imageUrl}
                          alt={`Ruangan ${room.name} di IDB Bali`}
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#041c24]/55 to-transparent" />
                        <span className="absolute bottom-2 left-3 rounded-full border border-white/15 bg-[#041c24]/65 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-white backdrop-blur">
                          {room.category}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-start justify-between gap-3 p-5 pb-3">
                      <div>
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                          {room.category}
                        </p>
                        <h3 className="mt-1 font-display text-xl font-semibold text-ink">
                          {room.name}
                        </h3>
                      </div>
                      <span className="badge" data-status={room.status}>
                        {room.label}
                      </span>
                    </div>
                    <div className="px-5 pb-5">
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-body">
                        <span className="flex items-center gap-1.5">
                          <BuildingIcon size={14} className="text-muted" />
                          {room.building}, {room.floor}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <UsersIcon size={14} className="text-muted" />
                          {room.capacity} orang
                        </span>
                        <span className="flex items-center gap-1.5">
                          <ClockIcon size={14} className="text-muted" />
                          Maks {room.maxDurationMin / 60} jam
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {room.facilities.slice(0, 4).map((facility) => (
                          <span key={facility} className="chip !text-[0.68rem]">
                            {facility}
                          </span>
                        ))}
                        {room.facilities.length > 4 ? (
                          <span className="chip !text-[0.68rem]">
                            +{room.facilities.length - 4}
                          </span>
                        ) : null}
                      </div>

                      {room.reason ? (
                        <p
                          className={`mt-3 rounded-lg px-2.5 py-2 text-xs leading-snug ${
                            available
                              ? "bg-success-soft text-success"
                              : "bg-surface-2 text-body"
                          }`}
                        >
                          {room.reason}
                        </p>
                      ) : null}

                      {room.specialNote && available ? (
                        <p className="mt-2 text-[0.68rem] text-muted">{room.specialNote}</p>
                      ) : null}

                      <button
                        type="button"
                        disabled={!available}
                        onClick={() => chooseRoom(room.id)}
                        className={`btn btn-block mt-4 btn-sm ${
                          isSelected ? "btn-primary" : available ? "btn-outline" : "btn-subtle"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            Lanjut isi formulir <ArrowRightIcon size={15} />
                          </>
                        ) : available ? (
                          <>
                            Pilih ruangan <ArrowRightIcon size={15} />
                          </>
                        ) : (
                          "Tidak dapat dipilih"
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>

          {data.rooms.length > 0 &&
          data.rooms.filter(
            (room) =>
              (!onlyAvailable || room.status === "AVAILABLE") &&
              (capacityFilter === 0 || room.capacity >= capacityFilter) &&
              (!facilityFilter || room.facilities.includes(facilityFilter)),
          ).length === 0 ? (
            <div className="card mt-4 p-6 text-center">
              <p className="font-semibold text-ink">Tidak ada ruangan yang cocok dengan filter.</p>
              <p className="mt-1 text-sm text-muted">
                Coba longgarkan kapasitas atau fasilitas yang diminta.
              </p>
            </div>
          ) : null}

        </div>
      ) : null}

      {step === 3 && data && selectedRoom ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="card p-5 sm:p-6" aria-labelledby="detail-kegiatan">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mb-4 inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
            >
              <ArrowLeftIcon size={14} /> Ganti ruangan
            </button>
            <h2 id="detail-kegiatan" className="font-display text-2xl font-semibold text-ink">
              Detail kegiatan
            </h2>
            <p className="mt-1 text-sm text-muted">
              Data ini digunakan admin untuk menilai pengajuan.
            </p>

            {conflict ? (
              <div className="mt-4 rounded-2xl border border-danger/30 bg-danger-soft p-4">
                <p className="flex items-start gap-2 text-sm font-semibold text-danger">
                  <AlertIcon size={17} className="mt-0.5 shrink-0" />
                  {conflict.message}
                </p>
                {conflict.suggestions?.alternativeRooms.length ||
                conflict.suggestions?.alternativeSlots.length ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-body">Saran alternatif:</p>
                    <div className="flex flex-wrap gap-2">
                      {conflict.suggestions?.alternativeRooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => selectAlternativeRoom(room.id)}
                          className="chip !border-primary/30 !bg-surface !text-primary hover:!bg-primary-soft"
                        >
                          <DoorIcon size={13} /> {room.name}
                        </button>
                      ))}
                      {conflict.suggestions?.alternativeSlots.map((slot) => (
                        <button
                          key={`${slot.date}-${slot.startMin}`}
                          type="button"
                          onClick={() => applySuggestion(slot)}
                          className="chip !border-primary/30 !bg-surface !text-primary hover:!bg-primary-soft"
                        >
                          <ClockIcon size={13} /> {slot.dateLabel},{" "}
                          {formatRange(slot.startMin, slot.endMin)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {formError ? (
              <p role="alert" className="mt-4 flex items-start gap-1.5 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
                <AlertIcon size={16} className="mt-0.5 shrink-0" />
                {formError}
              </p>
            ) : null}

            <div className="mt-5 space-y-4">
              <div className="field">
                <label htmlFor="activity" className="label">
                  Nama kegiatan <span className="text-accent">*</span>
                </label>
                <input
                  id="activity"
                  className="input"
                  maxLength={120}
                  placeholder="Contoh: Workshop fotografi produk"
                  value={activity}
                  onChange={(event) => setActivity(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.activity)}
                  aria-describedby={fieldErrors.activity ? "activity-error" : undefined}
                />
                {fieldErrors.activity ? (
                  <p id="activity-error" className="error-text mt-1">
                    {fieldErrors.activity}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="participants" className="label">
                  Jumlah peserta <span className="text-accent">*</span>
                </label>
                <input
                  id="participants"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={selectedRoom.capacity}
                  className="input"
                  placeholder={`Maksimal ${selectedRoom.capacity} orang`}
                  value={participants}
                  onChange={(event) => setParticipants(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.participants)}
                  aria-describedby={
                    fieldErrors.participants ? "participants-error" : "participants-hint"
                  }
                />
                {fieldErrors.participants ? (
                  <p id="participants-error" className="error-text mt-1">
                    {fieldErrors.participants}
                  </p>
                ) : (
                  <p id="participants-hint" className="hint mt-1">
                    Kapasitas {selectedRoom.name}: {selectedRoom.capacity} orang.
                  </p>
                )}
              </div>

              <div className="field">
                <div className="flex items-center justify-between">
                  <label htmlFor="purpose" className="label">
                    Alasan / keperluan <span className="text-accent">*</span>
                  </label>
                  <span
                    className={`text-[0.7rem] ${
                      purpose.trim().length >= 20 ? "text-success" : "text-muted"
                    }`}
                  >
                    {purpose.trim().length}/20
                  </span>
                </div>
                <textarea
                  id="purpose"
                  className="textarea"
                  maxLength={500}
                  placeholder="Jelaskan singkat tujuan kegiatan dan mengapa ruangan ini dibutuhkan."
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.purpose)}
                  aria-describedby={fieldErrors.purpose ? "purpose-error" : "purpose-hint"}
                />
                {fieldErrors.purpose ? (
                  <p id="purpose-error" className="error-text mt-1">
                    {fieldErrors.purpose}
                  </p>
                ) : (
                  <p id="purpose-hint" className="hint mt-1">
                    Minimal 20 karakter. Admin membaca alasan ini saat menilai.
                  </p>
                )}
              </div>

              <div>
                <p className="label">Data pemohon</p>
                <div className="rounded-xl border border-line bg-surface-2/50 p-3.5 text-sm">
                  <dl className="grid gap-1.5 sm:grid-cols-2">
                    <div>
                      <dt className="text-[0.7rem] text-muted">Nama</dt>
                      <dd className="font-medium text-ink">{user.name}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] text-muted">NIM/NIDN</dt>
                      <dd className="font-medium text-ink">{user.identity ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] text-muted">Email</dt>
                      <dd className="truncate font-medium text-ink">{user.email}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] text-muted">WhatsApp</dt>
                      <dd className="font-medium text-ink">{user.whatsapp ?? "—"}</dd>
                    </div>
                    {user.org ? (
                      <div className="sm:col-span-2">
                        <dt className="text-[0.7rem] text-muted">Organisasi / unit</dt>
                        <dd className="font-medium text-ink">{user.org}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <p className="mt-2 text-[0.68rem] text-muted">
                    Data mengikuti akun kampus. Hubungi Sarana Prasarana bila perlu
                    diperbarui.
                  </p>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line p-3 text-sm">
                <input
                  type="checkbox"
                  checked={declaration}
                  onChange={(event) => setDeclaration(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                  aria-invalid={Boolean(fieldErrors.declaration)}
                />
                <span className="leading-relaxed text-body">
                  Saya menyatakan data yang diisi benar dan mematuhi aturan
                  reservasi ruangan IDB Bali.
                  {fieldErrors.declaration ? (
                    <span className="mt-1 block text-xs text-danger">
                      {fieldErrors.declaration}
                    </span>
                  ) : null}
                </span>
              </label>

              <button
                type="button"
                onClick={() => void submitBooking()}
                disabled={submitting}
                className="btn btn-primary btn-block"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Mengirim pengajuan…
                  </>
                ) : (
                  <>
                    Kirim pengajuan
                    <ArrowRightIcon size={16} />
                  </>
                )}
              </button>
              <p className="text-center text-[0.7rem] leading-relaxed text-muted">
                Sistem memeriksa ulang bentrok saat pengajuan dikirim. Slot baru
                dianggap aman setelah tersimpan.
              </p>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-br from-[#007090] to-[#0a8aa5] p-5 text-white">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/65">
                  Ringkasan reservasi
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-white">
                  {selectedRoom.name}
                </h3>
                <p className="mt-1 text-xs text-white/75">
                  {selectedRoom.building}, {selectedRoom.floor} · {selectedRoom.category}
                </p>
              </div>
              <div className="p-5">
                <dl className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-muted">
                      <CalendarIcon size={14} /> Tanggal
                    </dt>
                    <dd className="text-right font-medium text-ink">{formatDateID(date)}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-muted">
                      <ClockIcon size={14} /> Jam
                    </dt>
                    <dd className="text-right font-medium text-ink">
                      {formatRange(toMinutes(start), toMinutes(end))} WITA
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-muted">
                      <UsersIcon size={14} /> Kapasitas
                    </dt>
                    <dd className="text-right font-medium text-ink">
                      {selectedRoom.capacity} orang
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-muted">
                      <ClockIcon size={14} /> Durasi
                    </dt>
                    <dd className="text-right font-medium text-ink">
                      {durationLabel(toMinutes(end) - toMinutes(start))}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selectedRoom.facilities.slice(0, 5).map((facility) => (
                    <span key={facility} className="chip !text-[0.68rem]">
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card-flat p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <SparkleIcon size={14} className="text-gold" /> Setelah dikirim
              </p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
                <li>• Slot ditahan sampai admin memutuskan.</li>
                <li>• Status dan catatan dapat dipantau di Riwayat.</li>
                <li>• Email dikirim saat disetujui atau ditolak.</li>
                <li>• Anda dapat membatalkan sebelum waktu mulai.</li>
              </ul>
            </div>

            <div className="card-flat flex items-start gap-2 p-4 text-xs leading-relaxed text-muted">
              <WifiIcon size={16} className="mt-0.5 shrink-0 text-primary" />
              Semua waktu menggunakan WITA (Asia/Makassar). Data pribadi hanya
              terlihat oleh Anda dan admin berwenang.
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function StepIndicator({
  step,
  onPick,
}: {
  step: 1 | 2 | 3;
  onPick: (step: 1 | 2 | 3) => void;
}) {
  const steps = [
    { number: 1 as const, label: "Jadwal & ruangan", short: "Jadwal" },
    { number: 2 as const, label: "Pilih ruangan", short: "Ruangan" },
    { number: 3 as const, label: "Detail & kirim", short: "Detail" },
  ];
  return (
    <ol className="card flex items-center gap-1 p-2" aria-label="Langkah pengajuan">
      {steps.map((item, index) => {
        const active = step === item.number;
        const done = step > item.number;
        return (
          <li key={item.number} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (item.number < step) onPick(item.number);
              }}
              disabled={item.number > step}
              aria-current={active ? "step" : undefined}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-1.5 text-xs font-medium transition-colors sm:gap-2 sm:px-2 sm:text-sm ${
                active
                  ? "bg-primary text-on-primary"
                  : done
                    ? "bg-primary-soft text-primary"
                    : "text-muted"
              } ${item.number < step ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-bold ${
                  active
                    ? "bg-white/20"
                    : done
                      ? "bg-primary text-on-primary"
                      : "bg-surface-2 text-muted"
                }`}
              >
                {done ? <CheckIcon size={13} /> : item.number}
              </span>
              <span className="min-w-0 truncate">
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </span>
            </button>
            {index < steps.length - 1 ? (
              <span className="hidden h-px w-3 shrink-0 bg-line sm:block" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function CalendarPicker({
  date,
  monthCursor,
  min,
  max,
  today,
  onSelect,
  onMonthChange,
}: {
  date: string;
  monthCursor: string;
  min: string;
  max: string;
  today: string;
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
}) {
  const { start, days } = monthGrid(monthCursor);
  const firstDow = (parseDateUTC(start).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: days }, (_, index) => addDays(start, index)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = useMemo(() => {
    const d = parseDateUTC(monthCursor);
    return `${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }, [monthCursor]);

  const canPrev = `${monthCursor.slice(0, 7)}` > `${min.slice(0, 7)}`;
  const canNext = `${monthCursor.slice(0, 7)}` < `${max.slice(0, 7)}`;

  function shift(delta: number) {
    const d = parseDateUTC(monthCursor);
    d.setUTCMonth(d.getUTCMonth() + delta);
    const next = toDateISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
    if (next.slice(0, 7) < min.slice(0, 7)) return;
    if (next.slice(0, 7) > max.slice(0, 7)) return;
    onMonthChange(next);
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          className="btn btn-ghost !min-h-9 !min-w-9 !px-0"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeftIcon size={18} />
        </button>
        <p aria-live="polite" className="text-sm font-semibold text-ink">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          className="btn btn-ghost !min-h-9 !min-w-9 !px-0"
          aria-label="Bulan berikutnya"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center sm:gap-1">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
          <div key={day} className="py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-muted">
            {day}
          </div>
        ))}
        {cells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} />;
          const disabled = cell < min || cell > max;
          const isSelected = cell === date;
          const isToday = cell === today;
          return (
            <button
              key={cell}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cell)}
              aria-label={formatDateID(cell)}
              aria-pressed={isSelected}
              className={`relative flex aspect-square min-h-11 items-center justify-center rounded-xl text-sm transition-colors ${
                isSelected
                  ? "bg-primary font-semibold text-on-primary"
                  : disabled
                    ? "cursor-not-allowed text-muted/40"
                    : "text-body hover:bg-surface-2 hover:text-ink"
              } ${isToday && !isSelected ? "ring-1 ring-gold/50" : ""}`}
            >
              {Number(cell.slice(8, 10))}
              {isToday ? (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    isSelected ? "bg-white" : "bg-gold"
                  }`}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
