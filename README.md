# SERU — Sistem Reservasi Ruang Unggulan IDB Bali

Aplikasi web untuk melihat ketersediaan, mengajukan, dan mengelola reservasi
ruangan Institut Desain dan Bisnis Bali. Dibangun mengikuti PRD **RUMA IDB 1.1**
(nama produk kini SERU) dengan lingkup MVP: alur pemohon, dashboard admin, pencegahan bentrok di server,
notifikasi email, riwayat, dan audit.

## Fitur

- **Akun kampus & RBAC** — login email + kata sandi (bcrypt), sesi cookie
  httpOnly, peran `PEMOHON` dan `ADMIN` diperiksa di server.
- **Katalog ruangan** — 10 ruangan asli IDB Bali (Aula, Creative Gallery, Lab
  Komputer, Lab iMac, Lab Software Development, Lab Fashion Design, Studio Pola,
  Studio Foto, Ruang Meeting, Ruang Kelas Magister) dengan foto, kapasitas,
  fasilitas, dan aturan hari.
- **Jadwal dulu, ruangan kemudian** — pemohon memilih tanggal & jam, lalu sistem
  menampilkan semua ruangan beserta status: tersedia, dipesan, ditahan, diblokir,
  atau tidak sesuai aturan.
- **Anti double-booking** — pengecekan dan penyimpanan dalam satu transaksi,
  ditambah trigger SQLite atomik. Dua permintaan bersamaan pada slot yang sama:
  hanya satu yang berhasil (diuji otomatis).
- **Pengajuan & pembatalan** — alasan wajib, validasi kapasitas/jam/durasi,
  nomor referensi, linimasa status, pembatalan sebelum waktu mulai.
- **Dashboard admin** — statistik, antrean menunggu, filter/pencarian, aksi
  setujui/tolak dengan alasan, verifikasi aturan & konflik otomatis, pembatalan
  oleh admin, daftar reservasi hari ini.
- **Email** — setiap notifikasi ditulis ke console dan tabel **Outbox** yang
  dapat dilihat admin. SMTP opsional lewat variabel lingkungan.
- **Zona waktu WITA** — tanggal disimpan `YYYY-MM-DD`, jam disimpan sebagai
  menit; semua tampilan memakai Asia/Makassar.
- **Responsif & aksesibel** — mobile-first, navigasi bawah di HP, topbar di
  desktop, mode terang/gelap (system/manual, tersimpan), fokus terlihat,
  kontras WCAG AA (diaudit dengan axe), target sentuh 44px.
- **PWA** — manifest, ikon, dan service worker sederhana.
- **Hero video** — video kampus IDB Bali **10 detik** (sama dengan referensi `hero-campus.mp4`), diputar berulang, tanpa audio, dengan kontrol jeda, poster fallback, dan mode gerak-rendah.
- **Bonus ringan** — filter ketersediaan, validasi kapasitas, kelola ruangan,
  blokir jadwal, daftar reservasi hari ini.

## Prasyarat

- Node.js **20 atau lebih baru** (diuji pada Node 22)
- npm
- Tidak perlu server database — SQLite berjalan lokal

## Cara menjalankan

```bash
# 1. Install dependensi
npm install

# 2. Siapkan environment (sudah ada .env bawaan; contoh tersedia)
cp .env.example .env   # lewati jika .env sudah ada

# 3. Buat schema, trigger anti-bentrok, dan data seed
npm run db:setup

# 4. Jalankan aplikasi
npm run dev
```

Buka <http://localhost:3000>.

Jika database ingin dikembalikan ke kondisi awal:

```bash
npm run db:reset
```

## Akun demo

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin ruangan | `admin@idb.ac.id` | `Admin123!` |
| Mahasiswa | `mahasiswa@idb.ac.id` | `Mahasiswa123!` |

Halaman masuk: `/masuk`. Akun demo juga bisa diklik langsung pada formulir.
Admin/staf menggunakan halaman masuk yang sama; sistem otomatis mengarahkan
mereka ke `/staf`. Tidak ada bagian khusus admin di beranda publik.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run lint` / `npm run typecheck` | Pemeriksaan TypeScript (`tsc --noEmit`) |
| `npm test` | Semua tes Vitest (unit, alur, konkurensi) |
| `npm run db:setup` | `prisma db push` + trigger + seed |
| `npm run db:reset` | Reset paksa + trigger + seed |
| `npm run db:seed` | Seed ulang tanpa reset schema |

## Pengujian

```bash
npm test
```

- `tests/rules.test.ts` — tumpang tindih interval, jendela H-2/30 hari, durasi,
  aturan hari & jam (Lab iMac akhir pekan, Aula Minggu, Aula Sabtu ≤ 14.00).
- `tests/flow.test.ts` — ajukan → setujui, tolak wajib alasan, pembatalan
  pemohon, pembatalan admin + email, kapasitas, kontrol akses.
- `tests/concurrency.test.ts` — dua dan tiga permintaan bersamaan pada slot yang
  sama; tepat satu tersimpan, sisanya menerima konflik.

Tes memakai database terpisah `prisma/test.db` yang dibuat ulang otomatis.

## Struktur proyek

```
app/
  api/                 Route handler (auth, availability, bookings, staff, admin)
  masuk/               Login akun kampus
  pinjam/              Wizard pemohon (3 langkah)
  riwayat/             Riwayat & detail pengajuan
  staf/                Dashboard, detail, ruangan, jadwal, outbox
  layout.tsx           Chrome aplikasi, tema, PWA
components/            Komponen UI & ikon (hero video, katalog interaktif)
public/rooms/          Foto ruangan & poster video dari fasilitas IDB Bali
lib/
  auth.ts              Sesi, hash, RBAC
  rules.ts             Aturan bisnis murni
  bookings.ts          Service transaksi (buat/setujui/tolak/batalkan)
  rooms.ts             Ketersediaan & saran alternatif
  staff.ts             Query dashboard admin
  mailer.ts            Mock mailer + Outbox + SMTP opsional
  config.ts            Konfigurasi & asumsi default
prisma/
  schema.prisma        Skema database
  migrations/          Migrasi + trigger anti-bentrok
  seed.ts              Data awal (10 ruangan asli IDB Bali)
tests/                 Tes unit, alur, konkurensi
```

## Konfigurasi aturan

Nilai default berada di `lib/config.ts` dan dapat diubah tanpa menyentuh UI:

- Pengajuan **H-2 s.d. 30 hari** ke depan
- Durasi **1–4 jam** (Aula 8 jam)
- Jam operasional **07.00–21.00 WITA**
- Alasan minimal 20 karakter
- Slot ditahan saat status Menunggu

Aturan hari per ruangan (mis. Aula tutup Minggu dan Sabtu ≤ 14.00, lab/studio
tutup Minggu, Ruang Meeting mengikuti jam kantor) disimpan di `hoursJson` setiap
ruangan pada seed dan dapat diubah admin lewat data ruangan. Rincian keputusan
ada di **ASSUMPTIONS.md**.

## Keamanan

- Kata sandi di-hash bcrypt; token sesi acak 256-bit dan disimpan sebagai hash
  SHA-256 di database; cookie `httpOnly`, `SameSite=Lax`, `Secure` di produksi.
- RBAC diperiksa di setiap halaman server dan route handler; bukan hanya menu.
- Validasi input di server (termasuk kapasitas, jendela waktu, jam, durasi).
- Proteksi CSRF: permintaan mutasi browser wajib berasal dari origin yang sama.
- XSS: output React di-escape; tidak ada HTML mentah dari pengguna.
- Header keamanan: `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS di produksi.
- Audit log untuk login, pembuatan, keputusan, pembatalan, dan perubahan data.
- Data pribadi pemohon hanya diakses pemilik dan admin; ketersediaan publik
  hanya menampilkan rentang jam, bukan identitas.

Untuk produksi: gunakan HTTPS di depan aplikasi, ganti `DATABASE_URL` ke
PostgreSQL bila perlu (skema kompatibel), dan konfigurasikan SMTP.

## Email

Tanpa konfigurasi tambahan, email ditulis ke console dan tabel Outbox
(`/staf/outbox`). Untuk mengirim sungguhan, isi pada `.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="SERU <no-reply@idb.ac.id>"
```

## PWA

Buka di HTTPS/localhost, lalu “Tambahkan ke Layar Utama”. Service worker hanya
aktif pada build produksi (`npm run build && npm run start`).

## Sumber data & atribusi

- Profil kampus dan foto ruangan: <https://www.idbbali.ac.id/>, khususnya
  <https://www.idbbali.ac.id/fasilitas-kampus/> dan halaman fasilitas
  masing-masing ruangan.
- Video hero 10 detik memakai berkas referensi kampus `hero-campus.mp4`
  (1920×960) yang dipotong dari video profil IDB Bali. Berkas disimpan lokal
  di `public/rooms/` dan diputar berulang tanpa audio.
- Nama ruangan, deskripsi, kapasitas, dan fasilitas mengikuti fasilitas resmi
  IDB Bali. Beberapa lantai/gedung yang tidak dicantumkan di situs dipetakan
  ke Gedung A (Utama) atau Gedung C (Perkuliahan) sesuai peta kampus; rincian
  ada di `ASSUMPTIONS.md`.

## Catatan status

Sudah selesai (MVP + bonus ringan): UA-01/02, RM-01/02/04, AV-01/02, BK-01–04,
AP-01/02, NT-01/02, RP-01, US-01, tes unit/alur/konkurensi, PWA, mode gelap.

Belum dibangun (di luar lingkup MVP): SSO kampus sungguhan, WhatsApp/SMS,
status Perlu Perbaikan, ekspor laporan, multi-hari, integrasi kalender `.ics`,
dan pembayaran. Skema dan service layer disiapkan agar mudah ditambahkan.
