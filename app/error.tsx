"use client";

import Link from "next/link";
import { AlertIcon, RefreshIcon } from "@/components/icons";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertIcon size={28} />
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        Terjadi kendala
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
        Halaman gagal dimuat
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        Silakan coba lagi. Jika masalah berlanjut, hubungi Sarana Prasarana
        IDB Bali.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={reset} className="btn btn-primary">
          <RefreshIcon size={16} /> Coba lagi
        </button>
        <Link href="/" className="btn btn-outline">
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
