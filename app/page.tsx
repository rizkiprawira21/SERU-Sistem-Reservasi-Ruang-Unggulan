import Link from "next/link";
import type { Metadata } from "next";
import { getActiveRooms, toRoomDTO } from "@/lib/rooms";
import { RoomCatalog } from "@/components/room-catalog";
import { HeroStage } from "@/components/hero-stage";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  DoorIcon,
  ShieldIcon,
} from "@/components/icons";
import { APP_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: "SERU Sistem Reservasi Ruang Unggulan",
  description:
    "SERU: Sistem Reservasi Ruang Unggulan IDB Bali. Lihat ketersediaan, ajukan reservasi, dan pantau statusnya dalam satu tempat.",
};

const STEPS = [
  {
    number: "01",
    title: "Tentukan jadwal",
    body: "Pilih tanggal, jam mulai, dan selesai. Sistem langsung menyaring ruangan yang sesuai aturan.",
    icon: CalendarIcon,
  },
  {
    number: "02",
    title: "Pilih ruang unggulan",
    body: "Bandingkan foto, fasilitas, dan kapasitas ruangan asli kampus IDB Bali.",
    icon: DoorIcon,
  },
  {
    number: "03",
    title: "Kirim & pantau",
    body: "Slot ditahan sementara, admin memutuskan, dan status selalu terlihat jelas.",
    icon: CheckIcon,
  },
];



export default async function HomePage() {
  const rooms = await getActiveRooms();
  const catalog = rooms.map((room) => {
    const dto = toRoomDTO(room);
    return {
      id: dto.id,
      slug: dto.slug,
      name: dto.name,
      category: dto.category,
      imageUrl: dto.imageUrl,
      building: dto.building,
      floor: dto.floor,
      capacity: dto.capacity,
      facilities: dto.facilities,
      hoursSummary: dto.hoursSummary,
      allowedDays: dto.allowedDays,
      specialNote: dto.specialNote,
    };
  });
  const categoryCount = new Set(rooms.map((room) => room.category)).size;

  return (
    <>
      <HeroStage roomCount={rooms.length} categoryCount={categoryCount} />

      <section className="page-shell relative z-10 mt-10 scroll-mt-24 sm:mt-12" id="cara-kerja">
        <Reveal>
        <div className="card grid gap-4 p-5 shadow-lift sm:grid-cols-3 sm:p-6">
          {STEPS.map((step) => (
            <article key={step.number} className="flex gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <step.icon size={19} />
              </span>
              <div>
                <p className="text-[0.66rem] font-bold tracking-[0.14em] text-gold">
                  LANGKAH {step.number}
                </p>
                <h2 className="mt-0.5 font-display text-lg font-semibold text-ink">
                  {step.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">{step.body}</p>
              </div>
            </article>
          ))}
        </div>
        </Reveal>
      </section>

      <section className="page-shell scroll-mt-24 py-14 sm:py-20" id="ruangan">
        <Reveal>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="eyebrow">Katalog ruangan</span>
            <h2 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
              Pilih ruang yang paling pas
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Ruang kelas, studio, laboratorium, galeri, ruang rapat, dan aula —
              lengkap dengan foto dan fasilitas dari kampus IDB Bali.
            </p>
          </div>
          <Link href="/pinjam" className="btn btn-primary shrink-0 self-start sm:self-auto">
            <CalendarIcon size={16} />
            Cek jadwal lengkap
          </Link>
        </div>
        </Reveal>

        <Reveal className="mt-8" delay={80}>
          <RoomCatalog rooms={catalog} />
        </Reveal>
        <p className="mt-5 text-xs text-muted">
          Data ruangan mengacu pada{" "}
          <a
            href="https://www.idbbali.ac.id/fasilitas-kampus/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            halaman fasilitas resmi IDB Bali
          </a>
          . Gudang dan area layanan internal tidak termasuk ruang yang dapat
          direservasi.
        </p>
      </section>

      <SiteFooter />
    </>
  );
}
