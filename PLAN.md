# PLAN — SERU (Sistem Reservasi Ruang Unggulan)

Sistem Reservasi Ruang Unggulan Institut Desain dan Bisnis Bali (IDB Bali).
PRD 1.1 menjadi sumber kebenaran; lingkup implementasi mengikuti instruksi MVP
(UA, RM, AV, BK, AP, NT, RP) ditambah bonus ringan yang sudah diselesaikan.

## 1. Tech stack

| Bidang | Pilihan | Alasan |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + React 19 | SSR, route handler API, mudah dideploy |
| Bahasa | TypeScript 5.9 | Validasi tipe di sisi server dan klien |
| Styling | Tailwind CSS 3.4 + design token CSS | Mobile-first, tema terang/gelap, palet teal–oranye IDB Bali |
| Database | Prisma 6 + SQLite | Lokal tanpa server, skema siap PostgreSQL |
| Auth | Sesi cookie httpOnly + bcryptjs | Menggantikan SSO kampus dengan mudah |
| Email | Mailer mock → tabel `Outbox` + console; SMTP opsional | Dapat diaudit admin tanpa layanan eksternal |
| Zona waktu | WITA (Asia/Makassar), tanggal disimpan `YYYY-MM-DD` dan jam sebagai menit | Bebas bug konversi DST/TZ |
| Tes | Vitest (unit + integrasi + konkurensi) | Cepat, cocok untuk service layer |
| PWA | manifest + service worker + ikon | Dapat dipasang di HP |

## 2. Struktur folder

```
app/                     Halaman & route handler (App Router)
  api/                   Endpoint REST (auth, availability, bookings, staff, admin)
  masuk/                 Login akun kampus
  pinjam/                Wizard pemohon (jadwal → ruangan → form → kirim)
  riwayat/               Riwayat & detail pengajuan pemohon
  staf/                  Dashboard antrean, detail, ruangan, jadwal, outbox
components/              Komponen UI (server & client)
lib/                     Konfigurasi, auth, aturan bisnis, service, mailer
prisma/                  Schema, seed, trigger anti-bentrok
public/                  Aset, logo, gambar kampus, ikon PWA
tests/                   Tes aturan, alur, dan konkurensi
```

## 3. Skema database (ringkas)

- **User** — identitas sivitas, peran (`PEMOHON`/`ADMIN`), tipe (mahasiswa/dosen/staf),
  hash kata sandi.
- **Session** — hash token sesi, kedaluwarsa.
- **Room** — nama, kategori, gedung, lantai, kapasitas, foto, fasilitas (JSON),
  jam per hari (JSON, menit), durasi maksimum, aktif.
- **RoomBlock** — blokir pemeliharaan/jadwal kuliah per ruangan, tanggal, rentang.
- **Booking** — nomor referensi unik, pemohon, ruangan, tanggal, jam (menit), detail
  kegiatan, status, catatan staf/alasan penolakan, keputusan.
- **StatusHistory** — jejak status lama → baru, aktor, catatan, waktu.
- **Outbox** — email mock (penerima, subjek, isi, jenis).
- **AuditLog** — aktivitas penting (login, keputusan, pembatalan, perubahan data).

**Anti-bentrok:** trigger SQLite `BEFORE INSERT`/`BEFORE UPDATE` pada `Booking`
menolak (ABORT) setiap baris berstatus menahan slot yang beririsan dengan booking
aktif atau blokir ruangan. Pengecekan aplikasi memberi pesan ramah; trigger menjadi
jaring pengaman atomik lintas koneksi. Semua keputusan/penyimpanan berjalan dalam
transaksi.

## 4. Daftar halaman

| Rute | Akses | Isi |
| --- | --- | --- |
| `/` | Publik | Hero video full-screen, pencarian cepat, katalog interaktif, aturan |
| `/masuk` | Publik | Login + akun demo |
| `/pinjam` | Pemohon | Wizard 3 langkah + kalender + ketersediaan |
| `/riwayat` | Pemohon | Daftar pengajuan + status |
| `/riwayat/[id]` | Pemohon (pemilik) | Detail, linimasa status, batalkan |
| `/staf` | Admin | Statistik, antrean menunggu, filter, aksi cepat, hari ini |
| `/staf/[id]` | Admin | Detail + verifikasi + setujui/tolak/batalkan |
| `/staf/ruangan` | Admin | Kelola ruangan (bonus RM-02) |
| `/staf/jadwal` | Admin | kalender + blokir jadwal (bonus RM-04) |
| `/staf/outbox` | Admin | Kotak email mock (NT) |

## 5. Urutan pengerjaan (fase)

1. Setup proyek, token desain, skema, seed, trigger, auth + RBAC.
2. Katalog ruangan + API ketersediaan + kalender.
3. Wizard pengajuan, validasi, transaksi anti-bentrok, pembatalan, riwayat.
4. Dashboard admin, keputusan, email/outbox, audit.
5. Poles desain, mode gelap, PWA, aksesibilitas, bonus ringan.
6. Tes unit/konkurensi/alur, build, README, ASSUMPTIONS.
7. Rebrand SERU, palet teal–oranye IDB, data/foto ruangan asli, hero video
   video kampus 10 detik, hero full-screen, parallax, scroll reveal, katalog interaktif, dan build akhir.

## 6. Strategi pengujian

- Unit: tumpang tindih interval, jendela H-2–30 hari, durasi, aturan hari/jam
  (Lab iMac akhir pekan, Aula Minggu, Aula Sabtu ≤ 14.00).
- Integrasi alur: ajukan → setujui → tolak dengan alasan → batalkan + outbox.
- Konkurensi: dua `Promise.all` pada slot sama; tepat satu berhasil, satu 409.
- `npm run lint` (tsc), `npm test`, `npm run build` wajib hijau.
