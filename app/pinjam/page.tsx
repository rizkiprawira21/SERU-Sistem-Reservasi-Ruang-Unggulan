import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { addDays, isValidDateISO, todayISO, windowDates } from "@/lib/time";
import { APP_CONFIG, TYPE_LABEL } from "@/lib/config";
import { BookingWizard } from "./booking-wizard";
import { CalendarIcon, ShieldIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Ajukan reservasi",
  description:
    "Pilih jadwal, ruangan, dan isi formulir reservasi ruangan kampus IDB Bali.",
};

function safeTime(value: string | undefined, fallback: string): string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return fallback;
  return value;
}

export default async function PinjamPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    start?: string;
    end?: string;
    room?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    const query = new URLSearchParams();
    if (params.date) query.set("date", params.date);
    if (params.start) query.set("start", params.start);
    if (params.end) query.set("end", params.end);
    if (params.room) query.set("room", params.room);
    const target = query.size ? `/pinjam?${query.toString()}` : "/pinjam";
    redirect(`/masuk?next=${encodeURIComponent(target)}`);
  }
  if (user.role !== "PEMOHON") redirect("/staf");
  const today = todayISO();
  const bounds = windowDates(today);
  const suggested = addDays(today, 3);

  const date =
    params.date && isValidDateISO(params.date) && params.date >= bounds.min && params.date <= bounds.max
      ? params.date
      : suggested;
  const start = safeTime(params.start, "09:00");
  const end = safeTime(params.end, "12:00");

  return (
    <div className="page-shell py-8 sm:py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow">Alur pemohon</span>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Ajukan reservasi ruangan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Hai {user.name.split(" ")[0]}. Pilih jadwal dulu, lalu sistem
            menampilkan ruangan yang bisa dipakai beserta aturannya.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          <span className="chip">
            <CalendarIcon size={13} /> H-{APP_CONFIG.minLeadDays} s.d.{" "}
            {APP_CONFIG.maxAdvanceDays} hari
          </span>
          <span className="chip">
            <ShieldIcon size={13} /> {TYPE_LABEL[user.type]}
          </span>
        </div>
      </div>

      <div className="mt-7">
        <BookingWizard
          user={{
            name: user.name,
            email: user.email,
            type: user.type,
            identity: user.identity,
            org: user.org,
            whatsapp: user.whatsapp,
          }}
          initialDate={date}
          initialStart={start}
          initialEnd={end}
          initialRoomId={params.room}
          bounds={{ ...bounds, suggested }}
        />
      </div>
    </div>
  );
}
