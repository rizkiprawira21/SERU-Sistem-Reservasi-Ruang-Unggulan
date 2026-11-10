import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { cancelBooking, createBooking, decideBooking } from "@/lib/bookings";
import { cleanDatabase, createRoom, createUser, futureDate, sessionUser } from "./helpers";

const baseInput = (roomId: string, date: string, startMin = 540, endMin = 660) => ({
  roomId,
  date,
  startMin,
  endMin,
  activity: "Rapat koordinasi organisasi",
  purpose: "Rapat koordinasi pengurus organisasi untuk persiapan kegiatan kampus.",
  participants: 12,
});

describe("alur utama peminjaman", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("ajukan → setujui → email dan audit tercatat", async () => {
    const applicant = await createUser({ email: "mhs@uji.id" });
    const admin = await createUser({
      email: "admin@uji.id",
      role: "ADMIN",
      type: "STAF",
      name: "Admin Uji",
    });
    const room = await createRoom();

    const booking = await createBooking(
      baseInput(room.id, futureDate(3)),
      sessionUser(applicant),
    );
    expect(booking.status).toBe("MENUNGGU");
    expect(booking.ref).toMatch(/^SERU-\d{4}-\d{4}$/);

    const afterCreate = await prisma.outbox.count();
    expect(afterCreate).toBe(1);

    const approved = await decideBooking(
      booking.id,
      sessionUser(admin),
      "SETUJUI",
      "Ruangan siap dipakai.",
    );
    expect(approved.status).toBe("DISETUJUI");
    expect(approved.staffNote).toBe("Ruangan siap dipakai.");

    const outbox = await prisma.outbox.findMany({ orderBy: { createdAt: "asc" } });
    expect(outbox).toHaveLength(2);
    expect(outbox[1].subject).toContain("disetujui");
    expect(outbox[1].body).toContain(booking.ref);

    const history = await prisma.statusHistory.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: "asc" },
    });
    expect(history.map((entry) => entry.toStatus)).toEqual(["MENUNGGU", "DISETUJUI"]);

    const audits = await prisma.auditLog.count({
      where: { entityId: booking.id },
    });
    expect(audits).toBeGreaterThanOrEqual(2);
  });

  it("penolakan wajib beralasan dan melepas slot", async () => {
    const applicant = await createUser({ email: "mhs2@uji.id" });
    const other = await createUser({ email: "mhs3@uji.id" });
    const admin = await createUser({
      email: "admin2@uji.id",
      role: "ADMIN",
      type: "STAF",
    });
    const room = await createRoom("ruang-uji-2");
    const date = futureDate(3);

    const booking = await createBooking(baseInput(room.id, date), sessionUser(applicant));

    await expect(
      decideBooking(booking.id, sessionUser(admin), "TOLAK", ""),
    ).rejects.toMatchObject({ code: "REASON_REQUIRED" });

    const rejected = await decideBooking(
      booking.id,
      sessionUser(admin),
      "TOLAK",
      "Ruangan dipakai kegiatan kampus pada jam tersebut.",
    );
    expect(rejected.status).toBe("DITOLAK");
    expect(rejected.rejectionReason).toContain("kegiatan kampus");

    const outbox = await prisma.outbox.findMany({ orderBy: { createdAt: "asc" } });
    expect(outbox.at(-1)?.subject).toContain("ditolak");
    expect(outbox.at(-1)?.body).toContain("kegiatan kampus");

    const free = await createBooking(
      baseInput(room.id, date, 540, 660),
      sessionUser(other),
    );
    expect(free.status).toBe("MENUNGGU");
  });

  it("pemohon membatalkan pengajuan dan slot dapat dipakai lagi", async () => {
    const applicant = await createUser({ email: "mhs4@uji.id" });
    const other = await createUser({ email: "mhs5@uji.id" });
    const room = await createRoom("ruang-uji-3");
    const date = futureDate(4);

    const booking = await createBooking(baseInput(room.id, date), sessionUser(applicant));
    await cancelBooking(booking.id, sessionUser(applicant), "Jadwal diundur.");

    const cancelled = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(cancelled?.status).toBe("DIBATALKAN");
    expect(cancelled?.cancelReason).toBe("Jadwal diundur.");

    const replacement = await createBooking(
      baseInput(room.id, date),
      sessionUser(other),
    );
    expect(replacement.status).toBe("MENUNGGU");
  });

  it("admin membatalkan peminjaman disetujui dan pemohon menerima email", async () => {
    const applicant = await createUser({ email: "mhs6@uji.id" });
    const admin = await createUser({
      email: "admin3@uji.id",
      role: "ADMIN",
      type: "STAF",
    });
    const room = await createRoom("ruang-uji-4");
    const date = futureDate(5);

    const booking = await createBooking(baseInput(room.id, date), sessionUser(applicant));
    await decideBooking(booking.id, sessionUser(admin), "SETUJUI");

    await cancelBooking(
      booking.id,
      sessionUser(admin),
      "Ruangan dibutuhkan untuk kegiatan darurat kampus.",
    );

    const updated = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updated?.status).toBe("DIBATALKAN");

    const lastMail = await prisma.outbox.findFirst({
      orderBy: { createdAt: "desc" },
    });
    expect(lastMail?.subject).toContain("dibatalkan admin");
    expect(lastMail?.body).toContain("kegiatan darurat");
  });

  it("menolak peserta melebihi kapasitas ruangan", async () => {
    const applicant = await createUser({ email: "mhs7@uji.id" });
    const room = await createRoom("ruang-uji-5");
    const input = { ...baseInput(room.id, futureDate(3)), participants: 500 };
    await expect(createBooking(input, sessionUser(applicant))).rejects.toMatchObject({
      code: "CAPACITY_EXCEEDED",
    });
  });

  it("akses pemohon lain ke data tidak diizinkan", async () => {
    const owner = await createUser({ email: "mhs8@uji.id" });
    const stranger = await createUser({ email: "mhs9@uji.id" });
    const room = await createRoom("ruang-uji-6");
    const booking = await createBooking(
      baseInput(room.id, futureDate(3)),
      sessionUser(owner),
    );

    await expect(
      cancelBooking(booking.id, sessionUser(stranger), "Coba batalkan"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
