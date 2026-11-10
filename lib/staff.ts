import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { effectiveStatus } from "./bookings";
import { formatDateID, formatDateTimeWITA, formatRange, todayISO, toTime } from "./time";
import { STATUS_LABEL, TYPE_LABEL } from "./config";

export type AdminBooking = {
  id: string;
  ref: string;
  status: BookingStatus;
  statusLabel: string;
  effectiveStatus: string;
  date: string;
  dateLabel: string;
  startMin: number;
  endMin: number;
  timeLabel: string;
  activity: string;
  purpose: string;
  participants: number;
  createdAt: string;
  createdAtLabel: string;
  staffNote: string | null;
  rejectionReason: string | null;
  cancelReason: string | null;
  decidedAt: string | null;
  isUrgent: boolean;
  hoursUntilStart: number | null;
  room: {
    id: string;
    name: string;
    building: string;
    floor: string;
    capacity: number;
    category: string;
  };
  applicant: {
    name: string;
    email: string;
    identity: string | null;
    type: string;
    typeLabel: string;
    org: string | null;
    whatsapp: string | null;
  };
};

type BookingForAdmin = Prisma.BookingGetPayload<{
  include: { room: true; user: true };
}>;

export function serializeAdminBooking(booking: BookingForAdmin): AdminBooking {
  const start = new Date(`${booking.date}T${toTime(booking.startMin)}:00+08:00`);
  const hoursUntilStart = (start.getTime() - Date.now()) / 3600000;
  const effective = effectiveStatus(booking);
  return {
    id: booking.id,
    ref: booking.ref,
    status: booking.status,
    statusLabel: STATUS_LABEL[booking.status] ?? booking.status,
    effectiveStatus: effective.label,
    date: booking.date,
    dateLabel: formatDateID(booking.date),
    startMin: booking.startMin,
    endMin: booking.endMin,
    timeLabel: formatRange(booking.startMin, booking.endMin),
    activity: booking.activity,
    purpose: booking.purpose,
    participants: booking.participants,
    createdAt: booking.createdAt.toISOString(),
    createdAtLabel: formatDateTimeWITA(booking.createdAt),
    staffNote: booking.staffNote,
    rejectionReason: booking.rejectionReason,
    cancelReason: booking.cancelReason,
    decidedAt: booking.decidedAt ? booking.decidedAt.toISOString() : null,
    isUrgent:
      booking.status === "MENUNGGU" &&
      hoursUntilStart >= 0 &&
      hoursUntilStart <= 24,
    hoursUntilStart: Number.isFinite(hoursUntilStart)
      ? Math.round(hoursUntilStart * 10) / 10
      : null,
    room: {
      id: booking.room.id,
      name: booking.room.name,
      building: booking.room.building,
      floor: booking.room.floor,
      capacity: booking.room.capacity,
      category: booking.room.category,
    },
    applicant: {
      name: booking.user.name,
      email: booking.user.email,
      identity: booking.user.identity,
      type: booking.user.type,
      typeLabel: TYPE_LABEL[booking.user.type] ?? booking.user.type,
      org: booking.user.org,
      whatsapp: booking.user.whatsapp,
    },
  };
}

export type StaffStats = {
  menunggu: number;
  disetujuiHariIni: number;
  ditolakHariIni: number;
  kegiatanHariIni: number;
};

function witaRange(date: string) {
  return {
    start: new Date(`${date}T00:00:00+08:00`),
    end: new Date(`${date}T23:59:59.999+08:00`),
  };
}

export async function getStaffStats(today = todayISO()): Promise<StaffStats> {
  const range = witaRange(today);
  const [menunggu, disetujuiHariIni, ditolakHariIni, kegiatanHariIni] =
    await Promise.all([
      prisma.booking.count({ where: { status: "MENUNGGU" } }),
      prisma.booking.count({
        where: {
          status: "DISETUJUI",
          decidedAt: { gte: range.start, lte: range.end },
        },
      }),
      prisma.booking.count({
        where: {
          status: "DITOLAK",
          decidedAt: { gte: range.start, lte: range.end },
        },
      }),
      prisma.booking.count({
        where: {
          date: today,
          status: { in: ["DISETUJUI", "MENUNGGU"] },
        },
      }),
    ]);
  return { menunggu, disetujuiHariIni, ditolakHariIni, kegiatanHariIni };
}

export async function getStaffBookings(options: {
  status?: string;
  date?: string;
  q?: string;
  limit?: number;
}): Promise<AdminBooking[]> {
  const where: Prisma.BookingWhereInput = {};
  if (options.status && options.status !== "SEMUA") {
    where.status = options.status as BookingStatus;
  }
  if (options.date) where.date = options.date;

  const bookings = await prisma.booking.findMany({
    where,
    include: { room: true, user: true },
    orderBy: [{ date: "asc" }, { startMin: "asc" }, { createdAt: "asc" }],
    take: Math.min(options.limit ?? 300, 500),
  });

  const q = options.q?.trim().toLowerCase();
  const filtered = q
    ? bookings.filter((booking) =>
        [
          booking.ref,
          booking.activity,
          booking.user.name,
          booking.user.email,
          booking.room.name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : bookings;

  return filtered.map(serializeAdminBooking);
}

export async function getTodayBookings(
  today = todayISO(),
): Promise<AdminBooking[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      date: today,
      status: { in: ["DISETUJUI", "MENUNGGU"] },
    },
    include: { room: true, user: true },
    orderBy: { startMin: "asc" },
  });
  return bookings.map(serializeAdminBooking);
}

export type StaffDashboard = {
  bookings: AdminBooking[];
  stats: StaffStats;
  todayBookings: AdminBooking[];
  today: string;
};

export async function getStaffDashboard(options: {
  status?: string;
  date?: string;
  q?: string;
}): Promise<StaffDashboard> {
  const today = todayISO();
  const [bookings, stats, todayBookings] = await Promise.all([
    getStaffBookings(options),
    getStaffStats(today),
    getTodayBookings(today),
  ]);
  return { bookings, stats, todayBookings, today };
}
