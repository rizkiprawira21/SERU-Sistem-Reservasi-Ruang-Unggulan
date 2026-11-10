import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatDateID,
  formatDateTimeWITA,
  formatRange,
  bookingHasStarted,
} from "@/lib/time";
import { validateRoomSchedule } from "@/lib/rules";
import { STATUS_LABEL, TYPE_LABEL } from "@/lib/config";
import { DecisionActions } from "@/components/decision-actions";
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
  MailIcon,
  ShieldIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";

export const metadata: Metadata = { title: "Detail pengajuan" };

export default async function StafDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      room: true,
      user: true,
      history: { include: { actor: true }, orderBy: { createdAt: "asc" } },
      decidedBy: true,
    },
  });
  if (!booking) notFound();

  const [conflictBooking, conflictBlock] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        id: { not: booking.id },
        roomId: booking.roomId,
        date: booking.date,
        status: { in: ["MENUNGGU", "DISETUJUI"] },
        startMin: { lt: booking.endMin },
        endMin: { gt: booking.startMin },
      },
      select: { ref: true, status: true, startMin: true, endMin: true },
    }),
    prisma.roomBlock.findFirst({
      where: {
        roomId: booking.roomId,
        date: booking.date,
        startMin: { lt: booking.endMin },
        endMin: { gt: booking.startMin },
      },
      select: { reason: true, startMin: true, endMin: true },
    }),
  ]);

  const ruleIssue = validateRoomSchedule(
    booking.room,
    booking.date,
    booking.startMin,
    booking.endMin,
  );
  const capacityOk = booking.participants <= booking.room.capacity;
  const hasConflict = Boolean(conflictBooking || conflictBlock);
  const conflictText = conflictBooking
    ? `Bentrok dengan ${conflictBooking.ref} (${STATUS_LABEL[conflictBooking.status]}) pada ${formatRange(conflictBooking.startMin, conflictBooking.endMin)}.`
    : conflictBlock
      ? `Ruangan diblokir: ${conflictBlock.reason} (${formatRange(conflictBlock.startMin, conflictBlock.endMin)}).`
      : null;

  const canCancel =
    (booking.status === "MENUNGGU" || booking.status === "DISETUJUI") &&
    !bookingHasStarted(booking.date, booking.startMin);

  return (
    <div className="page-shell py-8 sm:py-10">
      <Link
        href="/staf"
        className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
      >
        <ArrowLeftIcon size={14} /> Kembali ke antrean
      </Link>

      <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-wide text-muted">
              {booking.ref}
            </span>
            <span className="badge" data-status={booking.status}>
              {STATUS_LABEL[booking.status]}
            </span>
            {bookingHasStarted(booking.date, booking.startMin) ? (
              <span className="chip">Waktu sudah lewat</span>
            ) : null}
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
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              Verifikasi otomatis
            </h2>
            <p className="mt-1 text-xs text-muted">
              Diperiksa ulang saat keputusan disimpan.
            </p>
            <ul className="mt-4 space-y-2.5">
              <CheckRow
                ok={!ruleIssue}
                label={
                  ruleIssue
                    ? `Aturan ruangan: ${ruleIssue.message}`
                    : "Aturan hari, jam, dan durasi sesuai"
                }
              />
              <CheckRow
                ok={!hasConflict}
                label={
                  hasConflict
                    ? `Konflik: ${conflictText}`
                    : "Tidak ada bentrok dengan reservasi aktif atau blokir"
                }
              />
              <CheckRow
                ok={capacityOk}
                label={
                  capacityOk
                    ? `Kapasitas memadai (${booking.participants}/${booking.room.capacity} orang)`
                    : `Peserta melebihi kapasitas (${booking.participants}/${booking.room.capacity})`
                }
              />
              <CheckRow
                ok={booking.purpose.trim().length >= 20}
                label={
                  booking.purpose.trim().length >= 20
                    ? "Alasan reservasi terisi jelas"
                    : "Alasan reservasi kurang dari 20 karakter"
                }
              />
            </ul>

            {booking.status === "MENUNGGU" ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-xs text-muted">
                  Keputusan tercatat atas nama akun Anda dan dikirim ke email
                  pemohon.
                </p>
                <div className="mt-3">
                  <DecisionActions
                    booking={{
                      id: booking.id,
                      ref: booking.ref,
                      activity: booking.activity,
                      purpose: booking.purpose,
                      dateLabel: formatDateID(booking.date),
                      timeLabel: formatRange(booking.startMin, booking.endMin),
                      roomName: booking.room.name,
                      applicantName: booking.user.name,
                    }}
                  />
                </div>
              </div>
            ) : null}

            {booking.status === "DITOLAK" && booking.rejectionReason ? (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft p-3.5 text-sm text-danger">
                <AlertIcon size={17} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Alasan penolakan</p>
                  <p className="mt-0.5 leading-relaxed">{booking.rejectionReason}</p>
                </div>
              </div>
            ) : null}

            {booking.status === "DISETUJUI" && booking.staffNote ? (
              <div className="mt-5 rounded-xl border border-success/25 bg-success-soft p-3.5 text-sm text-success">
                <p className="font-semibold">Catatan admin</p>
                <p className="mt-0.5 leading-relaxed">{booking.staffNote}</p>
              </div>
            ) : null}

            {booking.status === "DIBATALKAN" ? (
              <div className="mt-5 rounded-xl border border-line bg-surface-2 p-3.5 text-sm">
                <p className="font-semibold text-ink">Dibatalkan</p>
                <p className="mt-0.5 text-muted">{booking.cancelReason}</p>
              </div>
            ) : null}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              Detail kegiatan
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info icon={<CalendarIcon size={16} />} label="Tanggal">
                {formatDateID(booking.date)}
              </Info>
              <Info icon={<ClockIcon size={16} />} label="Waktu">
                {formatRange(booking.startMin, booking.endMin)} WITA
              </Info>
              <Info icon={<DoorIcon size={16} />} label="Ruangan">
                {booking.room.name}
              </Info>
              <Info icon={<UsersIcon size={16} />} label="Peserta">
                {booking.participants} orang
              </Info>
              <Info icon={<BuildingIcon size={16} />} label="Lokasi">
                {booking.room.building}, {booking.room.floor}
              </Info>
              <Info icon={<ShieldIcon size={16} />} label="Kategori">
                {booking.room.category}
              </Info>
            </div>
            <div className="mt-4 rounded-xl border border-line bg-surface-2/50 p-3.5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">
                Alasan / keperluan
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-body">
                {booking.purpose}
              </p>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold text-ink">Audit status</h2>
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
                    <div>
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
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink">Data pemohon</h2>
            <p className="mt-1 text-[0.68rem] text-muted">
              Hanya untuk verifikasi. Jangan disebarkan.
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="text-[0.7rem] text-muted">Nama</dt>
                <dd className="font-medium text-ink">{booking.user.name}</dd>
              </div>
              <div>
                <dt className="text-[0.7rem] text-muted">Jenis</dt>
                <dd className="font-medium text-ink">
                  {TYPE_LABEL[booking.user.type]}
                </dd>
              </div>
              {booking.user.identity ? (
                <div>
                  <dt className="text-[0.7rem] text-muted">NIM/NIDN</dt>
                  <dd className="font-medium text-ink">{booking.user.identity}</dd>
                </div>
              ) : null}
              {booking.user.org ? (
                <div>
                  <dt className="text-[0.7rem] text-muted">Organisasi / unit</dt>
                  <dd className="font-medium text-ink">{booking.user.org}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[0.7rem] text-muted">Email</dt>
                <dd className="flex items-center gap-1.5 break-all font-medium text-ink">
                  <MailIcon size={13} className="shrink-0 text-muted" />
                  {booking.user.email}
                </dd>
              </div>
              <div>
                <dt className="text-[0.7rem] text-muted">WhatsApp</dt>
                <dd className="font-medium text-ink">
                  {booking.user.whatsapp ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          {canCancel ? (
            <div className="card p-4">
              <p className="text-sm font-semibold text-ink">Batalkan reservasi</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Alasan wajib diisi dan dikirim ke pemohon. Slot langsung dilepas.
              </p>
              <div className="mt-3">
                <CancelBookingButton
                  bookingId={booking.id}
                  label="Batalkan oleh admin"
                  requireReason
                  admin
                  variant="danger"
                />
              </div>
            </div>
          ) : null}

          <div className="card-flat p-4 text-xs leading-relaxed text-muted">
            <p className="flex items-center gap-1.5 font-medium text-body">
              <ShieldIcon size={13} /> Privasi data
            </p>
            <p className="mt-1">
              Data pemohon hanya digunakan untuk verifikasi pengajuan. Akses
              tercatat di audit sistem.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
        }`}
      >
        {ok ? <CheckIcon size={12} /> : <XIcon size={12} />}
      </span>
      <span className={ok ? "text-body" : "text-danger"}>{label}</span>
    </li>
  );
}

function Info({
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
