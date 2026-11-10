import { PrismaClient, Role, UserType, BookingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

function todayISO(): string {
  const now = new Date(Date.now() + WITA_OFFSET_MS);
  return now.toISOString().slice(0, 10);
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function nextWeekday(from: string, target: number): string {
  let date = from;
  for (let i = 0; i < 14; i += 1) {
    if (dayOfWeek(date) === target) return date;
    date = addDays(date, 1);
  }
  return date;
}

const day = (open: number, close: number) => ({ open, close });
const OPEN = 7 * 60;
const CLOSE = 21 * 60;

const aulaHours = {
  "0": null,
  "1": day(OPEN, CLOSE),
  "2": day(OPEN, CLOSE),
  "3": day(OPEN, CLOSE),
  "4": day(OPEN, CLOSE),
  "5": day(OPEN, CLOSE),
  "6": day(OPEN, 14 * 60),
};

const galleryHours = {
  "0": day(9 * 60, 20 * 60),
  "1": day(9 * 60, 20 * 60),
  "2": day(9 * 60, 20 * 60),
  "3": day(9 * 60, 20 * 60),
  "4": day(9 * 60, 20 * 60),
  "5": day(9 * 60, 20 * 60),
  "6": day(9 * 60, 20 * 60),
};

const labHours = {
  "0": null,
  "1": day(8 * 60, CLOSE),
  "2": day(8 * 60, CLOSE),
  "3": day(8 * 60, CLOSE),
  "4": day(8 * 60, CLOSE),
  "5": day(8 * 60, CLOSE),
  "6": day(8 * 60, CLOSE),
};

const studioHours = {
  "0": null,
  "1": day(8 * 60, CLOSE),
  "2": day(8 * 60, CLOSE),
  "3": day(8 * 60, CLOSE),
  "4": day(8 * 60, CLOSE),
  "5": day(8 * 60, CLOSE),
  "6": day(8 * 60, CLOSE),
};

const meetingHours = {
  "0": null,
  "1": day(8 * 60 + 30, 17 * 60),
  "2": day(8 * 60 + 30, 17 * 60),
  "3": day(8 * 60 + 30, 17 * 60),
  "4": day(8 * 60 + 30, 17 * 60),
  "5": day(8 * 60 + 30, 17 * 60),
  "6": day(8 * 60 + 30, 14 * 60),
};

const magisterHours = {
  "0": null,
  "1": day(8 * 60, CLOSE),
  "2": day(8 * 60, CLOSE),
  "3": day(8 * 60, CLOSE),
  "4": day(8 * 60, CLOSE),
  "5": day(8 * 60, CLOSE),
  "6": day(8 * 60, 14 * 60),
};

const rooms = [
  {
    slug: "aula",
    name: "Aula",
    category: "Aula",
    description:
      "Hall/Aula IDB Bali dengan fasilitas lengkap untuk seminar, workshop, pelatihan, dan kegiatan UKM.",
    imageUrl: "/rooms/aula.jpg",
    building: "Gedung A (Utama)",
    floor: "Lantai 1",
    capacity: 250,
    facilities: [
      "Panggung",
      "Sound system",
      "Mikrofon",
      "Proyektor",
      "AC",
      "Tata cahaya",
      "Meja & kursi",
    ],
    hoursJson: JSON.stringify(aulaHours),
    maxDurationMin: 480,
  },
  {
    slug: "creative-gallery",
    name: "Creative Gallery",
    category: "Galeri",
    description:
      "Galeri karya mahasiswa dari seluruh program studi, cocok untuk pameran, talkshow, dan peluncuran karya.",
    imageUrl: "/rooms/creative-gallery.jpg",
    building: "Gedung A (Utama)",
    floor: "Lantai 1",
    capacity: 80,
    facilities: ["Area pameran", "Tata cahaya", "Sound system", "AC"],
    hoursJson: JSON.stringify(galleryHours),
    maxDurationMin: 240,
  },
  {
    slug: "lab-komputer",
    name: "Lab Komputer",
    category: "Laboratorium",
    description:
      "Lab komputer dengan CPU Intel 12th gen dan GPU NVIDIA, terhubung LAN, untuk praktikum dan pelatihan.",
    imageUrl: "/rooms/lab-komputer.jpg",
    building: "Gedung C (Perkuliahan)",
    floor: "Lantai 2",
    capacity: 36,
    facilities: [
      "Komputer NVIDIA",
      "Jaringan LAN",
      "Koneksi internet",
      "AC",
      "Proyektor",
    ],
    hoursJson: JSON.stringify(labHours),
    maxDurationMin: 240,
  },
  {
    slug: "lab-imac",
    name: "Lab iMac",
    category: "Laboratorium",
    description:
      "Lab desain dengan iMac M1 untuk praktik desain, ilustrasi, editing, dan produksi karya digital.",
    imageUrl: "/rooms/lab-imac.jpg",
    building: "Gedung C (Perkuliahan)",
    floor: "Lantai 2",
    capacity: 30,
    facilities: ["iMac M1", "Koneksi internet", "AC", "Proyektor", "Meja kerja"],
    hoursJson: JSON.stringify(labHours),
    maxDurationMin: 240,
  },
  {
    slug: "lab-software-development",
    name: "Lab Software Development",
    category: "Laboratorium",
    description:
      "Lab modern untuk praktikum, penelitian, dan pengembangan proyek teknologi informasi dan bisnis digital.",
    imageUrl: "/rooms/lab-software.jpg",
    building: "Gedung C (Perkuliahan)",
    floor: "Lantai 2",
    capacity: 35,
    facilities: [
      "Komputer performa tinggi",
      "Internet cepat",
      "AC",
      "Proyektor",
      "Meja ergonomis",
    ],
    hoursJson: JSON.stringify(labHours),
    maxDurationMin: 240,
  },
  {
    slug: "lab-fashion-design",
    name: "Lab Fashion Design",
    category: "Laboratorium",
    description:
      "Lab untuk mahasiswa Desain Mode mengembangkan produk fashion secara digital maupun manual.",
    imageUrl: "/rooms/lab-fashion.jpg",
    building: "Gedung C (Perkuliahan)",
    floor: "Lantai 1",
    capacity: 25,
    facilities: ["Mesin jahit", "Meja potong", "Manekin", "AC"],
    hoursJson: JSON.stringify(studioHours),
    maxDurationMin: 240,
  },
  {
    slug: "studio-pola",
    name: "Studio Pola",
    category: "Studio",
    description:
      "Studio menggambar pola dan memotong bahan, menjadi ruang awal proses karya fashion mahasiswa.",
    imageUrl: "/rooms/studio-pola.jpg",
    building: "Gedung C (Perkuliahan)",
    floor: "Lantai 1",
    capacity: 25,
    facilities: ["Meja pola", "Meja potong", "Manekin", "AC"],
    hoursJson: JSON.stringify(studioHours),
    maxDurationMin: 240,
  },
  {
    slug: "studio-foto",
    name: "Studio Foto",
    category: "Studio",
    description:
      "Studio fotografi dan videografi dengan backdrop serta properti penunjang untuk seluruh program studi.",
    imageUrl: "/rooms/studio-foto.jpg",
    building: "Gedung C (Perkuliahan)",
    floor: "Lantai 1",
    capacity: 20,
    facilities: ["Backdrop", "Lighting", "Properti", "AC", "Koneksi internet"],
    hoursJson: JSON.stringify(studioHours),
    maxDurationMin: 240,
  },
  {
    slug: "ruang-meeting",
    name: "Ruang Meeting",
    category: "Ruang rapat",
    description:
      "Ruang pertemuan dengan meja bundar dan proyektor, dihiasi display karya mahasiswa.",
    imageUrl: "/rooms/ruang-meeting.jpg",
    building: "Gedung A (Utama)",
    floor: "Lantai 2",
    capacity: 20,
    facilities: ["Proyektor", "Meja bundar", "AC", "Display karya"],
    hoursJson: JSON.stringify(meetingHours),
    maxDurationMin: 240,
  },
  {
    slug: "ruang-kelas-magister",
    name: "Ruang Kelas Magister",
    category: "Ruang kelas",
    description:
      "Ruang kelas Program Magister dengan kamera dan peralatan digital untuk perkuliahan tatap muka maupun daring.",
    imageUrl: "/rooms/ruang-magister.jpg",
    building: "Gedung A (Utama)",
    floor: "Lantai 3",
    capacity: 30,
    facilities: ["Kamera hybrid", "Layar", "AC", "Koneksi internet", "Meja & kursi"],
    hoursJson: JSON.stringify(magisterHours),
    maxDurationMin: 240,
  },
];

async function main() {
  console.log("Membersihkan data lama…");
  await prisma.statusHistory.deleteMany();
  await prisma.outbox.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.roomBlock.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.room.deleteMany();

  console.log("Membuat akun demo…");
  const [admin, rani] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Dimas Saputra",
        email: "admin@idb.ac.id",
        passwordHash: await bcrypt.hash("Admin123!", 10),
        role: Role.ADMIN,
        type: UserType.STAF,
        identity: "STF-001",
        org: "Sarana Prasarana",
        whatsapp: "081234567899",
      },
    }),
    prisma.user.create({
      data: {
        name: "Rani Pradnyani",
        email: "mahasiswa@idb.ac.id",
        passwordHash: await bcrypt.hash("Mahasiswa123!", 10),
        role: Role.PEMOHON,
        type: UserType.MAHASISWA,
        identity: "2023010045",
        org: "Himpunan Mahasiswa Desain",
        whatsapp: "081234567800",
      },
    }),
  ]);

  console.log("Membuat ruangan kampus…");
  const createdRooms: Record<string, { id: string; name: string }> = {};
  for (const room of rooms) {
    const created = await prisma.room.create({
      data: {
        ...room,
        facilities: JSON.stringify(room.facilities),
      },
    });
    createdRooms[room.slug] = { id: created.id, name: created.name };
  }
  const roomId = (slug: string) => createdRooms[slug].id;

  const today = todayISO();
  const minDate = addDays(today, 2);

  console.log("Membuat blokir jadwal kuliah…");
  const blocks: {
    roomId: string;
    date: string;
    startMin: number;
    endMin: number;
    reason: string;
  }[] = [];

  for (let i = 0; i < 14; i += 1) {
    const date = addDays(minDate, i);
    const dow = dayOfWeek(date);
    if (dow >= 1 && dow <= 5) {
      blocks.push({
        roomId: roomId("lab-komputer"),
        date,
        startMin: 8 * 60,
        endMin: 12 * 60,
        reason: "Jadwal praktikum Lab Komputer",
      });
      blocks.push({
        roomId: roomId("ruang-kelas-magister"),
        date,
        startMin: 8 * 60,
        endMin: 10 * 60,
        reason: "Jadwal kuliah Magister",
      });
    }
    if (dow === 2 || dow === 4) {
      blocks.push({
        roomId: roomId("lab-imac"),
        date,
        startMin: 13 * 60,
        endMin: 16 * 60,
        reason: "Jadwal praktikum Lab iMac",
      });
      blocks.push({
        roomId: roomId("studio-foto"),
        date,
        startMin: 13 * 60,
        endMin: 15 * 60,
        reason: "Jadwal kelas fotografi",
      });
    }
    if (dow === 1 || dow === 3) {
      blocks.push({
        roomId: roomId("lab-software-development"),
        date,
        startMin: 10 * 60,
        endMin: 12 * 60,
        reason: "Jadwal kelas Software Development",
      });
    }
    if (dow === 2) {
      blocks.push({
        roomId: roomId("studio-pola"),
        date,
        startMin: 8 * 60,
        endMin: 11 * 60,
        reason: "Jadwal praktik Studio Pola",
      });
    }
  }

  await prisma.roomBlock.createMany({ data: blocks });

  console.log("Membuat contoh reservasi…");
  const nextMon = nextWeekday(minDate, 1);
  const nextTue = nextWeekday(minDate, 2);
  const nextWed = nextWeekday(minDate, 3);
  const nextThu = nextWeekday(minDate, 4);
  const nextFri = nextWeekday(minDate, 5);
  const nextSat = nextWeekday(minDate, 6);
  const pastDate = addDays(today, -12);

  type SeedBooking = {
    ref: string;
    userId: string;
    roomId: string;
    date: string;
    startMin: number;
    endMin: number;
    activity: string;
    purpose: string;
    participants: number;
    status: BookingStatus;
    staffNote?: string;
    rejectionReason?: string;
    cancelReason?: string;
    decidedById?: string;
    decidedAt?: Date;
    cancelledAt?: Date;
  };

  const seedBookings: SeedBooking[] = [
    {
      ref: `SERU-${nextMon.slice(0, 4)}-1001`,
      userId: rani.id,
      roomId: roomId("creative-gallery"),
      date: nextMon,
      startMin: 13 * 60,
      endMin: 15 * 60,
      activity: "Review portofolio mahasiswa baru",
      purpose:
        "Kegiatan review karya portofolio mahasiswa baru bersama dosen pembimbing dan pengurus himpunan.",
      participants: 24,
      status: "DISETUJUI",
      staffNote: "Ruangan sudah dicek, silakan digunakan.",
      decidedById: admin.id,
      decidedAt: new Date(),
    },
    {
      ref: `SERU-${nextTue.slice(0, 4)}-1002`,
      userId: rani.id,
      roomId: roomId("ruang-meeting"),
      date: nextTue,
      startMin: 13 * 60,
      endMin: 15 * 60,
      activity: "Rapat koordinasi kurikulum",
      purpose:
        "Rapat koordinasi penyusunan kurikulum semester depan bersama perwakilan program studi.",
      participants: 12,
      status: "MENUNGGU",
    },
    {
      ref: `SERU-${nextFri.slice(0, 4)}-1003`,
      userId: rani.id,
      roomId: roomId("aula"),
      date: nextFri,
      startMin: 9 * 60,
      endMin: 12 * 60,
      activity: "Kuliah tamu industri kreatif",
      purpose:
        "Kuliah tamu bersama praktisi industri kreatif untuk mahasiswa semester lima dan enam.",
      participants: 180,
      status: "DISETUJUI",
      staffNote: "Sound system disiapkan tim sarana.",
      decidedById: admin.id,
      decidedAt: new Date(),
    },
    {
      ref: `SERU-${nextSat.slice(0, 4)}-1004`,
      userId: rani.id,
      roomId: roomId("lab-imac"),
      date: nextSat,
      startMin: 10 * 60,
      endMin: 12 * 60,
      activity: "Workshop ilustrasi digital",
      purpose:
        "Workshop ilustrasi digital untuk anggota UKM desain dengan praktik langsung di lab.",
      participants: 30,
      status: "DITOLAK",
      rejectionReason:
        "Bentrok dengan agenda kampus pada jam tersebut. Silakan pilih jam setelah 13.00.",
      decidedById: admin.id,
      decidedAt: new Date(),
    },
    {
      ref: `SERU-${nextSat.slice(0, 4)}-1005`,
      userId: rani.id,
      roomId: roomId("studio-foto"),
      date: nextSat,
      startMin: 15 * 60,
      endMin: 17 * 60,
      activity: "Pemotretan katalog karya mode",
      purpose:
        "Pemotretan katalog karya mahasiswa Desain Mode untuk pameran akhir semester.",
      participants: 12,
      status: "DIBATALKAN",
      cancelReason: "Dibatalkan oleh pemohon: jadwal pemotretan diundur.",
      cancelledAt: new Date(),
    },
    {
      ref: `SERU-${pastDate.slice(0, 4)}-1006`,
      userId: rani.id,
      roomId: roomId("aula"),
      date: pastDate,
      startMin: 10 * 60,
      endMin: 12 * 60,
      activity: "Sosialisasi organisasi mahasiswa",
      purpose:
        "Sosialisasi organisasi mahasiswa untuk mahasiswa baru semester ganjil tahun akademik ini.",
      participants: 150,
      status: "DISETUJUI",
      decidedById: admin.id,
      decidedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
    },
    {
      ref: `SERU-${nextWed.slice(0, 4)}-1007`,
      userId: rani.id,
      roomId: roomId("lab-komputer"),
      date: nextWed,
      startMin: 16 * 60,
      endMin: 18 * 60,
      activity: "Pelatihan analisis data",
      purpose:
        "Pelatihan analisis data untuk mahasiswa yang sedang menyusun proyek akhir semester.",
      participants: 30,
      status: "MENUNGGU",
    },
    {
      ref: `SERU-${nextThu.slice(0, 4)}-1008`,
      userId: rani.id,
      roomId: roomId("lab-fashion-design"),
      date: nextThu,
      startMin: 10 * 60,
      endMin: 12 * 60,
      activity: "Workshop pola dasar",
      purpose:
        "Workshop pola dasar untuk mahasiswa baru Desain Mode bersama asisten laboratorium.",
      participants: 20,
      status: "MENUNGGU",
    },
  ];

  for (const booking of seedBookings) {
    const created = await prisma.booking.create({ data: booking });
    await prisma.statusHistory.create({
      data: {
        bookingId: created.id,
        fromStatus: null,
        toStatus: "MENUNGGU",
        note: "Pengajuan dikirim dan slot ditahan sementara.",
        actorId: created.userId,
        createdAt: created.createdAt,
      },
    });
    if (created.status !== "MENUNGGU") {
      await prisma.statusHistory.create({
        data: {
          bookingId: created.id,
          fromStatus: "MENUNGGU",
          toStatus: created.status,
          note:
            created.status === "DITOLAK"
              ? `Ditolak: ${created.rejectionReason}`
              : created.status === "DIBATALKAN"
                ? `Dibatalkan pemohon: ${created.cancelReason}`
                : created.staffNote,
          actorId:
            created.status === "DIBATALKAN" ? created.userId : admin.id,
          createdAt: created.decidedAt ?? created.cancelledAt ?? new Date(),
        },
      });
    }
  }

  console.log("Membuat contoh email outbox…");
  await prisma.outbox.createMany({
    data: [
      {
        to: rani.email,
        subject: `[SERU] Pengajuan SERU-${nextMon.slice(0, 4)}-1001 disetujui`,
        body: [
          `Halo ${rani.name},`,
          "",
          "Pengajuan reservasi ruangan Anda telah disetujui.",
          "",
          "Ruangan: Creative Gallery",
          `Jadwal: ${nextMon}, 13.00–15.00 WITA`,
          "",
          "Silakan hadir sesuai jadwal dan jaga kondisi ruangan.",
        ].join("\n"),
        kind: "BOOKING_APPROVED",
      },
      {
        to: rani.email,
        subject: `[SERU] Pengajuan SERU-${nextSat.slice(0, 4)}-1004 ditolak`,
        body: [
          `Halo ${rani.name},`,
          "",
          "Pengajuan reservasi ruangan Anda belum dapat disetujui.",
          "",
          "Alasan penolakan: Bentrok dengan agenda kampus pada jam tersebut. Silakan pilih jam setelah 13.00.",
        ].join("\n"),
        kind: "BOOKING_REJECTED",
      },
      {
        to: rani.email,
        subject: `[SERU] Pengajuan SERU-${nextTue.slice(0, 4)}-1002 diterima`,
        body: [
          `Halo ${rani.name},`,
          "",
          "Pengajuan reservasi ruangan Anda sudah kami terima dan sedang menunggu keputusan admin.",
        ].join("\n"),
        kind: "BOOKING_CREATED",
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "SEED_DATA",
      entity: "System",
      detail: `Seed awal ${rooms.length} ruangan IDB Bali, ${seedBookings.length} reservasi.`,
    },
  });

  console.log(
    `Selesai. ${rooms.length} ruangan, ${seedBookings.length} reservasi, 2 akun demo (admin & mahasiswa).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
