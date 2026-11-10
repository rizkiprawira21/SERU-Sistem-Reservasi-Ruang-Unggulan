import { APP_CONFIG } from "./config";

const WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const WEEKDAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateISO(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function parseDateUTC(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toDateISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, n: number): string {
  const d = parseDateUTC(date);
  d.setUTCDate(d.getUTCDate() + n);
  return toDateISO(d);
}

export function dayIndex(date: string): number {
  return parseDateUTC(date).getUTCDay();
}

export function dayName(date: string): string {
  return WEEKDAYS[dayIndex(date)];
}

export function dayNameShort(date: string): string {
  return WEEKDAYS_SHORT[dayIndex(date)];
}

export function formatDateID(date: string): string {
  const d = parseDateUTC(date);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDateShortID(date: string): string {
  const d = parseDateUTC(date);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

/** Tanggal hari ini di WITA, format YYYY-MM-DD. */
export function todayISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

/** Jam dan menit sekarang di WITA. */
export function nowMinutesWITA(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_CONFIG.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

export function toTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 09.00 — format jam Indonesia. */
export function formatTimeID(min: number): string {
  return toTime(min).replace(":", ".");
}

export function formatRange(startMin: number, endMin: number): string {
  return `${formatTimeID(startMin)}–${formatTimeID(endMin)}`;
}

export function durationLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} jam ${m} menit`;
  if (h) return `${h} jam`;
  return `${m} menit`;
}

export function windowDates(today = todayISO()) {
  return {
    today,
    min: addDays(today, APP_CONFIG.minLeadDays),
    max: addDays(today, APP_CONFIG.maxAdvanceDays),
  };
}

/** Apakah waktu mulai reservasi sudah lewat (dibanding sekarang WITA)? */
export function bookingHasStarted(
  date: string,
  startMin: number,
  today = todayISO(),
  nowMin = nowMinutesWITA(),
): boolean {
  if (date < today) return true;
  if (date > today) return false;
  return startMin <= nowMin;
}

/** Daftar 7 hari untuk pemilih tanggal mingguan. */
export function weekDays(date: string): string[] {
  const d = parseDateUTC(date);
  const start = new Date(d);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(toDateISO(start), i));
}

/** Awal bulan (tanggal 1) dan jumlah hari pada bulan dari sebuah tanggal. */
export function monthGrid(date: string): { start: string; days: number } {
  const d = parseDateUTC(date);
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  const days = Math.round((next.getTime() - first.getTime()) / 86400000);
  return { start: toDateISO(first), days };
}

export { WEEKDAYS, WEEKDAYS_SHORT, MONTHS };

/** Tanggal + jam dalam WITA untuk timestamp sistem. */
export function formatDateTimeWITA(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_CONFIG.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
