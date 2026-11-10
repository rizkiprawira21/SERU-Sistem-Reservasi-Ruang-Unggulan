import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireApplicant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveStatus } from "@/lib/bookings";
import { bookingHasStarted, formatDateID, formatDateTimeWITA, formatRange } from "@/lib/time";
import { STATUS_HINT, STATUS_LABEL, TYPE_LABEL } from "@/lib/config";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { CopyButton } from "@/components/copy-button";
import {
  AlertIcon,
  ArrowLeftIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  DoorIcon,
  InfoIcon,
  MailIcon,
  UsersIcon,
} from "@/components/icons";

export const metadata: Metadata = { title: "Status pengajuan" };

export default async function RiwayatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireApplicant();
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      room: true,
      history: { include: { actor: true }, orderBy: { createdAt: "asc" } },
      decidedBy: true,
    },
  });

  if (!booking || booking.userId !== user.id) notFound();

  const status = effectiveStatus(booking);
  const canCancel =
    (booking.status === "MENUNGGU" || booking.status === "DISETUJUI") &&
    !bookingHasStarted(booking.date, booking.startMin);

  return (
    <div className="page-shell py-8 sm:py-10">
      <Link
        href="/riwayat"
        className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
      >
        <ArrowLeftIcon size={14} /> Kembali ke riwayat
      </Link>

      <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-wide text-muted">
              {booking.ref}
            </span>
            <span className="badge" data-status={status.key}>
              {status.label}
            </span>
          </div>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold text-ink sm:text-4xl">
            {booking.activity}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Diajukan {formatDateTimeWITA(booking.createdAt)} WITA
          </p>
        </div>
        <CopyButton value={booking.ref} label="Salin referensi" />
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="bg-gradient-to-br from-[#007090] to-[#0a8aa5] p-5 text-white sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/65">
                    Ruangan
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-white">
                    {booking.room.name}
                  </h2>
                  <p className="mt-1 text-xs text-white/75">
                    {booking.room.category} · {booking.room.building}, {booking.room.floor}
                  </p>
                </div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  Kapasitas {booking.room.capacity} orang
                </span>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <Detail icon={<CalendarIcon size={16} />} label="Tanggal">
                {formatDateID(booking.date)}
              </Detail>
              <Detail icon={<ClockIcon size={16} />} label="Waktu">
                {formatRange(booking.startMin, booking.endMin)} WITA
              </Detail>
              <Detail icon={<UsersIcon size={16} />} label="Jumlah peserta">
                {booking.participants} orang
              </Detail>
              <Detail icon={<BuildingIcon size={16} />} label="Lokasi">
                {booking.room.building}, {booking.room.floor}
              </Detail>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              Keperluan kegiatan
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-body">
              {booking.purpose}
            </p>

            {booking.status === "DITOLAK" && booking.rejectionReason ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm text-danger">
                <AlertIcon size={17} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Alasan penolakan</p>
                  <p className="mt-0.5 leading-relaxed">{booking.rejectionReason}</p>
                  {booking.decidedAt ? (
                    <p className="mt-1 text-[0.7rem] opacity-80">
                      Diputuskan {formatDateTimeWITA(booking.decidedAt)} WITA
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {booking.status === "DISETUJUI" && booking.staffNote ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-success/25 bg-success-soft p-3.5 text-sm text-success">
                <CheckIcon size={17} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Catatan admin</p>
                  <p className="mt-0.5 leading-relaxed">{booking.staffNote}</p>
                </div>
              </div>
            ) : null}

            {booking.status === "DIBATALKAN" ? (
              <div className="mt-4 rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm">
                <p className="font-semibold text-ink">Pengajuan dibatalkan</p>
                <p className="mt-0.5 text-muted">
                  {booking.cancelReason ?? "Dibatalkan."}
                </p>
                {booking.cancelledAt ? (
                  <p className="mt-1 text-[0.7rem] text-muted">
                    {formatDateTimeWITA(booking.cancelledAt)} WITA
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              Linimasa status
            </h2>
            <ol className="mt-4 space-y-0">
              {booking.history.map((entry, index) => {
                const last = index === booking.history.length - 1;
                return (
                  <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {!last ? (
                      <span
                        aria-hidden
                        className="absolute left-[11px] top-6 h-full w-px bg-line"
                      />
                    ) : null}
                    <span
                      className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${
                        entry.toStatus === "DISETUJUI"
                          ? "bg-success"
                          : entry.toStatus === "DITOLAK"
                            ? "bg-danger"
                            : entry.toStatus === "DIBATALKAN"
                              ? "bg-muted"
                              : "bg-warning"
                      }`}
                    >
                      <CheckIcon size={13} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {STATUS_LABEL[entry.toStatus] ?? entry.toStatus}
                      </p>
                      {entry.note ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">
                          {entry.note}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[0.68rem] text-muted">
                        {formatDateTimeWITA(entry.createdAt)} WITA
                        {entry.actor ? ` · ${entry.actor.name}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Status saat ini
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="badge" data-status={status.key}>
                {status.label}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-body">
              {STATUS_HINT[booking.status]}
            </p>

            {canCancel ? (
              <div className="mt-4">
                <CancelBookingButton bookingId={booking.id} />
              </div>
            ) : booking.status === "DISETUJUI" &&
              bookingHasStarted(booking.date, booking.startMin) ? (
              <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                Waktu kegiatan sudah lewat. Hubungi admin bila perlu perubahan
                atau pencatatan.
              </p>
            ) : null}

            <div className="mt-4 rounded-xl border border-line bg-surface-2/50 p-3 text-xs leading-relaxed text-muted">
              <p className="flex items-center gap-1.5 font-medium text-body">
                <InfoIcon size={13} /> Pembatalan
              </p>
              <p className="mt-1">
                Anda dapat membatalkan sebelum waktu mulai. Setelah itu,
                perubahan dilakukan melalui admin.
              </p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink">Pemohon</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-[0.7rem] text-muted">Nama</dt>
                <dd className="font-medium text-ink">{user.name}</dd>
              </div>
              <div>
                <dt className="text-[0.7rem] text-muted">Jenis pemohon</dt>
                <dd className="font-medium text-ink">{TYPE_LABEL[user.type]}</dd>
              </div>
              {user.identity ? (
                <div>
                  <dt className="text-[0.7rem] text-muted">NIM/NIDN</dt>
                  <dd className="font-medium text-ink">{user.identity}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[0.7rem] text-muted">Email</dt>
                <dd className="flex items-center gap-1.5 font-medium text-ink">
                  <MailIcon size={13} className="text-muted" /> {user.email}
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-line pt-3">
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <DoorIcon size={13} /> Data pribadi hanya terlihat oleh Anda dan
                admin berwenang.
              </p>
            </div>
          </div>

          {booking.decidedBy ? (
            <div className="card-flat p-4 text-xs text-muted">
              Diputuskan oleh{" "}
              <span className="font-medium text-ink">{booking.decidedBy.name}</span>
              {booking.decidedAt
                ? ` pada ${formatDateTimeWITA(booking.decidedAt)} WITA`
                : ""}
              .
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </span>
      <div>
        <p className="text-[0.7rem] text-muted">{label}</p>
        <p className="text-sm font-medium text-ink">{children}</p>
      </div>
    </div>
  );
}
