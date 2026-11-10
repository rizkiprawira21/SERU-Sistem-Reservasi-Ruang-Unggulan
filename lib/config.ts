/**
 * Konfigurasi global SERU.
 * Nilai dapat diubah tanpa menyentuh alur UI. Lihat ASSUMPTIONS.md.
 */
export const APP_CONFIG = {
  appName: "SERU",
  appFullName: "Sistem Reservasi Ruang Unggulan IDB Bali",
  timezone: "Asia/Makassar",
  timezoneLabel: "WITA",

  /** Pengajuan paling cepat H-2. */
  minLeadDays: Number(process.env.SERU_MIN_LEAD_DAYS ?? 2),
  /** Pengajuan paling lambat 30 hari ke depan. */
  maxAdvanceDays: Number(process.env.SERU_MAX_ADVANCE_DAYS ?? 30),

  /** Durasi minimum per pengajuan (menit). */
  minDurationMin: 60,
  /** Durasi maksimum default bila ruangan tidak menentukan (menit). */
  defaultMaxDurationMin: 240,
  /** Jam operasional default (menit sejak 00.00 WITA). */
  dayOpenMin: 420, // 07.00
  dayCloseMin: 1260, // 21.00

  minPurposeLength: 20,
  maxPurposeLength: 500,
  minActivityLength: 3,
  maxActivityLength: 120,
  minRejectionReasonLength: 5,

  sessionDays: 7,
  loginMaxAttempts: 8,
  loginWindowMs: 10 * 60 * 1000,
} as const;

export const HOLDING_STATUSES = ["MENUNGGU", "DISETUJUI"] as const;

export const STATUS_LABEL: Record<string, string> = {
  MENUNGGU: "Menunggu",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
};

export const STATUS_HINT: Record<string, string> = {
  MENUNGGU: "Pengajuan sedang ditinjau admin. Slot ruangan ditahan sementara.",
  DISETUJUI: "Ruangan sudah dikunci untuk kegiatan Anda.",
  DITOLAK: "Pengajuan ditolak. Baca alasan dari admin pada detail pengajuan.",
  DIBATALKAN: "Pengajuan dibatalkan dan slot ruangan dibuka kembali.",
};

export const TYPE_LABEL: Record<string, string> = {
  MAHASISWA: "Mahasiswa",
  DOSEN: "Dosen",
  STAF: "Staf",
};
