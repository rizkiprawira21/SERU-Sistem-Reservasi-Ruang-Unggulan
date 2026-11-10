import type { Room } from "@prisma/client";
import { prisma } from "./prisma";
import { APP_CONFIG, HOLDING_STATUSES } from "./config";
import {
  allowedDayNames,
  getDayHours,
  parseHours,
  roomHoursSummary,
  roomSpecialNote,
  validateRoomSchedule,
  type HoursMap,
} from "./rules";
import { addDays, formatDateID, formatRange, windowDates } from "./time";

export type RoomWithRules = Room;

export type BusyRange = { startMin: number; endMin: number; kind: "booking" | "block" };

export type AvailabilityStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "HELD"
  | "BLOCKED"
  | "RULE";

export type AvailabilityRoom = {
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
  active: boolean;
  hours: HoursMap;
  hoursSummary: string;
  allowedDays: string;
  specialNote: string | null;
  status: AvailabilityStatus;
  label: string;
  reason: string | null;
  busy: BusyRange[];
};

export function facilitiesOf(room: { facilities: string }): string[] {
  try {
    const parsed = JSON.parse(room.facilities);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toRoomDTO(room: Room): AvailabilityRoom {
  return {
    id: room.id,
    slug: room.slug,
    name: room.name,
    category: room.category,
    description: room.description,
    imageUrl: room.imageUrl,
    building: room.building,
    floor: room.floor,
    capacity: room.capacity,
    facilities: facilitiesOf(room),
    maxDurationMin: room.maxDurationMin,
    active: room.active,
    hours: parseHours(room.hoursJson),
    hoursSummary: roomHoursSummary(room),
    allowedDays: allowedDayNames(room),
    specialNote: roomSpecialNote(room),
    status: "AVAILABLE",
    label: "Tersedia",
    reason: null,
    busy: [],
  };
}

export async function getActiveRooms(): Promise<Room[]> {
  return prisma.room.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAllRooms(): Promise<Room[]> {
  return prisma.room.findMany({ orderBy: { createdAt: "asc" } });
}

/**
 * Ketersediaan semua ruangan aktif pada satu slot.
 * Tidak membocorkan identitas pemohon lain — hanya rentang jam terpakai.
 */
export async function getAvailability(
  date: string,
  startMin: number,
  endMin: number,
): Promise<AvailabilityRoom[]> {
  const rooms = await getActiveRooms();
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        date,
        status: { in: [...HOLDING_STATUSES] },
        startMin: { lt: endMin },
        endMin: { gt: startMin },
      },
      select: { roomId: true, startMin: true, endMin: true, status: true },
    }),
    prisma.roomBlock.findMany({
      where: { date, startMin: { lt: endMin }, endMin: { gt: startMin } },
      select: { roomId: true, startMin: true, endMin: true, reason: true },
    }),
  ]);

  return rooms.map((room) => {
    const dto = toRoomDTO(room);
    const roomBookings = bookings.filter((b) => b.roomId === room.id);
    const roomBlocks = blocks.filter((b) => b.roomId === room.id);
    dto.busy = [
      ...roomBookings.map((b) => ({
        startMin: b.startMin,
        endMin: b.endMin,
        kind: "booking" as const,
      })),
      ...roomBlocks.map((b) => ({
        startMin: b.startMin,
        endMin: b.endMin,
        kind: "block" as const,
      })),
    ].sort((a, b) => a.startMin - b.startMin);

    const ruleIssue = validateRoomSchedule(room, date, startMin, endMin);
    if (ruleIssue) {
      dto.status = "RULE";
      dto.label = "Tidak dapat dipinjam pada hari/jam ini";
      dto.reason = ruleIssue.message;
      return dto;
    }

    if (roomBlocks.length > 0) {
      dto.status = "BLOCKED";
      dto.label = "Diblokir untuk kegiatan kampus";
      dto.reason = `${roomBlocks[0].reason} · ${formatRange(
        roomBlocks[0].startMin,
        roomBlocks[0].endMin,
      )}`;
      return dto;
    }

    if (roomBookings.length > 0) {
      const held = roomBookings.some((b) => b.status === "MENUNGGU");
      dto.status = held ? "HELD" : "BOOKED";
      dto.label = held
        ? "Sedang ditahan untuk pengajuan lain"
        : "Tidak tersedia pada waktu ini";
      dto.reason = roomBookings
        .map((b) => `Dipakai ${formatRange(b.startMin, b.endMin)}`)
        .join(", ");
      return dto;
    }

    dto.status = "AVAILABLE";
    dto.label = "Tersedia";
    dto.reason = null;
    return dto;
  });
}

export type SuggestionResult = {
  alternativeRooms: { id: string; name: string; building: string }[];
  alternativeSlots: {
    date: string;
    dateLabel: string;
    startMin: number;
    endMin: number;
    roomName: string;
  }[];
};

async function isRoomSlotFree(
  roomId: string,
  date: string,
  startMin: number,
  endMin: number,
  excludeBookingId?: string,
): Promise<boolean> {
  const [booking, block] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        roomId,
        date,
        status: { in: [...HOLDING_STATUSES] },
        startMin: { lt: endMin },
        endMin: { gt: startMin },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { id: true },
    }),
    prisma.roomBlock.findFirst({
      where: {
        roomId,
        date,
        startMin: { lt: endMin },
        endMin: { gt: startMin },
      },
      select: { id: true },
    }),
  ]);
  return !booking && !block;
}

/** Saran ruangan lain + jam lain saat bentrok. */
export async function getSuggestions(
  date: string,
  startMin: number,
  endMin: number,
  preferredRoomId?: string,
): Promise<SuggestionResult> {
  const duration = endMin - startMin;
  const availability = await getAvailability(date, startMin, endMin);
  const alternativeRooms = availability
    .filter((r) => r.status === "AVAILABLE")
    .slice(0, 4)
    .map((r) => ({ id: r.id, name: r.name, building: r.building }));

  const alternativeSlots: SuggestionResult["alternativeSlots"] = [];
  if (!preferredRoomId) {
    return { alternativeRooms, alternativeSlots };
  }

  const room = await prisma.room.findUnique({ where: { id: preferredRoomId } });
  if (!room) return { alternativeRooms, alternativeSlots };

  const candidateTimes = new Set<number>();
  for (let delta = 30; delta <= 180; delta += 30) {
    candidateTimes.add(startMin - delta);
    candidateTimes.add(startMin + delta);
  }

  const sameDay: { start: number; end: number; distance: number }[] = [];
  for (const start of candidateTimes) {
    const end = start + duration;
    if (start < 0) continue;
    if (validateRoomSchedule(room, date, start, end)) continue;
    if (await isRoomSlotFree(room.id, date, start, end)) {
      sameDay.push({ start, end, distance: Math.abs(start - startMin) });
    }
  }
  sameDay.sort((a, b) => a.distance - b.distance);
  for (const slot of sameDay.slice(0, 3)) {
    alternativeSlots.push({
      date,
      dateLabel: formatDateID(date),
      startMin: slot.start,
      endMin: slot.end,
      roomName: room.name,
    });
  }

  const maxDate = windowDates().max;
  for (let i = 1; i <= 3 && alternativeSlots.length < 5; i += 1) {
    const nextDate = addDays(date, i);
    if (nextDate > maxDate) break;
    if (validateRoomSchedule(room, nextDate, startMin, endMin)) continue;
    if (await isRoomSlotFree(room.id, nextDate, startMin, endMin)) {
      alternativeSlots.push({
        date: nextDate,
        dateLabel: formatDateID(nextDate),
        startMin,
        endMin,
        roomName: room.name,
      });
    }
  }

  return { alternativeRooms, alternativeSlots };
}

/** Ringkasan slot untuk email. */
export function slotSummary(date: string, startMin: number, endMin: number) {
  return `${formatDateID(date)}, ${formatRange(startMin, endMin)} ${APP_CONFIG.timezoneLabel}`;
}

export function roomHoursForDate(room: Room, date: string) {
  const hours = getDayHours(room, date);
  if (!hours) return null;
  return { ...hours, label: formatRange(hours.open, hours.close) };
}
