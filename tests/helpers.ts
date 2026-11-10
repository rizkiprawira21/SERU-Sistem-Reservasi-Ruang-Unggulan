import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { addDays, todayISO } from "@/lib/time";

export const EVERY_DAY = JSON.stringify({
  "0": { open: 420, close: 1260 },
  "1": { open: 420, close: 1260 },
  "2": { open: 420, close: 1260 },
  "3": { open: 420, close: 1260 },
  "4": { open: 420, close: 1260 },
  "5": { open: 420, close: 1260 },
  "6": { open: 420, close: 1260 },
});

export const WEEKEND_ONLY = JSON.stringify({
  "0": { open: 420, close: 1260 },
  "1": null,
  "2": null,
  "3": null,
  "4": null,
  "5": null,
  "6": { open: 420, close: 1260 },
});

export const HALL_HOURS = JSON.stringify({
  "0": null,
  "1": { open: 420, close: 1260 },
  "2": { open: 420, close: 1260 },
  "3": { open: 420, close: 1260 },
  "4": { open: 420, close: 1260 },
  "5": { open: 420, close: 1260 },
  "6": { open: 420, close: 840 },
});

export async function cleanDatabase() {
  await prisma.statusHistory.deleteMany();
  await prisma.outbox.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.roomBlock.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();
}

export async function createUser(options: {
  email: string;
  name?: string;
  role?: "PEMOHON" | "ADMIN";
  type?: "MAHASISWA" | "DOSEN" | "STAF";
}) {
  return prisma.user.create({
    data: {
      name: options.name ?? "Pengguna Uji",
      email: options.email,
      passwordHash: await bcrypt.hash("Rahasia123!", 4),
      role: options.role ?? "PEMOHON",
      type: options.type ?? "MAHASISWA",
      identity: "TEST-001",
      whatsapp: "081200000000",
    },
  });
}

export async function createRoom(slug = "ruang-uji") {
  return prisma.room.create({
    data: {
      slug,
      name: "Ruang Uji",
      category: "Ruang kelas",
      description: "Ruangan untuk pengujian otomatis.",
      building: "Gedung Uji",
      floor: "Lantai 1",
      capacity: 40,
      facilities: JSON.stringify(["AC", "Proyektor"]),
      hoursJson: EVERY_DAY,
      maxDurationMin: 240,
      active: true,
    },
  });
}

export const futureDate = (offset = 3) => addDays(todayISO(), offset);

export function sessionUser(user: {
  id: string;
  name: string;
  email: string;
  role: "PEMOHON" | "ADMIN";
  type: "MAHASISWA" | "DOSEN" | "STAF";
  identity: string | null;
  org: string | null;
  whatsapp: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    type: user.type,
    identity: user.identity,
    org: user.org,
    whatsapp: user.whatsapp,
  };
}
