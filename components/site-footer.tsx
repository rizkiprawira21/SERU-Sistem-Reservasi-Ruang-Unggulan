import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-0 border-t border-line bg-surface">
      <div className="page-shell grid gap-8 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-xl font-semibold text-ink">SERU</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Sistem Reservasi Ruang Unggulan IDB Bali. Satu tempat untuk melihat
            ketersediaan, mengajukan reservasi, dan memantau keputusan ruangan
            kampus.
          </p>
          <p className="mt-4 text-xs text-muted">
            Institut Desain dan Bisnis Bali · Denpasar, Bali
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Navigasi
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/#cara-kerja" className="text-body hover:text-primary">
                Cara kerja
              </Link>
            </li>
            <li>
              <Link href="/#ruangan" className="text-body hover:text-primary">
                Katalog ruangan
              </Link>
            </li>
            <li>
              <Link href="/pinjam" className="text-body hover:text-primary">
                Ajukan reservasi
              </Link>
            </li>
            <li>
              <Link href="/riwayat" className="text-body hover:text-primary">
                Cek status
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Bantuan
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/masuk" className="text-body hover:text-primary">
                Masuk akun kampus
              </Link>
            </li>
            <li>
              <span className="text-body">Sarana Prasarana · Gedung C</span>
            </li>
            <li>
              <a href="mailto:sarana@idb.ac.id" className="text-body hover:text-primary">
                sarana@idb.ac.id
              </a>
            </li>
            <li>
              <span className="text-body">Senin–Jumat, 08.00–16.00 WITA</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="page-shell flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SERU · Institut Desain dan Bisnis Bali</p>
          <p>Seluruh waktu dalam WITA (Asia/Makassar, UTC+8)</p>
        </div>
      </div>
    </footer>
  );
}
