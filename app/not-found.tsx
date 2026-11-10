import Link from "next/link";
import { HomeIcon, SearchIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <SearchIcon size={28} />
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        Halaman tidak ditemukan
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
        Ruang ini tidak ada
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        Tautan mungkin sudah berubah, atau pengajuan yang Anda cari bukan milik
        akun ini. Silakan kembali ke beranda atau riwayat pengajuan.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link href="/" className="btn btn-primary">
          <HomeIcon size={16} /> Kembali ke beranda
        </Link>
        <Link href="/riwayat" className="btn btn-outline">
          Riwayat pengajuan
        </Link>
      </div>
    </div>
  );
}
