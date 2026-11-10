import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createBooking } from "@/lib/bookings";
import { cleanDatabase, createRoom, createUser, futureDate, sessionUser } from "./helpers";

describe("konkurensi anti double-booking", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("dari dua permintaan bersamaan pada slot sama, hanya satu yang berhasil", async () => {
    const [userA, userB] = await Promise.all([
      createUser({ email: "balapan-a@uji.id", name: "Pemohon A" }),
      createUser({ email: "balapan-b@uji.id", name: "Pemohon B" }),
    ]);
    const room = await createRoom("ruang-balapan");
    const date = futureDate(3);

    const input = {
      roomId: room.id,
      date,
      startMin: 600,
      endMin: 720,
      activity: "Kegiatan bersamaan",
      purpose: "Menguji bahwa server menolak bentrok pada permintaan bersamaan.",
      participants: 10,
    };

    const results = await Promise.allSettled([
      createBooking(input, sessionUser(userA)),
      createBooking(input, sessionUser(userB)),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejection = rejected[0] as PromiseRejectedResult;
    expect(["ROOM_CONFLICT", "SLOT_HELD"]).toContain(
      (rejection.reason as { code?: string }).code,
    );

    const stored = await prisma.booking.findMany({
      where: {
        roomId: room.id,
        date,
        status: { in: ["MENUNGGU", "DISETUJUI"] },
      },
    });
    expect(stored).toHaveLength(1);

    const active = stored[0];
    expect(active.startMin < 720 && 600 < active.endMin).toBe(true);
  });

  it("tiga permintaan bersamaan tetap hanya satu yang tersimpan", async () => {
    const users = await Promise.all([
      createUser({ email: "tiga-a@uji.id" }),
      createUser({ email: "tiga-b@uji.id" }),
      createUser({ email: "tiga-c@uji.id" }),
    ]);
    const room = await createRoom("ruang-tiga");
    const date = futureDate(4);
    const input = {
      roomId: room.id,
      date,
      startMin: 780,
      endMin: 900,
      activity: "Uji tiga permintaan",
      purpose: "Memastikan hanya satu pengajuan yang menahan slot pada waktu sama.",
      participants: 8,
    };

    const results = await Promise.allSettled(
      users.map((user) => createBooking(input, sessionUser(user))),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.booking.count({ where: { roomId: room.id, date } })).toBe(1);
  });
});
