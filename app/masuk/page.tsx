import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { CampusVideo } from "@/components/campus-video";
import { LoginForm } from "./login-form";
import { BuildingIcon, InstagramIcon, MonitorIcon, SparkleIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Masuk akun kampus",
  description: "Masuk ke SERU dengan akun kampus IDB Bali.",
};

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/staf" : "/pinjam");
  const params = await searchParams;

  return (
    <div className="page-shell py-8 lg:py-14">
      <div className="grid overflow-hidden rounded-3xl border border-line bg-surface shadow-card lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden min-h-[700px] flex-col overflow-hidden bg-[#041c24] p-5 lg:flex">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(0,124,137,0.5),transparent_42%),radial-gradient(circle_at_92%_88%,rgba(242,169,59,0.16),transparent_38%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:42px_42px]" />

          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/30">
            <CampusVideo className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#041c24]/45 via-transparent to-transparent" />
            <div className="absolute left-3 top-3 inline-flex min-h-8 items-center gap-2 rounded-full border border-white/20 bg-[#041c24]/45 px-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Kampus IDB Bali
            </div>
          </div>

          <div className="relative mt-7 flex flex-1 flex-col">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-accent" />
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-accent">
                Institut Desain &amp; Bisnis Bali
              </span>
            </div>
            <p className="mt-4 font-display text-[2.1rem] leading-[1.1] text-white">
              IDB Bali
            </p>
            <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-white/50">
              Kampus desain dan bisnis kreatif di Denpasar, Bali.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { icon: <BuildingIcon size={15} />, label: "Aula & meeting" },
                { icon: <MonitorIcon size={15} />, label: "Lab & komputer" },
                { icon: <SparkleIcon size={15} />, label: "Studio kreatif" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-white/[0.045] p-3"
                >
                  <span className="text-accent">{item.icon}</span>
                  <p className="mt-2 text-[0.68rem] font-medium leading-snug text-white/60">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 text-[0.68rem] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7dd3c7]" />
                Denpasar, Bali
              </div>
              <a
                href="https://www.instagram.com/idbbali/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 text-xs font-medium text-white transition-colors hover:bg-white/10"
              >
                <InstagramIcon size={14} />
                @idbbali
              </a>
            </div>
          </div>
        </div>

        <div className="relative h-48 overflow-hidden lg:hidden">
          <CampusVideo className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#041c24]/70 via-transparent to-transparent" />
          <div className="absolute left-4 top-4 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/25 bg-[#041c24]/40 px-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Kampus IDB Bali
          </div>
          <a
            href="https://www.instagram.com/idbbali/"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/25 bg-[#041c24]/45 px-3 text-[0.68rem] font-medium text-white backdrop-blur-md"
          >
            <InstagramIcon size={13} />
            @idbbali
          </a>
        </div>

        <div className="p-6 sm:p-10 lg:p-12">
          <span className="eyebrow">Selamat datang kembali</span>
          <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Masuk ke SERU
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Gunakan akun kampus IDB Bali. Tidak punya akun? Hubungi Sarana
            Prasarana untuk pendaftaran sivitas akademika.
          </p>

          <div className="mt-7">
            <LoginForm next={params.next} />
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            Hanya untuk sivitas akademika IDB Bali.{" "}
            <Link href="/" className="font-medium text-primary hover:underline">
              Kembali ke beranda
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

