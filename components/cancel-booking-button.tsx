"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { Dialog } from "./dialog";
import { BanIcon } from "./icons";

export function CancelBookingButton({
  bookingId,
  label = "Batalkan pengajuan",
  requireReason = false,
  admin = false,
  variant = "outline",
}: {
  bookingId: string;
  label?: string;
  requireReason?: boolean;
  admin?: boolean;
  variant?: "outline" | "danger";
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (requireReason && reason.trim().length < 5) {
      setError("Alasan pembatalan wajib diisi minimal 5 karakter.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        admin
          ? `/api/staff/bookings/${bookingId}/cancel`
          : `/api/bookings/${bookingId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Pembatalan gagal. Coba lagi.");
        return;
      }
      setOpen(false);
      setReason("");
      toast("Pengajuan berhasil dibatalkan.", "success", "Slot dilepas");
      router.refresh();
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn ${variant === "danger" ? "btn-danger" : "btn-outline"} btn-block`}
      >
        <BanIcon size={16} />
        {label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Batalkan reservasi?"
        description={
          requireReason
            ? "Pemohon akan menerima email berisi alasan pembatalan. Slot ruangan langsung dilepas."
            : "Slot ruangan akan dilepas dan pengajuan berstatus Dibatalkan. Tindakan ini tercatat di riwayat."
        }
        tone="danger"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Kembali
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void submit()}
              disabled={loading}
            >
              {loading ? "Memproses…" : "Ya, batalkan"}
            </button>
          </>
        }
      >
        <label className="label" htmlFor="cancel-reason">
          Alasan pembatalan {requireReason ? <span className="text-danger">*</span> : "(opsional)"}
        </label>
        <textarea
          id="cancel-reason"
          className="textarea"
          placeholder={
            requireReason
              ? "Contoh: Ruangan dibutuhkan untuk kegiatan darurat kampus."
              : "Contoh: Jadwal kegiatan diundur."
          }
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={300}
        />
        {error ? (
          <p role="alert" className="mt-2 error-text">
            {error}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
