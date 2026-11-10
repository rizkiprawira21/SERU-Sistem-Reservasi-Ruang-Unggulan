import { APP_CONFIG } from "./config";
import {
  dayName,
  formatRange,
  formatTimeID,
  isValidDateISO,
  toTime,
  windowDates,
} from "./time";

export type DayHours = { open: number; close: number };

export type HoursMap = Record<string, DayHours | null>;

export type RoomRuleShape = {
  name: string;
  slug: string;
  hoursJson: string;
  maxDurationMin: number;
  capacity: number;
  active: boolean;
};

export function parseHours(hoursJson: string): HoursMap {
  try {
    const parsed = JSON.parse(hoursJson);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getDayHours(room: RoomRuleShape, date: string): DayHours | null {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  const map = parseHours(room.hoursJson);
  const value = map[String(d)];
  if (value && typeof value.open === "number" && typeof value.close === "number") {
    return value;
  }
  return null;
}

export function allowedDayNames(room: RoomRuleShape): string {
  const map = parseHours(room.hoursJson);
  const names = Object.keys(map)
    .filter((k) => map[k])
    .map(Number)
    .sort((a, b) => a - b)
    .map((d) => dayName(nextDateForDay(d)));
  if (names.length === 7) return "setiap hari";
  if (names.length === 2 && names.includes("Sabtu") && names.includes("Minggu")) {
    return "Sabtu dan Minggu";
  }
  return names.join(", ");
}

/** Tanggal contoh dengan hari tertentu, hanya untuk label. */
function nextDateForDay(day: number): string {
  const base = "2026-01-04"; // Minggu
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day);
  return d.toISOString().slice(0, 10);
}

export function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export type RuleViolation = { code: string; message: string; field?: string };

/** Validasi jendela pengajuan (H-2 s.d. 30 hari). */
export function validateWindow(
  date: string,
  today?: string,
): RuleViolation | null {
  if (!isValidDateISO(date)) {
    return { code: "INVALID_DATE", message: "Tanggal tidak valid.", field: "date" };
  }
  const w = windowDates(today);
  if (date < w.min) {
    return {
      code: "TOO_SOON",
      message: `Pengajuan paling cepat ${APP_CONFIG.minLeadDays} hari sebelum kegiatan (mulai ${w.min}).`,
      field: "date",
    };
  }
  if (date > w.max) {
    return {
      code: "TOO_FAR",
      message: `Pengajuan paling lambat ${APP_CONFIG.maxAdvanceDays} hari ke depan (sampai ${w.max}).`,
      field: "date",
    };
  }
  return null;
}

/** Validasi aturan ruangan: hari, jam operasional, durasi, urutan jam. */
export function validateRoomSchedule(
  room: RoomRuleShape,
  date: string,
  startMin: number,
  endMin: number,
): RuleViolation | null {
  if (!isValidDateISO(date)) {
    return { code: "INVALID_DATE", message: "Tanggal tidak valid.", field: "date" };
  }
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) {
    return { code: "INVALID_TIME", message: "Jam tidak valid.", field: "start" };
  }
  if (endMin <= startMin) {
    return {
      code: "INVALID_RANGE",
      message: "Jam selesai harus lebih akhir daripada jam mulai.",
      field: "end",
    };
  }
  const duration = endMin - startMin;
  if (duration < APP_CONFIG.minDurationMin) {
    return {
      code: "TOO_SHORT",
      message: `Durasi minimum ${APP_CONFIG.minDurationMin / 60} jam.`,
      field: "end",
    };
  }

  const hours = getDayHours(room, date);
  if (!hours) {
    return {
      code: "DAY_NOT_ALLOWED",
      message: `${room.name} tidak dapat dipinjam pada hari ${dayName(date)}.`,
      field: "date",
    };
  }

  if (startMin < hours.open || endMin > hours.close) {
    if (room.slug === "aula" && date && new Date(`${date}T00:00:00Z`).getUTCDay() === 6) {
      return {
        code: "HALL_SATURDAY_LIMIT",
        message: `Aula pada hari Sabtu harus selesai paling lambat pukul ${formatTimeID(hours.close)}.`,
        field: "end",
      };
    }
    const open = formatTimeID(hours.open);
    const close = formatTimeID(hours.close);
    return {
      code: "OUTSIDE_HOURS",
      message:
        endMin > hours.close
          ? `Jam penggunaan ${room.name} berakhir pukul ${close}.`
          : `Jam penggunaan ${room.name} dimulai pukul ${open}.`,
      field: endMin > hours.close ? "end" : "start",
    };
  }

  if (duration > room.maxDurationMin) {
    return {
      code: "TOO_LONG",
      message: `Durasi maksimum untuk ${room.name} adalah ${
        room.maxDurationMin / 60
      } jam.`,
      field: "end",
    };
  }

  return null;
}

export function roomHoursSummary(room: RoomRuleShape): string {
  const map = parseHours(room.hoursJson);
  const unique = new Set<string>();
  for (const key of Object.keys(map)) {
    const h = map[key];
    if (h) unique.add(`${formatTimeID(h.open)}–${formatTimeID(h.close)}`);
  }
  return Array.from(unique).join(" · ") || "Tidak ada jam";
}

export function roomSpecialNote(room: RoomRuleShape): string | null {
  if (room.slug === "aula") {
    return "Sabtu tutup pukul 14.00, Minggu tidak tersedia.";
  }
  const map = parseHours(room.hoursJson);
  const keys = Object.keys(map).filter((k) => map[k]).map(Number);
  if (keys.length === 2 && keys.includes(0) && keys.includes(6)) {
    return "Hanya dapat dipinjam Sabtu dan Minggu.";
  }
  return null;
}

export function busyLabel(startMin: number, endMin: number): string {
  return formatRange(startMin, endMin);
}

export function isTimeOnGrid(min: number): boolean {
  return min % 30 === 0;
}

export function sanitizeTimeInput(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return h * 60 + m;
  }
  return null;
}

export { toTime };
