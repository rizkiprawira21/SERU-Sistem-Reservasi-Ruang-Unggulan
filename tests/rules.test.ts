import { describe, expect, it } from "vitest";
import {
  overlaps,
  validateRoomSchedule,
  validateWindow,
  type RoomRuleShape,
} from "@/lib/rules";
import { addDays, dayIndex, todayISO } from "@/lib/time";
import { EVERY_DAY, HALL_HOURS, WEEKEND_ONLY } from "./helpers";

function nextDateWithDay(target: number): string {
  let date = todayISO();
  for (let i = 0; i < 14; i += 1) {
    if (dayIndex(date) === target) return date;
    date = addDays(date, 1);
  }
  throw new Error("tanggal tidak ditemukan");
}

const generalRoom: RoomRuleShape = {
  name: "Ruang Umum",
  slug: "ruang-umum",
  hoursJson: EVERY_DAY,
  maxDurationMin: 240,
  capacity: 40,
  active: true,
};

const weekendRoom: RoomRuleShape = {
  name: "Lab iMac",
  slug: "lab-imac",
  hoursJson: WEEKEND_ONLY,
  maxDurationMin: 240,
  capacity: 30,
  active: true,
};

const hall: RoomRuleShape = {
  name: "Aula",
  slug: "aula",
  hoursJson: HALL_HOURS,
  maxDurationMin: 480,
  capacity: 250,
  active: true,
};

describe("overlaps — definisi konflik PRD 4.5", () => {
  it("menganggap irisan sebagai bentrok", () => {
    expect(overlaps(600, 720, 660, 780)).toBe(true);
  });

  it("tepat setelah jadwal sebelumnya bukan bentrok", () => {
    expect(overlaps(600, 720, 720, 840)).toBe(false);
  });

  it("selesai tepat saat jadwal berikutnya mulai bukan bentrok", () => {
    expect(overlaps(600, 720, 540, 600)).toBe(false);
  });

  it("slot identik bentrok", () => {
    expect(overlaps(600, 720, 600, 720)).toBe(true);
  });
});

describe("validateWindow — H-2 sampai 30 hari", () => {
  const today = todayISO();
  it("menolak H-1", () => {
    const result = validateWindow(addDays(today, 1), today);
    expect(result?.code).toBe("TOO_SOON");
  });

  it("menerima H-2", () => {
    expect(validateWindow(addDays(today, 2), today)).toBeNull();
  });

  it("menerima H-30", () => {
    expect(validateWindow(addDays(today, 30), today)).toBeNull();
  });

  it("menolak H-31", () => {
    const result = validateWindow(addDays(today, 31), today);
    expect(result?.code).toBe("TOO_FAR");
  });

  it("menolak tanggal tidak valid", () => {
    expect(validateWindow("2026-02-31", today)?.code).toBe("INVALID_DATE");
  });
});

describe("validateRoomSchedule — aturan jam, hari, durasi", () => {
  it("menolak Lab iMac pada hari kerja", () => {
    const monday = nextDateWithDay(1);
    const result = validateRoomSchedule(weekendRoom, monday, 600, 720);
    expect(result?.code).toBe("DAY_NOT_ALLOWED");
  });

  it("menolak Aula pada hari Minggu", () => {
    const sunday = nextDateWithDay(0);
    const result = validateRoomSchedule(hall, sunday, 600, 720);
    expect(result?.code).toBe("DAY_NOT_ALLOWED");
  });

  it("menolak Aula Sabtu yang melewati pukul 14.00", () => {
    const saturday = nextDateWithDay(6);
    const result = validateRoomSchedule(hall, saturday, 780, 900);
    expect(result?.code).toBe("HALL_SATURDAY_LIMIT");
  });

  it("menerima Aula Sabtu yang selesai tepat 14.00", () => {
    const saturday = nextDateWithDay(6);
    expect(validateRoomSchedule(hall, saturday, 720, 840)).toBeNull();
  });

  it("menolak jam selesai lebih awal dari jam mulai", () => {
    const date = nextDateWithDay(1);
    const result = validateRoomSchedule(generalRoom, date, 720, 660);
    expect(result?.code).toBe("INVALID_RANGE");
  });

  it("menolak durasi kurang dari 1 jam", () => {
    const date = nextDateWithDay(1);
    const result = validateRoomSchedule(generalRoom, date, 600, 630);
    expect(result?.code).toBe("TOO_SHORT");
  });

  it("menolak durasi lebih dari 4 jam untuk ruangan umum", () => {
    const date = nextDateWithDay(1);
    const result = validateRoomSchedule(generalRoom, date, 540, 840);
    expect(result?.code).toBe("TOO_LONG");
  });

  it("menerima Aula hingga 8 jam", () => {
    const date = nextDateWithDay(1);
    expect(validateRoomSchedule(hall, date, 540, 1020)).toBeNull();
  });

  it("menolak di luar jam operasional", () => {
    const date = nextDateWithDay(1);
    expect(validateRoomSchedule(generalRoom, date, 360, 480)?.code).toBe(
      "OUTSIDE_HOURS",
    );
    expect(validateRoomSchedule(generalRoom, date, 1200, 1320)?.code).toBe(
      "OUTSIDE_HOURS",
    );
  });

  it("menerima slot yang berakhir tepat pada jam tutup", () => {
    const date = nextDateWithDay(1);
    expect(validateRoomSchedule(generalRoom, date, 1140, 1260)).toBeNull();
  });
});
