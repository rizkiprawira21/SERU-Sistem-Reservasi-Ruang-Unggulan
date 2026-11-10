# ASUMSI & KEPUTUSAN

Dokumen ini menjawab "Pertanyaan Terbuka" pada PRD bagian 15/17. Semua nilai
berada di `lib/config.ts` sehingga mudah diubah tanpa menyentuh alur UI. Nilai
yang berasal dari PRD (aturan hari ruangan) disimpan di `prisma/seed.ts` per ruangan.

| # | Topik | Keputusan yang dipakai | Alasan |
| --- | --- | --- | --- |
| 1 | Siapa yang boleh meminjam | Mahasiswa, dosen, dan staf IDB Bali (akun kampus). Eksternal tidak. | Instruksi MVP |
| 2 | Jam operasional | Default 07.00–21.00 WITA. Jam per ruangan dapat diubah di data `Room` (JSON per hari). | Instruksi default; tetap fleksibel |
| 3 | Aturan hari khusus | Aula Senin–Sabtu, Sabtu selesai ≤ 14.00, Minggu tutup. Creative Gallery setiap hari 09.00–20.00. Lab dan studio Senin–Sabtu (Minggu tutup). Ruang Meeting mengikuti jam kantor. | PRD 4.1–4.2 + jam fasilitas IDB Bali |
| 4 | Durasi | Minimum 60 menit. Maksimum 4 jam; Aula 8 jam. Tersimpan per ruangan (`maxDurationMin`). | Instruksi default + PRD |
| 5 | Jendela pengajuan | Paling cepat H-2 (tanggal ≥ hari ini + 2) dan paling lambat 30 hari ke depan. | Instruksi default |
| 6 | Persetujuan | Semua pengajuan lewat persetujuan admin; tidak ada auto-approve. | Instruksi default |
| 7 | Slot ditahan | Status `MENUNGGU` dan `DISETUJUI` menahan slot. Penolakan/pembatalan melepas slot. | PRD 7.1 |
| 8 | Pembatalan pemohon | Pemohon dapat membatalkan pengajuan `MENUNGGU` atau `DISETUJUI` selama waktu mulai belum lewat. | Instruksi MVP BK-03 |
| 9 | Admin membatalkan | Admin dapat membatalkan dengan alasan wajib; pemohon menerima email (NT-02). | PRD 6.5 |
| 10 | Notifikasi | Email untuk pengajuan diterima, disetujui, ditolak, dan dibatalkan admin. Mock ditulis ke console + tabel `Outbox`. SMTP opsional via env. | Instruksi NT-01/NT-02 |
| 11 | Jadwal kuliah | Direpresentasikan sebagai `RoomBlock` hasil seed (prioritas tertinggi) pada lab, studio, dan ruang kelas. | Instruksi default |
| 12 | Zona waktu | Semua tanggal disimpan `YYYY-MM-DD` dan jam sebagai menit sejak 00.00 WITA. Tidak ada konversi UTC di database. | PRD 4.3, 10.2 |
| 13 | Referensi | Format `SERU-YYYY-NNNN` (nomor acak 4 digit, unik) agar tidak mudah ditebak. | PRD 5.5/10.2 |
| 14 | Alasan | Wajib, minimal 20 karakter. Penolakan admin wajib beralasan minimal 5 karakter. | PRD 5.2/6.4 |
| 15 | Data pribadi | Pemohon hanya melihat pengajuan miliknya. Admin melihat detail untuk verifikasi. Tidak ada data pribadi di halaman publik. | PRD 5.6/7.2 |
| 16 | Retensi & SSO | Di luar MVP; skema user/sesi dibuat agar penggantian ke SSO dan kebijakan retensi mudah. | PRD 2.2 |

## Data ruangan & sumber

- Daftar ruangan mengikuti halaman resmi **Fasilitas Kampus IDB Bali**:
  Aula, Creative Gallery, Lab Komputer, Lab iMac, Lab Software Development,
  Lab Fashion Design, Studio Pola, Studio Foto, Ruang Meeting, dan Ruang Kelas
  Magister. Kantin, Lobby, Ruang Dosen, dan area layanan internal tidak
  dijadikan ruang reservasi karena bukan ruang kegiatan yang dapat dipesan.
- Foto ruangan diambil dari halaman fasilitas resmi IDB Bali dan disimpan lokal
  di `public/rooms/` agar cepat dimuat.
- Video hero adalah potongan **10 detik** dari video kampus referensi
  `hero-campus.mp4` (1920×960), diputar berulang tanpa audio. Poster fallback,
  kontrol jeda, dan mode gerak-rendah disediakan agar tetap nyaman diakses.
- Lantai yang tercantum di situs: Creative Gallery, Lab Fashion Design, Studio
  Pola, Studio Foto (Lantai 1), Ruang Meeting (Lantai 2). Lantai lain dipetakan
  ke Gedung A (Utama) untuk area rektorat/pascasarjana dan Gedung C
  (Perkuliahan) untuk laboratorium/studio; dapat diubah admin tanpa mengubah
  kode.

## Catatan implementasi

- **Konkurensi**: advisory lock PostgreSQL + trigger + transaksi memastikan tidak ada dua reservasi
  tumpang tindih, termasuk saat dua permintaan datang bersamaan.
- **Email**: `lib/mailer.ts` selalu menulis ke `Outbox`; bila `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` diisi, email juga dikirim via SMTP.
- **PWA**: manifest + service worker sederhana (cache aset statis, network-first
  untuk halaman) agar dapat dipasang di HP tanpa mengorbankan kesegaran data.
- **Bonus yang dikerjakan**: AV-02 (filter ketersediaan), BK-04 (validasi
  kapasitas/jam/durasi), RM-02 (kelola ruangan), RM-04 (blokir jadwal), US-01
  (daftar reservasi hari ini di dashboard staf).
- **Di luar lingkup**: SSO sungguhan, WhatsApp/SMS, pembayaran, multi-hari,
  ekspor laporan, dan permintaan perbaikan (status `PERLU_PERBAIKAN`) — skema
  disiapkan agar mudah ditambah.
