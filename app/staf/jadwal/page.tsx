import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllRooms } from "@/lib/rooms";
import {
  addDays,
  formatDateID,
  formatRange,
  isValidDateISO,
  todayISO,
  toTime,
} from "@/lib/time";
import { APP_CONFIG } from "@/lib/config";
import { BlockForm } from "./block-form";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BanIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  DoorIcon,
  UsersIcon,
} from "@/components/icons";

export const metadata: Metadata = { title: "Jadwal & blokir" };

const OPEN = APP_CONFIG.dayOpenMin;
const CLOSE = APP_CONFIG.dayCloseMin;
const TOTAL = CLOSE - OPEN;
const TICKS = Array.from({ length: 8 }, (_, index) => OPEN + index * 120);

export default async function StafJadwalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const today = todayISO();
  const date =
    params.date && isValidDateISO(params.date) ? params.date : today;

  const [rooms, bookings, blocks] = await Promise.all([
    getAllRooms(),
    prisma.booking.findMany({
      where: {
        date,
        status: { in: ["MENUNGGU", "DISETUJUI"] },
      },
      include: { room: true, user: true },
      orderBy: { startMin: "asc" },
    }),
    prisma.roomBlock.findMany({
      where: { date },
      include: { room: true, createdBy: true },
      orderBy: { startMin: "asc" },
    }),
  ]);

  const activeRooms = rooms.filter((room) => room.active);
  const prev = addDays(date, -1);
  const next = addDays(date, 1);

  return (
    <div className="page-shell py-8 sm:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow">Kalender ruangan</span>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Jadwal & blokir
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Lihat pemakaian ruangan per hari dan tambahkan blokir untuk
            pemeliharaan atau jadwal kuliah. Blokir mengalahkan pengajuan baru.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <Link href={`/staf/jadwal?date=${prev}`} className="btn btn-outline btn-sm">
            <ArrowLeftIcon size={14} /> Sebelumnya
          </Link>
          <form action="/staf/jadwal" method="get" className="flex items-center gap-1.5">
            <label htmlFor="date-picker" className="sr-only">
              Pilih tanggal
            </label>
            <input
              id="date-picker"
              type="date"
              name="date"
              defaultValue={date}
              className="input !min-h-9 w-[9.5rem] text-sm"
            />
            <button type="submit" className="btn btn-primary btn-sm">
              Lihat
            </button>
          </form>
          <Link href={`/staf/jadwal?date=${next}`} className="btn btn-outline btn-sm">
            Berikutnya <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <CalendarIcon size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{formatDateID(date)}</p>
            <p className="text-[0.68rem] text-muted">
              {date === today ? "Hari ini" : "WITA"} · {bookings.length} reservasi ·{" "}
              {blocks.length} blokir
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[0.68rem] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded bg-success" /> Disetujui
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded bg-warning" /> Menunggu
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded border border-line bg-surface-2" /> Blokir
          </span>
          <BlockForm
            rooms={activeRooms.map((room) => ({ id: room.id, name: room.name }))}
            defaultDate={date}
          />
        </div>
      </div>

      <div className="table-wrap mt-5 p-4">
        <div className="min-w-[760px]">
          <div className="ml-[9.5rem] flex justify-between px-1 text-[0.62rem] text-muted">
            {TICKS.map((tick) => (
              <span key={tick}>{toTime(tick).replace(":", ".")}</span>
            ))}
          </div>
          <div className="mt-1 space-y-1.5">
            {activeRooms.map((room) => {
              const roomBookings = bookings.filter((item) => item.roomId === room.id);
              const roomBlocks = blocks.filter((item) => item.roomId === room.id);
              return (
                <div key={room.id} className="flex items-center gap-2">
                  <div className="w-[9.5rem] shrink-0 pr-2">
                    <p className="truncate text-xs font-semibold text-ink">{room.name}</p>
                    <p className="text-[0.6rem] text-muted">
                      {room.building} · {room.floor}
                    </p>
                  </div>
                  <div className="relative h-12 flex-1 overflow-hidden rounded-lg border border-line bg-surface-2/60">
                    {TICKS.map((tick) => (
                      <span
                        key={tick}
                        aria-hidden
                        className="absolute inset-y-0 w-px bg-line/70"
                        style={{ left: `${((tick - OPEN) / TOTAL) * 100}%` }}
                      />
                    ))}
                    {roomBlocks.map((block) => {
                      const left = ((block.startMin - OPEN) / TOTAL) * 100;
                      const width = ((block.endMin - block.startMin) / TOTAL) * 100;
                      return (
                        <div
                          key={block.id}
                          title={`Blokir ${formatRange(block.startMin, block.endMin)} · ${block.reason}`}
                          className="absolute inset-y-1 flex items-center overflow-hidden rounded-md border border-line bg-surface px-1.5 text-[0.6rem] text-muted"
                          style={{
                            left: `${Math.max(left, 0)}%`,
                            width: `${Math.max(width, 1.5)}%`,
                            backgroundImage:
                              "repeating-linear-gradient(45deg, transparent, transparent 4px, color-mix(in srgb, var(--color-muted) 14%, transparent) 4px, color-mix(in srgb, var(--color-muted) 14%, transparent) 7px)",
                          }}
                        >
                          <span className="truncate">{block.reason}</span>
                        </div>
                      );
                    })}
                    {roomBookings.map((booking) => {
                      const left = ((booking.startMin - OPEN) / TOTAL) * 100;
                      const width = ((booking.endMin - booking.startMin) / TOTAL) * 100;
                      return (
                        <Link
                          key={booking.id}
                          href={`/staf/${booking.id}`}
                          title={`${booking.ref} · ${booking.activity} · ${formatRange(booking.startMin, booking.endMin)}`}
                          className={`absolute inset-y-1 flex items-center overflow-hidden rounded-md px-1.5 text-[0.62rem] font-medium text-on-primary transition-opacity hover:opacity-90 ${
                            booking.status === "DISETUJUI" ? "bg-success" : "bg-warning"
                          }`}
                          style={{
                            left: `${Math.max(left, 0)}%`,
                            width: `${Math.max(width, 1.5)}%`,
                          }}
                        >
                          <span className="truncate">
                            {booking.room.name} · {booking.activity}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-xl font-semibold text-ink">
            Reservasi pada {formatDateID(date)}
          </h2>
          {bookings.length === 0 ? (
            <p className="mt-3 rounded-xl bg-surface-2 p-4 text-sm text-muted">
              Tidak ada reservasi aktif pada tanggal ini.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {bookings.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/staf/${booking.id}`}
                    className="flex items-start gap-3 py-3 transition-colors hover:bg-surface-2/60"
                  >
                    <span className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-surface-2 px-1 py-1 text-center">
                      <span className="text-xs font-bold text-ink">
                        {toTime(booking.startMin)}
                      </span>
                      <span className="text-[0.58rem] text-muted">
                        {toTime(booking.endMin)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink">
                          {booking.activity}
                        </span>
                        <span className="badge !px-1.5" data-status={booking.status} />
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {booking.room.name} · {booking.user.name} ·{" "}
                        {booking.participants} peserta
                      </span>
                    </span>
                    <CheckIcon size={15} className="mt-1 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl font-semibold text-ink">
            Blokir pada tanggal ini
          </h2>
          {blocks.length === 0 ? (
            <p className="mt-3 rounded-xl bg-surface-2 p-4 text-sm text-muted">
              Belum ada blokir. Gunakan tombol “Tambah blokir” untuk menutup
              ruangan sementara.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {blocks.map((block) => (
                <li key={block.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                        <BanIcon size={14} className="text-muted" />
                        {block.room.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{block.reason}</p>
                    </div>
                    <span className="chip !text-[0.68rem]">
                      {formatRange(block.startMin, block.endMin)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[0.65rem] text-muted">
                    Dibuat oleh {block.createdBy?.name ?? "admin"} ·{" "}
                    {block.createdAt.toLocaleDateString("id-ID")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="card-flat mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 p-4 text-[0.68rem] text-muted">
        <span className="flex items-center gap-1.5">
          <DoorIcon size={13} /> {activeRooms.length} ruangan aktif ditampilkan
        </span>
        <span className="flex items-center gap-1.5">
          <ClockIcon size={13} /> Skala {toTime(OPEN)}–{toTime(CLOSE)} WITA
        </span>
        <span className="flex items-center gap-1.5">
          <UsersIcon size={13} /> Klik blok untuk membuka detail pengajuan
        </span>
      </div>
    </div>
  );
}
