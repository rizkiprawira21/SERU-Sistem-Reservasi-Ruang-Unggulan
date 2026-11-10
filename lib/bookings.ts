import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { BookingStatus, Room } from "@prisma/client";
import { prisma } from "./prisma";
import { APP_CONFIG, HOLDING_STATUSES, STATUS_LABEL } from "./config";
import { AppError, ConflictError } from "./errors";
import { audit } from "./audit";
import {
  queueMail,
  deliverExternal,
  escapeForEmail,
  mailFooter,
} from "./mailer";
import {
  validateRoomSchedule,
  validateWindow,
  overlaps,
} from "./rules";
import {
  bookingHasStarted,
  formatRange,
  nowMinutesWITA,
  todayISO,
} from "./time";
import {
  getSuggestions,
  roomHoursForDate,
  slotSummary,
} from "./rooms";
import type { SessionUser } from "./auth";

export type CreateBookingInput = {
  roomId: string;
  date: string;
  startMin: number;
  endMin: number;
  activity: string;
  purpose: string;
  participants: number;
};

type Tx = Prisma.TransactionClient;

type MailRow = { to: string; subject: string; body: string };

function isUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isRaceError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2034") return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("ROOM_CONFLICT") ||
    message.includes("database is locked") ||
    message.includes("SQLITE_BUSY") ||
    message.includes("write conflict")
  );
}

function newRef(year: string): string {
  return `SERU-${year}-${randomInt(1000, 10000)}`;
}

async function findConflict(
  db: Tx,
  roomId: string,
  date: string,
  startMin: number,
  endMin: number,
  excludeBookingId?: string,
) {
  const booking = await db.booking.findFirst({
    where: {
      roomId,
      date,
      status: { in: [...HOLDING_STATUSES] },
      startMin: { lt: endMin },
      endMin: { gt: startMin },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { id: true, status: true },
  });
  if (booking) {
    return {
      kind: booking.status === "MENUNGGU" ? ("HELD" as const) : ("BOOKED" as const),
    };
  }
  const block = await db.roomBlock.findFirst({
    where: {
      roomId,
      date,
      startMin: { lt: endMin },
      endMin: { gt: startMin },
    },
    select: { id: true, reason: true },
  });
  if (block) return { kind: "BLOCKED" as const, reason: block.reason };
  return null;
}

async function conflictError(
  kind: "HELD" | "BOOKED" | "BLOCKED",
  date: string,
  startMin: number,
  endMin: number,
  roomId: string,
): Promise<ConflictError> {
  const suggestions = await getSuggestions(date, startMin, endMin, roomId);
  if (kind === "BLOCKED") {
    return new ConflictError(
      "ROOM_BLOCKED",
      "Ruangan ditutup untuk pemeliharaan atau jadwal kuliah pada waktu tersebut. Silakan pilih jadwal atau ruangan lain.",
      { suggestions },
    );
  }
  if (kind === "HELD") {
    return new ConflictError(
      "SLOT_HELD",
      "Slot sedang ditahan untuk pengajuan lain. Silakan pilih jadwal atau ruangan lain.",
      { suggestions },
    );
  }
  return new ConflictError(
    "ROOM_CONFLICT",
    "Ruangan tidak tersedia pada rentang waktu tersebut. Silakan pilih ruangan atau jadwal lain.",
    { suggestions },
  );
}

function mailBookingSummary(
  booking: {
    ref: string;
    date: string;
    startMin: number;
    endMin: number;
    activity: string;
    purpose: string;
    participants: number;
  },
  room: Room,
) {
  return [
    `Nomor referensi: ${booking.ref}`,
    `Ruangan: ${room.name} (${room.building}, ${room.floor})`,
    `Jadwal: ${slotSummary(booking.date, booking.startMin, booking.endMin)}`,
    `Kegiatan: ${booking.activity}`,
    `Jumlah peserta: ${booking.participants} orang`,
    `Keperluan: ${booking.purpose}`,
    `Jam operasional: ${roomHoursForDate(room, booking.date)?.label ?? "-"}`,
  ].join("\n");
}

export async function createBooking(
  input: CreateBookingInput,
  user: SessionUser,
) {
  if (user.role !== "PEMOHON") {
    throw new AppError(
      "FORBIDDEN",
      "Akun admin tidak dapat membuat pengajuan melalui alur pemohon.",
      403,
    );
  }

  const room = await prisma.room.findUnique({ where: { id: input.roomId } });
  if (!room || !room.active) {
    throw new AppError("ROOM_NOT_FOUND", "Ruangan tidak ditemukan.", 404);
  }

  const windowIssue = validateWindow(input.date);
  if (windowIssue) {
    throw new AppError(windowIssue.code, windowIssue.message, 422, {
      field: windowIssue.field,
    });
  }

  const scheduleIssue = validateRoomSchedule(
    room,
    input.date,
    input.startMin,
    input.endMin,
  );
  if (scheduleIssue) {
    throw new AppError(scheduleIssue.code, scheduleIssue.message, 422, {
      field: scheduleIssue.field,
    });
  }

  const activity = String(input.activity ?? "").trim();
  const purpose = String(input.purpose ?? "").trim();
  const participants = Number(input.participants);

  if (activity.length < APP_CONFIG.minActivityLength) {
    throw new AppError(
      "INVALID_ACTIVITY",
      "Nama kegiatan wajib diisi minimal 3 karakter.",
      422,
      { field: "activity" },
    );
  }
  if (activity.length > APP_CONFIG.maxActivityLength) {
    throw new AppError(
      "INVALID_ACTIVITY",
      `Nama kegiatan maksimal ${APP_CONFIG.maxActivityLength} karakter.`,
      422,
      { field: "activity" },
    );
  }
  if (purpose.length < APP_CONFIG.minPurposeLength) {
    throw new AppError(
      "INVALID_PURPOSE",
      `Alasan reservasi wajib diisi minimal ${APP_CONFIG.minPurposeLength} karakter.`,
      422,
      { field: "purpose" },
    );
  }
  if (purpose.length > APP_CONFIG.maxPurposeLength) {
    throw new AppError(
      "INVALID_PURPOSE",
      `Alasan reservasi maksimal ${APP_CONFIG.maxPurposeLength} karakter.`,
      422,
      { field: "purpose" },
    );
  }
  if (!Number.isInteger(participants) || participants < 1) {
    throw new AppError(
      "INVALID_PARTICIPANTS",
      "Jumlah peserta wajib diisi minimal 1 orang.",
      422,
      { field: "participants" },
    );
  }
  if (participants > room.capacity) {
    throw new AppError(
      "CAPACITY_EXCEEDED",
      `Jumlah peserta melebihi kapasitas ${room.name} (${room.capacity} orang).`,
      422,
      { field: "participants" },
    );
  }

  const year = input.date.slice(0, 4);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const mails: MailRow[] = [];
    try {
      const booking = await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${room.id}:${input.date}`}, 0))`;
          const conflict = await findConflict(
            tx,
            room.id,
            input.date,
            input.startMin,
            input.endMin,
          );
          if (conflict) {
            throw await conflictError(
              conflict.kind,
              input.date,
              input.startMin,
              input.endMin,
              room.id,
            );
          }

          const created = await tx.booking.create({
            data: {
              ref: newRef(year),
              userId: user.id,
              roomId: room.id,
              date: input.date,
              startMin: input.startMin,
              endMin: input.endMin,
              activity,
              purpose,
              participants,
              status: "MENUNGGU",
            },
          });

          await tx.statusHistory.create({
            data: {
              bookingId: created.id,
              fromStatus: null,
              toStatus: "MENUNGGU",
              note: "Pengajuan dikirim dan slot ditahan sementara.",
              actorId: user.id,
            },
          });

          await audit(tx, {
            actorId: user.id,
            action: "BOOKING_CREATED",
            entity: "Booking",
            entityId: created.id,
            detail: `${created.ref} · ${room.name} · ${input.date} ${formatRange(
              input.startMin,
              input.endMin,
            )}`,
          });

          const mail = await queueMail(tx, {
            to: user.email,
            subject: `[SERU] Pengajuan ${created.ref} diterima`,
            body: [
              `Halo ${user.name},`,
              "",
              "Pengajuan reservasi ruangan Anda sudah kami terima dan slot ruangan ditahan sementara sampai admin memutuskan.",
              "",
              mailBookingSummary(created, room),
              "",
              "Pantau status pengajuan di halaman Riwayat SERU.",
              mailFooter(),
            ].join("\n"),
            kind: "BOOKING_CREATED",
            bookingId: created.id,
          });
          mails.push({ to: mail.to, subject: mail.subject, body: mail.body });

          return created;
        },
        { maxWait: 8000, timeout: 15000 },
      );

      await Promise.all(mails.map((m) => deliverExternal(m)));
      return booking;
    } catch (error) {
      if (isUniqueError(error)) continue;
      if (error instanceof ConflictError || error instanceof AppError) throw error;
      if (isRaceError(error)) {
        throw await conflictError(
          "HELD",
          input.date,
          input.startMin,
          input.endMin,
          room.id,
        );
      }
      throw error;
    }
  }

  throw new AppError(
    "REF_GENERATION_FAILED",
    "Gagal membuat nomor referensi. Silakan coba lagi.",
    500,
  );
}

export async function decideBooking(
  bookingId: string,
  admin: SessionUser,
  action: "SETUJUI" | "TOLAK",
  note?: string,
) {
  if (admin.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Hanya admin yang dapat memutuskan.", 403);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true, user: true },
  });
  if (!booking) throw new AppError("NOT_FOUND", "Pengajuan tidak ditemukan.", 404);
  if (booking.status !== "MENUNGGU") {
    throw new AppError(
      "INVALID_STATUS",
      `Pengajuan sudah berstatus ${STATUS_LABEL[booking.status]}.`,
      409,
    );
  }
  if (bookingHasStarted(booking.date, booking.startMin)) {
    throw new AppError(
      "ACTIVITY_STARTED",
      "Waktu kegiatan sudah lewat atau sedang berlangsung.",
      422,
    );
  }

  const trimmedNote = String(note ?? "").trim();
  if (action === "TOLAK" && trimmedNote.length < APP_CONFIG.minRejectionReasonLength) {
    throw new AppError(
      "REASON_REQUIRED",
      "Alasan penolakan wajib diisi minimal 5 karakter.",
      422,
      { field: "note" },
    );
  }

  const nextStatus: BookingStatus = action === "SETUJUI" ? "DISETUJUI" : "DITOLAK";
  const mails: MailRow[] = [];

  let updated;
  try {
    updated = await prisma.$transaction(
    async (tx) => {
      if (action === "SETUJUI") {
        const scheduleIssue = validateRoomSchedule(
          booking.room,
          booking.date,
          booking.startMin,
          booking.endMin,
        );
        if (scheduleIssue) {
          throw new AppError(
            scheduleIssue.code,
            `Tidak dapat disetujui: ${scheduleIssue.message}`,
            409,
          );
        }
        const conflict = await findConflict(
          tx,
          booking.roomId,
          booking.date,
          booking.startMin,
          booking.endMin,
          booking.id,
        );
        if (conflict) {
          throw await conflictError(
            conflict.kind,
            booking.date,
            booking.startMin,
            booking.endMin,
            booking.roomId,
          );
        }
      }

      const result = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: nextStatus,
          staffNote: trimmedNote || null,
          rejectionReason: action === "TOLAK" ? trimmedNote : null,
          decidedById: admin.id,
          decidedAt: new Date(),
        },
      });

      await tx.statusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: "MENUNGGU",
          toStatus: nextStatus,
          note:
            action === "TOLAK"
              ? `Ditolak: ${trimmedNote}`
              : trimmedNote || "Disetujui oleh admin.",
          actorId: admin.id,
        },
      });

      await audit(tx, {
        actorId: admin.id,
        action: action === "SETUJUI" ? "BOOKING_APPROVED" : "BOOKING_REJECTED",
        entity: "Booking",
        entityId: booking.id,
        detail: `${booking.ref}${trimmedNote ? ` · ${trimmedNote}` : ""}`,
      });

      const subject =
        action === "SETUJUI"
          ? `[SERU] Pengajuan ${booking.ref} disetujui`
          : `[SERU] Pengajuan ${booking.ref} ditolak`;
      const intro =
        action === "SETUJUI"
          ? "Kabar baik! Pengajuan reservasi ruangan Anda telah disetujui. Ruangan sudah dikunci untuk kegiatan Anda."
          : "Mohon maaf, pengajuan reservasi ruangan Anda belum dapat kami setujui.";

      const mail = await queueMail(tx, {
        to: booking.user.email,
        subject,
        body: [
          `Halo ${booking.user.name},`,
          "",
          intro,
          "",
          mailBookingSummary(booking, booking.room),
          ...(action === "TOLAK"
            ? ["", `Alasan penolakan: ${escapeForEmail(trimmedNote)}`]
            : trimmedNote
              ? ["", `Catatan admin: ${escapeForEmail(trimmedNote)}`]
              : []),
          "",
          action === "TOLAK"
            ? "Silakan ajukan jadwal lain melalui SERU."
            : "Silakan hadir sesuai jadwal dan jaga kondisi ruangan.",
          mailFooter(),
        ].join("\n"),
        kind: action === "SETUJUI" ? "BOOKING_APPROVED" : "BOOKING_REJECTED",
        bookingId: booking.id,
      });
      mails.push({ to: mail.to, subject: mail.subject, body: mail.body });

      return result;
    },
    { maxWait: 8000, timeout: 15000 },
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isRaceError(error)) {
      throw new ConflictError(
        "ROOM_CONFLICT",
        "Slot berubah saat keputusan disimpan. Periksa kembali jadwal sebelum menyetujui.",
      );
    }
    throw error;
  }

  await Promise.all(mails.map((m) => deliverExternal(m)));
  return updated;
}

export async function cancelBooking(
  bookingId: string,
  actor: SessionUser,
  reason?: string,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true, user: true },
  });
  if (!booking) throw new AppError("NOT_FOUND", "Pengajuan tidak ditemukan.", 404);

  const isOwner = booking.userId === actor.id;
  const isAdmin = actor.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    throw new AppError("FORBIDDEN", "Anda tidak memiliki akses ke pengajuan ini.", 403);
  }
  if (booking.status !== "MENUNGGU" && booking.status !== "DISETUJUI") {
    throw new AppError(
      "INVALID_STATUS",
      `Pengajuan berstatus ${STATUS_LABEL[booking.status]} tidak dapat dibatalkan.`,
      409,
    );
  }
  if (bookingHasStarted(booking.date, booking.startMin)) {
    throw new AppError(
      "ACTIVITY_STARTED",
      "Waktu mulai kegiatan sudah lewat. Hubungi admin untuk perubahan.",
      422,
    );
  }

  const trimmedReason = String(reason ?? "").trim();
  if (isAdmin && trimmedReason.length < APP_CONFIG.minRejectionReasonLength) {
    throw new AppError(
      "REASON_REQUIRED",
      "Alasan pembatalan wajib diisi minimal 5 karakter.",
      422,
      { field: "reason" },
    );
  }

  const note = isAdmin
    ? `Dibatalkan admin: ${trimmedReason}`
    : `Dibatalkan pemohon${trimmedReason ? `: ${trimmedReason}` : ""}.`;

  const mails: MailRow[] = [];
  const updated = await prisma.$transaction(
    async (tx) => {
      const result = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "DIBATALKAN",
          cancelledAt: new Date(),
          cancelReason: trimmedReason || "Dibatalkan oleh pemohon.",
        },
      });

      await tx.statusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: "DIBATALKAN",
          note,
          actorId: actor.id,
        },
      });

      await audit(tx, {
        actorId: actor.id,
        action: isAdmin ? "BOOKING_CANCELLED_BY_ADMIN" : "BOOKING_CANCELLED",
        entity: "Booking",
        entityId: booking.id,
        detail: `${booking.ref} · ${note}`,
      });

      if (isAdmin) {
        const mail = await queueMail(tx, {
          to: booking.user.email,
          subject: `[SERU] Reservasi ${booking.ref} dibatalkan admin`,
          body: [
            `Halo ${booking.user.name},`,
            "",
            "Reservasi ruangan berikut telah dibatalkan oleh admin.",
            "",
            mailBookingSummary(booking, booking.room),
            "",
            `Alasan: ${escapeForEmail(trimmedReason)}`,
            "",
            "Silakan ajukan jadwal baru melalui SERU bila diperlukan.",
            mailFooter(),
          ].join("\n"),
          kind: "BOOKING_CANCELLED_BY_ADMIN",
          bookingId: booking.id,
        });
        mails.push({ to: mail.to, subject: mail.subject, body: mail.body });
      }

      return result;
    },
    { maxWait: 8000, timeout: 15000 },
  );

  await Promise.all(mails.map((m) => deliverExternal(m)));
  return updated;
}

export type BookingWithRoom = Prisma.BookingGetPayload<{ include: { room: true } }>;

export function effectiveStatus(
  booking: { status: BookingStatus; date: string; startMin: number; endMin: number },
  today = todayISO(),
): { key: string; label: string } {
  if (booking.status === "DISETUJUI") {
    if (booking.date < today) return { key: "SELESAI", label: "Selesai" };
    if (booking.date === today && booking.endMin <= nowMinutesWITA()) {
      return { key: "SELESAI", label: "Selesai" };
    }
  }
  return {
    key: booking.status,
    label: STATUS_LABEL[booking.status] ?? booking.status,
  };
}

export function bookingOverlapCheck(
  a: { startMin: number; endMin: number },
  b: { startMin: number; endMin: number },
) {
  return overlaps(a.startMin, a.endMin, b.startMin, b.endMin);
}
