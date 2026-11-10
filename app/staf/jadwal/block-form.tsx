"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { Dialog } from "@/components/dialog";
import { AlertIcon, BanIcon } from "@/components/icons";

type RoomOption = { id: string; name: string };

export function BlockForm({
  rooms,
  defaultDate,
}: {
  rooms: RoomOption[];
  defaultDate: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("10:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!roomId) {
      setError("Pilih ruangan terlebih dahulu.");
      return;
    }
    if (!date) {
      setError("Pilih tanggal blokir.");
      return;
    }
    if (start >= end) {
      setError("Jam selesai harus lebih akhir daripada jam mulai.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Alasan blokir minimal 5 karakter.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, date, start, end, reason: reason.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Gagal membuat blokir.");
        return;
      }
      setOpen(false);
      setReason("");
      toast("Blokir jadwal ditambahkan.", "success");
      router.refresh();
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>
        <BanIcon size={16} /> Tambah blokir
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Blokir jadwal ruangan"
        description="Blokir mengalahkan pengajuan baru dan tampil sebagai status pemeliharaan. Pengajuan yang sudah disetujui perlu dibatalkan manual."
        tone="danger"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={loading}>
              Batal
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void submit()} disabled={loading}>
              {loading ? "Menyimpan…" : "Simpan blokir"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {error ? (
            <p className="flex items-start gap-1.5 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              <AlertIcon size={15} className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : null}
          <div className="field">
            <label className="label" htmlFor="block-room">
              Ruangan
            </label>
            <select
              id="block-room"
              className="select"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="block-date">
              Tanggal
            </label>
            <input
              id="block-date"
              type="date"
              className="input"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label" htmlFor="block-start">
                Mulai
              </label>
              <input
                id="block-start"
                type="time"
                className="input"
                step={1800}
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="block-end">
                Selesai
              </label>
              <input
                id="block-end"
                type="time"
                className="input"
                step={1800}
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="block-reason">
              Alasan
            </label>
            <input
              id="block-reason"
              className="input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: Perawatan sound system"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
