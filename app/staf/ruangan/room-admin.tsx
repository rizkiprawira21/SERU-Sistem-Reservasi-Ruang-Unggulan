"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { Dialog } from "@/components/dialog";
import {
  AlertIcon,
  BuildingIcon,
  CheckIcon,
  ClockIcon,
  DoorIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/icons";

export type AdminRoom = {
  id: string;
  name: string;
  category: string;
  building: string;
  floor: string;
  capacity: number;
  facilities: string[];
  hoursSummary: string;
  allowedDays: string;
  maxDurationMin: number;
  active: boolean;
};

const DAY_PRESETS = [
  { value: "weekdays", label: "Senin–Jumat", days: [1, 2, 3, 4, 5] },
  { value: "monday-saturday", label: "Senin–Sabtu", days: [1, 2, 3, 4, 5, 6] },
  { value: "all", label: "Setiap hari", days: [0, 1, 2, 3, 4, 5, 6] },
  { value: "weekend", label: "Sabtu–Minggu", days: [0, 6] },
];

const CATEGORIES = [
  "Ruang kelas",
  "Studio",
  "Laboratorium",
  "Ruang rapat",
  "Aula",
  "Galeri",
  "Serbaguna",
];

export function RoomAdmin({ rooms }: { rooms: AdminRoom[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Ruang kelas");
  const [building, setBuilding] = useState("Gedung A");
  const [floor, setFloor] = useState("Lantai 1");
  const [capacity, setCapacity] = useState("30");
  const [maxHours, setMaxHours] = useState("4");
  const [preset, setPreset] = useState("weekdays");
  const [openTime, setOpenTime] = useState("07:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [facilities, setFacilities] = useState("AC, Proyektor, Meja & kursi");
  const [description, setDescription] = useState("");

  function resetForm() {
    setName("");
    setCategory("Ruang kelas");
    setBuilding("Gedung A");
    setFloor("Lantai 1");
    setCapacity("30");
    setMaxHours("4");
    setPreset("weekdays");
    setOpenTime("07:00");
    setCloseTime("21:00");
    setFacilities("AC, Proyektor, Meja & kursi");
    setDescription("");
    setError(null);
  }

  async function toggleRoom(room: AdminRoom) {
    setToggling(room.id);
    try {
      const response = await fetch(`/api/admin/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !room.active }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        toast(data.message ?? "Gagal mengubah status ruangan.", "error");
        return;
      }
      toast(
        room.active
          ? `${room.name} dinonaktifkan dari katalog.`
          : `${room.name} diaktifkan kembali.`,
        "success",
      );
      router.refresh();
    } catch {
      toast("Koneksi bermasalah.", "error");
    } finally {
      setToggling(null);
    }
  }

  async function createRoom() {
    const presetDays = DAY_PRESETS.find((item) => item.value === preset)?.days ?? [1, 2, 3, 4, 5];
    if (name.trim().length < 3) {
      setError("Nama ruangan minimal 3 karakter.");
      return;
    }
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1) {
      setError("Kapasitas minimal 1 orang.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          building: building.trim(),
          floor: floor.trim(),
          capacity: cap,
          maxHours: Number(maxHours),
          days: presetDays,
          open: openTime,
          close: closeTime,
          facilities,
          description,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "Gagal menambah ruangan.");
        return;
      }
      setOpen(false);
      resetForm();
      toast("Ruangan baru ditambahkan ke katalog.", "success");
      router.refresh();
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow">Data master</span>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            Kelola ruangan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Tambah ruangan baru atau nonaktifkan ruangan yang sedang tidak
            dipakai. Perubahan berlaku untuk pengajuan berikutnya.
          </p>
        </div>
        <button type="button" className="btn btn-primary self-start" onClick={() => setOpen(true)}>
          <PlusIcon size={16} /> Tambah ruangan
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <article
            key={room.id}
            className={`card p-5 ${room.active ? "" : "opacity-75"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  {room.category}
                </p>
                <h2 className="mt-1 truncate font-display text-xl font-semibold text-ink">
                  {room.name}
                </h2>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={room.active}
                aria-label={`${room.active ? "Nonaktifkan" : "Aktifkan"} ${room.name}`}
                onClick={() => void toggleRoom(room)}
                disabled={toggling === room.id}
                className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                  room.active
                    ? "border-primary bg-primary"
                    : "border-line bg-surface-2"
                }`}
              >
                <span
                  className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-all ${
                    room.active ? "left-[26px]" : "left-0.5"
                  }`}
                >
                  {room.active ? (
                    <CheckIcon size={11} className="text-primary" />
                  ) : null}
                </span>
              </button>
            </div>

            <div className="mt-3 grid gap-1.5 text-xs text-body">
              <span className="flex items-center gap-1.5">
                <BuildingIcon size={13} className="text-muted" />
                {room.building}, {room.floor}
              </span>
              <span className="flex items-center gap-1.5">
                <UsersIcon size={13} className="text-muted" />
                {room.capacity} orang · maks {room.maxDurationMin / 60} jam
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon size={13} className="text-muted" />
                {room.allowedDays} · {room.hoursSummary}
              </span>
              <span className="flex items-center gap-1.5">
                <DoorIcon size={13} className="text-muted" />
                {room.facilities.slice(0, 3).join(" · ") || "Tanpa fasilitas"}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className={`badge ${room.active ? "" : "!text-muted"}`} data-status={room.active ? "DISETUJUI" : "DIBATALKAN"}>
                {room.active ? "Aktif" : "Nonaktif"}
              </span>
              <span className="text-[0.65rem] text-muted">
                {room.active ? "Tampil di katalog" : "Disembunyikan"}
              </span>
            </div>
          </article>
        ))}
      </div>

      <Dialog
        open={open}
        onClose={() => {
          if (!saving) {
            setOpen(false);
            resetForm();
          }
        }}
        title="Tambah ruangan"
        description="Ruangan baru langsung aktif dan tampil di katalog pemohon."
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void createRoom()}
              disabled={saving}
            >
              {saving ? "Menyimpan…" : "Simpan ruangan"}
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
            <label className="label" htmlFor="room-name">
              Nama ruangan
            </label>
            <input
              id="room-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Studio Animasi"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label" htmlFor="room-category">
                Kategori
              </label>
              <select
                id="room-category"
                className="select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="room-capacity">
                Kapasitas
              </label>
              <input
                id="room-capacity"
                type="number"
                min={1}
                className="input"
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="room-building">
                Gedung
              </label>
              <input
                id="room-building"
                className="input"
                value={building}
                onChange={(event) => setBuilding(event.target.value)}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="room-floor">
                Lantai
              </label>
              <input
                id="room-floor"
                className="input"
                value={floor}
                onChange={(event) => setFloor(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="room-hours">
              Jam operasional
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                id="room-hours"
                type="time"
                className="input"
                value={openTime}
                onChange={(event) => setOpenTime(event.target.value)}
                step={1800}
              />
              <input
                type="time"
                aria-label="Jam tutup"
                className="input"
                value={closeTime}
                onChange={(event) => setCloseTime(event.target.value)}
                step={1800}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label" htmlFor="room-days">
                Hari
              </label>
              <select
                id="room-days"
                className="select"
                value={preset}
                onChange={(event) => setPreset(event.target.value)}
              >
                {DAY_PRESETS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="room-max">
                Maks. durasi (jam)
              </label>
              <input
                id="room-max"
                type="number"
                min={1}
                max={12}
                className="input"
                value={maxHours}
                onChange={(event) => setMaxHours(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="room-facilities">
              Fasilitas (pisahkan dengan koma)
            </label>
            <input
              id="room-facilities"
              className="input"
              value={facilities}
              onChange={(event) => setFacilities(event.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="room-description">
              Deskripsi singkat
            </label>
            <textarea
              id="room-description"
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
