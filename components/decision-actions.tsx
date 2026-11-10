"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import { Dialog } from "./dialog";
import { AlertIcon, CheckIcon, XIcon } from "./icons";

type BookingSummary = {
  id: string;
  ref: string;
  activity: string;
  purpose: string;
  dateLabel: string;
  timeLabel: string;
  roomName: string;
  applicantName: string;
};

export function DecisionActions({
  booking,
  onDone,
}: {
  booking: BookingSummary;
  onDone?: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [action, setAction] = useState<"SETUJUI" | "TOLAK" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function open(next: "SETUJUI" | "TOLAK") {
    setNote("");
    setError(null);
    setAction(next);
  }

  async function submit() {
    if (!action) return;
    if (action === "TOLAK" && note.trim().length < 5) {
      setError("Alasan penolakan wajib diisi minimal 5 karakter.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/staff/bookings/${booking.id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Keputusan gagal disimpan. Coba lagi.");
        return;
      }
      setAction(null);
      toast(
        action === "SETUJUI"
          ? "Pengajuan disetujui. Email pemberitahuan dikirim."
          : "Pengajuan ditolak. Alasan tersimpan untuk pemohon.",
        "success",
        action === "SETUJUI" ? "Disetujui" : "Ditolak",
      );
      router.refresh();
      onDone?.();
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => open("SETUJUI")}>
          <CheckIcon size={15} /> Setujui
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm !text-danger hover:!border-danger/40"
          onClick={() => open("TOLAK")}
        >
          <XIcon size={15} /> Tolak
        </button>
      </div>

      <Dialog
        open={action !== null}
        onClose={() => setAction(null)}
        title={action === "SETUJUI" ? "Setujui pengajuan?" : "Tolak pengajuan?"}
        description={
          action === "SETUJUI"
            ? "Sistem memeriksa ulang aturan ruangan dan bentrok jadwal sebelum menyimpan. Slot akan dikunci final."
            : "Pemohon akan melihat alasan penolakan dan menerima email. Slot ruangan dilepas."
        }
        tone={action === "TOLAK" ? "danger" : "default"}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAction(null)}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="button"
              className={action === "SETUJUI" ? "btn btn-primary" : "btn btn-danger"}
              onClick={() => void submit()}
              disabled={loading}
            >
              {loading
                ? "Menyimpan…"
                : action === "SETUJUI"
                  ? "Ya, setujui"
                  : "Ya, tolak"}
            </button>
          </>
        }
      >
        <div className="rounded-xl border border-line bg-surface-2/50 p-3.5 text-sm">
          <p className="font-mono text-[0.7rem] text-muted">{booking.ref}</p>
          <p className="mt-1 font-semibold text-ink">{booking.activity}</p>
          <dl className="mt-2 grid gap-1 text-xs text-body">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Pemohon</dt>
              <dd className="text-right font-medium text-ink">{booking.applicantName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Ruangan</dt>
              <dd className="text-right font-medium text-ink">{booking.roomName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Jadwal</dt>
              <dd className="text-right font-medium text-ink">
                {booking.dateLabel}
                <br />
                {booking.timeLabel} WITA
              </dd>
            </div>
          </dl>
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">
            {booking.purpose}
          </p>
        </div>

        <div className="mt-4">
          <label className="label" htmlFor="decision-note">
            {action === "TOLAK" ? (
              <>
                Alasan penolakan <span className="text-danger">*</span>
              </>
            ) : (
              "Catatan (opsional)"
            )}
          </label>
          <textarea
            id="decision-note"
            className="textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={400}
            placeholder={
              action === "TOLAK"
                ? "Contoh: Ruangan sudah dipakai kegiatan kampus pada jam tersebut."
                : "Contoh: Silakan koordinasi dengan petugas sound system."
            }
          />
          {error ? (
            <p role="alert" className="mt-2 flex items-start gap-1.5 error-text">
              <AlertIcon size={14} className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
