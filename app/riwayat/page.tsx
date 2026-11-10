import Link from "next/link";
import type { Metadata } from "next";
import { Prisma, type BookingStatus } from "@prisma/client";
import { requireApplicant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveStatus } from "@/lib/bookings";
import { formatDateID, formatDateTimeWITA, formatRange } from "@/lib/time";
import { STATUS_LABEL } from "@/lib/config";
import {
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  DoorIcon,
  PlusIcon,
  SparkleIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Riwayat pengajuan",
  description: "Pantau status dan riwayat pengajuan reservasi ruangan Anda.",
};

const FILTERS = ["SEMUA", "MENUNGGU", "DISETUJUI", "DITOLAK", "DIBATALKAN"] as const;

export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireApplicant();
  const params = await searchParams;
  const active = FILTERS.includes(params.status as (typeof FILTERS)[number])
    ? (params.status as string)
    : "SEMUA";

  const where: Prisma.BookingWhereInput = { userId: user.id };
  if (active !== "SEMUA") {
    where.status = active as BookingStatus;
  }

  const [bookings, counts] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { room: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: { _all: true },
    }),
  ]);

  const total = counts.reduce((sum, item) => sum + item._count._all, 0);
  const countOf = (status: string) =>
    counts.find((item) => item.status === status)?._count._all ?? 0;

  return (
    <div className="page-shell py-8 sm:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow">Riwayat saya</span>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Pengajuan reservasi
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Semua pengajuan yang Anda kirim, lengkap dengan status, catatan
            admin, dan alasan penolakan.
          </p>
        </div>
        <Link href="/pinjam" className="btn btn-primary shrink-0 self-start sm:self-auto">
          <PlusIcon size={16} />
          Ajukan baru
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Menunggu" value={countOf("MENUNGGU")} status="MENUNGGU" />
        <SummaryCard label="Disetujui" value={countOf("DISETUJUI")} status="DISETUJUI" />
        <SummaryCard label="Ditolak" value={countOf("DITOLAK")} status="DITOLAK" />
        <SummaryCard label="Dibatalkan" value={countOf("DIBATALKAN")} status="DIBATALKAN" />
      </div>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter status">
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={filter === "SEMUA" ? "/riwayat" : `/riwayat?status=${filter}`}
            role="tab"
            aria-selected={active === filter}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-xs font-medium transition-colors ${
              active === filter
                ? "border-primary bg-primary text-on-primary"
                : "border-line bg-surface text-body hover:border-primary/40 hover:text-ink"
            }`}
          >
            {filter === "SEMUA" ? `Semua (${total})` : STATUS_LABEL[filter]}
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <SparkleIcon size={26} />
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
            Belum ada pengajuan
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            {active === "SEMUA"
              ? "Mulai dengan memilih jadwal dan ruangan yang tersedia. Pengajuan pertama Anda akan tampil di sini."
              : "Tidak ada pengajuan dengan status ini. Coba filter lain."}
          </p>
          <Link href="/pinjam" className="btn btn-primary mt-5">
            <PlusIcon size={16} /> Ajukan reservasi
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bookings.map((booking, index) => {
            const status = effectiveStatus(booking);
            return (
              <Link
                key={booking.id}
                href={`/riwayat/${booking.id}`}
                className="card fade-up group block p-4 transition-shadow hover:shadow-lift sm:p-5"
                style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold tracking-wide text-muted">
                        {booking.ref}
                      </span>
                      <span className="badge" data-status={status.key}>
                        {status.label}
                      </span>
                    </div>
                    <h2 className="mt-1.5 truncate font-display text-lg font-semibold text-ink group-hover:text-primary sm:text-xl">
                      {booking.activity}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-body">
                      <span className="flex items-center gap-1.5">
                        <DoorIcon size={14} className="text-muted" />
                        {booking.room.name} · {booking.room.building}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon size={14} className="text-muted" />
                        {formatDateID(booking.date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClockIcon size={14} className="text-muted" />
                        {formatRange(booking.startMin, booking.endMin)} WITA
                      </span>
                    </div>
                    {booking.status === "DITOLAK" && booking.rejectionReason ? (
                      <p className="mt-2 line-clamp-1 rounded-lg bg-danger-soft px-2.5 py-1.5 text-xs text-danger">
                        Alasan penolakan: {booking.rejectionReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span className="text-[0.68rem] text-muted">
                      Diajukan {formatDateTimeWITA(booking.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Detail <ArrowRightIcon size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: string;
}) {
  return (
    <div className="card-flat p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">{label}</p>
        <span className="badge !px-1.5" data-status={status} aria-hidden />
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
