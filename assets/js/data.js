/* SERU — shared data model, rules, session, storage and availability helpers */

const STORAGE_KEY = 'seru_bookings_v3';
const SEED_KEY = 'seru_seeded_v3';
const USER_KEY = 'seru_user_v1';

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const WEEKDAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const HOLDING_STATUSES = ['menunggu', 'perlu-perbaikan', 'disetujui'];

const STATUS_LABELS = {
  menunggu: 'Menunggu',
  'perlu-perbaikan': 'Perlu Perbaikan',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
  selesai: 'Selesai'
};

const STATUS_HINTS = {
  menunggu: 'Pengajuan sedang ditinjau staf sarana prasarana.',
  'perlu-perbaikan': 'Staf meminta perbaikan data. Buka detail untuk membaca catatan.',
  disetujui: 'Ruangan sudah dikunci untuk kegiatan Anda.',
  ditolak: 'Pengajuan ditolak. Lihat alasan dari staf.',
  dibatalkan: 'Pengajuan dibatalkan dan slot ruangan dibuka kembali.',
  selesai: 'Kegiatan selesai dilaksanakan.'
};

const APPLICANT_TYPES = ['Mahasiswa', 'Dosen', 'Staf', 'UKM', 'HMJ'];

const CATEGORIES = ['Ruang kelas', 'Studio', 'Laboratorium', 'Ruang rapat', 'Aula', 'Galeri'];

const FACILITY_OPTIONS = [
  'Proyektor', 'Layar / TV', 'Sound system', 'Mikrofon',
  'AC', 'Papan tulis', 'Meja & kursi', 'Koneksi internet',
  'Panggung', 'Tata cahaya', 'Area pameran', 'Komputer NVIDIA',
  'Jaringan LAN', 'iMac M1', 'Meja kerja', 'Komputer performa tinggi',
  'Internet cepat', 'Meja ergonomis', 'Mesin jahit', 'Meja potong',
  'Manekin', 'Meja pola', 'Backdrop', 'Lighting', 'Properti',
  'Meja bundar', 'Display karya', 'Kamera hybrid', 'Layar'
];

const MIN_DAYS_AHEAD = 2;
const MAX_DAYS_AHEAD = 30;

function hoursRange(start, end) {
  return { start: start, end: end };
}

const AULA_HOURS = { 1: hoursRange('07:00', '21:00'), 2: hoursRange('07:00', '21:00'), 3: hoursRange('07:00', '21:00'), 4: hoursRange('07:00', '21:00'), 5: hoursRange('07:00', '21:00'), 6: hoursRange('07:00', '14:00') };
const GALLERY_HOURS = { 0: hoursRange('09:00', '20:00'), 1: hoursRange('09:00', '20:00'), 2: hoursRange('09:00', '20:00'), 3: hoursRange('09:00', '20:00'), 4: hoursRange('09:00', '20:00'), 5: hoursRange('09:00', '20:00'), 6: hoursRange('09:00', '20:00') };
const LAB_HOURS = { 1: hoursRange('08:00', '21:00'), 2: hoursRange('08:00', '21:00'), 3: hoursRange('08:00', '21:00'), 4: hoursRange('08:00', '21:00'), 5: hoursRange('08:00', '21:00'), 6: hoursRange('08:00', '21:00') };
const STUDIO_HOURS = { 1: hoursRange('08:00', '21:00'), 2: hoursRange('08:00', '21:00'), 3: hoursRange('08:00', '21:00'), 4: hoursRange('08:00', '21:00'), 5: hoursRange('08:00', '21:00'), 6: hoursRange('08:00', '21:00') };
const MEETING_HOURS = { 1: hoursRange('08:30', '17:00'), 2: hoursRange('08:30', '17:00'), 3: hoursRange('08:30', '17:00'), 4: hoursRange('08:30', '17:00'), 5: hoursRange('08:30', '17:00'), 6: hoursRange('08:30', '14:00') };
const MAGISTER_HOURS = { 1: hoursRange('08:00', '21:00'), 2: hoursRange('08:00', '21:00'), 3: hoursRange('08:00', '21:00'), 4: hoursRange('08:00', '21:00'), 5: hoursRange('08:00', '21:00'), 6: hoursRange('08:00', '14:00') };

const ROOMS = [
  {
    id: 'aula',
    name: 'Aula',
    photo: 'assets/img/rooms/aula.jpg',
    category: 'Aula',
    building: 'Gedung A (Utama)',
    floor: 'Lantai 1',
    capacity: 250,
    maxHours: 8,
    blurb: 'Hall/Aula IDB Bali dengan fasilitas lengkap untuk seminar, workshop, pelatihan, dan kegiatan UKM.',
    facilities: ['Panggung', 'Sound system', 'Mikrofon', 'Proyektor', 'AC', 'Tata cahaya', 'Meja & kursi'],
    rules: AULA_HOURS,
    blocked: []
  },
  {
    id: 'creative-gallery',
    name: 'Creative Gallery',
    photo: 'assets/img/rooms/creative-gallery.jpg',
    category: 'Galeri',
    building: 'Gedung A (Utama)',
    floor: 'Lantai 1',
    capacity: 80,
    maxHours: 4,
    blurb: 'Galeri karya mahasiswa dari seluruh program studi, cocok untuk pameran, talkshow, dan peluncuran karya.',
    facilities: ['Area pameran', 'Tata cahaya', 'Sound system', 'AC'],
    rules: GALLERY_HOURS,
    blocked: []
  },
  {
    id: 'lab-komputer',
    name: 'Lab Komputer',
    photo: 'assets/img/rooms/lab-komputer.jpg',
    category: 'Laboratorium',
    building: 'Gedung C (Perkuliahan)',
    floor: 'Lantai 2',
    capacity: 36,
    maxHours: 4,
    blurb: 'Lab komputer dengan CPU Intel 12th gen dan GPU NVIDIA, terhubung LAN, untuk praktikum dan pelatihan.',
    facilities: ['Komputer NVIDIA', 'Jaringan LAN', 'Koneksi internet', 'AC', 'Proyektor'],
    rules: LAB_HOURS,
    blocked: [{ days: [1, 2, 3, 4, 5], start: '08:00', end: '12:00', label: 'Jadwal praktikum' }]
  },
  {
    id: 'lab-imac',
    name: 'Lab iMac',
    photo: 'assets/img/rooms/lab-imac.jpg',
    category: 'Laboratorium',
    building: 'Gedung C (Perkuliahan)',
    floor: 'Lantai 2',
    capacity: 30,
    maxHours: 4,
    blurb: 'Lab desain dengan iMac M1 untuk praktik desain, ilustrasi, editing, dan produksi karya digital.',
    facilities: ['iMac M1', 'Koneksi internet', 'AC', 'Proyektor', 'Meja kerja'],
    rules: LAB_HOURS,
    blocked: [{ days: [2, 4], start: '13:00', end: '16:00', label: 'Jadwal praktikum' }]
  },
  {
    id: 'lab-software-development',
    name: 'Lab Software Development',
    photo: 'assets/img/rooms/lab-software.jpg',
    category: 'Laboratorium',
    building: 'Gedung C (Perkuliahan)',
    floor: 'Lantai 2',
    capacity: 35,
    maxHours: 4,
    blurb: 'Lab modern untuk praktikum, penelitian, dan pengembangan proyek teknologi informasi dan bisnis digital.',
    facilities: ['Komputer performa tinggi', 'Internet cepat', 'AC', 'Proyektor', 'Meja ergonomis'],
    rules: LAB_HOURS,
    blocked: [{ days: [1, 3], start: '10:00', end: '12:00', label: 'Jadwal kelas' }]
  },
  {
    id: 'lab-fashion-design',
    name: 'Lab Fashion Design',
    photo: 'assets/img/rooms/lab-fashion.jpg',
    category: 'Laboratorium',
    building: 'Gedung C (Perkuliahan)',
    floor: 'Lantai 1',
    capacity: 25,
    maxHours: 4,
    blurb: 'Lab untuk mahasiswa Desain Mode mengembangkan produk fashion secara digital maupun manual.',
    facilities: ['Mesin jahit', 'Meja potong', 'Manekin', 'AC'],
    rules: STUDIO_HOURS,
    blocked: []
  },
  {
    id: 'studio-pola',
    name: 'Studio Pola',
    photo: 'assets/img/rooms/studio-pola.jpg',
    category: 'Studio',
    building: 'Gedung C (Perkuliahan)',
    floor: 'Lantai 1',
    capacity: 25,
    maxHours: 4,
    blurb: 'Studio menggambar pola dan memotong bahan, menjadi ruang awal proses karya fashion mahasiswa.',
    facilities: ['Meja pola', 'Meja potong', 'Manekin', 'AC'],
    rules: STUDIO_HOURS,
    blocked: [{ days: [2], start: '08:00', end: '11:00', label: 'Jadwal praktik' }]
  },
  {
    id: 'studio-foto',
    name: 'Studio Foto',
    photo: 'assets/img/rooms/studio-foto.jpg',
    category: 'Studio',
    building: 'Gedung C (Perkuliahan)',
    floor: 'Lantai 1',
    capacity: 20,
    maxHours: 4,
    blurb: 'Studio fotografi dan videografi dengan backdrop serta properti penunjang untuk seluruh program studi.',
    facilities: ['Backdrop', 'Lighting', 'Properti', 'AC', 'Koneksi internet'],
    rules: STUDIO_HOURS,
    blocked: [{ days: [2, 4], start: '13:00', end: '15:00', label: 'Jadwal kelas fotografi' }]
  },
  {
    id: 'ruang-meeting',
    name: 'Ruang Meeting',
    photo: 'assets/img/rooms/ruang-meeting.jpg',
    category: 'Ruang rapat',
    building: 'Gedung A (Utama)',
    floor: 'Lantai 2',
    capacity: 20,
    maxHours: 4,
    blurb: 'Ruang pertemuan dengan meja bundar dan proyektor, dihiasi display karya mahasiswa.',
    facilities: ['Proyektor', 'Meja bundar', 'AC', 'Display karya'],
    rules: MEETING_HOURS,
    blocked: []
  },
  {
    id: 'ruang-kelas-magister',
    name: 'Ruang Kelas Magister',
    photo: 'assets/img/rooms/ruang-magister.jpg',
    category: 'Ruang kelas',
    building: 'Gedung A (Utama)',
    floor: 'Lantai 3',
    capacity: 30,
    maxHours: 4,
    blurb: 'Ruang kelas Program Magister dengan kamera dan peralatan digital untuk perkuliahan tatap muka maupun daring.',
    facilities: ['Kamera hybrid', 'Layar', 'AC', 'Koneksi internet', 'Meja & kursi'],
    rules: MAGISTER_HOURS,
    blocked: [{ days: [1, 2, 3, 4, 5], start: '08:00', end: '10:00', label: 'Jadwal kuliah' }]
  }
];

/* ---------- Date and time helpers ---------- */

function timeToMin(t) {
  const parts = String(t).split(':');
  return Number(parts[0]) * 60 + Number(parts[1] || 0);
}

function minToTime(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

function parseDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

function dayIndex(dateStr) {
  return parseDate(dateStr).getDay();
}

function dayName(dateStr) {
  return WEEKDAYS[dayIndex(dateStr)];
}

function dayNameShort(dateStr) {
  return WEEKDAYS_SHORT[dayIndex(dateStr)];
}

function formatDate(dateStr) {
  const d = parseDate(dateStr);
  return WEEKDAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}

function formatDateShort(dateStr) {
  const d = parseDate(dateStr);
  return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function minBookingISO() {
  return addDays(todayISO(), MIN_DAYS_AHEAD);
}

function maxBookingISO() {
  return addDays(todayISO(), MAX_DAYS_AHEAD);
}

function suggestedDateISO() {
  return addDays(todayISO(), 3);
}

function nextWeekday(fromISO, targetDay) {
  let d = parseDate(fromISO);
  let guard = 0;
  while (d.getDay() !== targetDay && guard < 14) {
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return isoDate(d);
}

function ruleFor(room, dateStr) {
  return room.rules[dayIndex(dateStr)] || null;
}

function roomById(id) {
  return ROOMS.find(function (r) { return r.id === id; });
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return timeToMin(aStart) < timeToMin(bEnd) && timeToMin(bStart) < timeToMin(aEnd);
}

function isHolding(booking) {
  return HOLDING_STATUSES.indexOf(booking.status) !== -1;
}

function isEditable(booking) {
  return booking.status === 'menunggu' || booking.status === 'perlu-perbaikan';
}

/* Start of a booking in local time */
function bookingStart(booking) {
  return new Date(booking.date + 'T' + booking.start + ':00');
}

function canCancel(booking) {
  if (booking.status !== 'menunggu' && booking.status !== 'disetujui') return false;
  return bookingStart(booking).getTime() > Date.now();
}

/* ---------- Storage ---------- */

function getBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveBookings(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  try {
    window.dispatchEvent(new CustomEvent('seru:bookings', { detail: list }));
  } catch (e) { /* ignore */ }
}

function addBooking(booking) {
  const list = getBookings();
  list.push(booking);
  saveBookings(list);
  return booking;
}

function updateBooking(id, patch) {
  const list = getBookings();
  const idx = list.findIndex(function (b) { return b.id === id; });
  if (idx === -1) return null;
  list[idx] = Object.assign({}, list[idx], patch);
  saveBookings(list);
  return list[idx];
}

function nextRef(list) {
  const year = new Date().getFullYear();
  let max = 0;
  list.forEach(function (b) {
    const m = /IDB-\d{4}-(\d+)/.exec(b.ref || '');
    if (m) max = Math.max(max, Number(m[1]));
  });
  return 'IDB-' + year + '-' + String(max + 1).padStart(4, '0');
}

/* ---------- Session ---------- */

const DEMO_USERS = {
  pemohon: {
    role: 'pemohon',
    name: 'Rani Pradnyani',
    identity: '2023010045',
    type: 'Mahasiswa',
    email: 'rani@idb.ac.id',
    whatsapp: '081234567800',
    org: '',
    position: ''
  },
  admin: {
    role: 'admin',
    name: 'Dimas Saputra',
    identity: 'STF-001',
    type: 'Staf',
    email: 'dimas@idb.ac.id',
    whatsapp: '081234567899',
    org: 'Sarana Prasarana',
    position: 'Admin Ruangan'
  }
};

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  try {
    window.dispatchEvent(new CustomEvent('seru:auth', { detail: user }));
  } catch (e) { /* ignore */ }
}

function logoutUser() {
  localStorage.removeItem(USER_KEY);
  try {
    window.dispatchEvent(new CustomEvent('seru:auth', { detail: null }));
  } catch (e) { /* ignore */ }
}

function isAdmin() {
  const u = getCurrentUser();
  return !!u && u.role === 'admin';
}

/* ---------- Availability ---------- */

/* Returns { status, selectable, label, reason, rule, conflict, block }.
   status: available | pending | booked | blocked | rule | invalid */
function getAvailability(room, dateStr, start, end, bookings) {
  const list = bookings || getBookings();
  const wd = dayIndex(dateStr);
  const rule = ruleFor(room, dateStr);

  if (!rule) {
    return {
      status: 'rule',
      selectable: false,
      label: 'Tutup hari ini',
      reason: room.name + ' tidak beroperasi pada hari ' + WEEKDAYS[wd] + '.',
      rule: null
    };
  }

  if (!start || !end || timeToMin(end) <= timeToMin(start)) {
    return {
      status: 'invalid',
      selectable: false,
      label: 'Jam tidak valid',
      reason: 'Jam selesai harus lebih akhir daripada jam mulai.',
      rule: rule
    };
  }

  if (timeToMin(start) < timeToMin(rule.start) || timeToMin(end) > timeToMin(rule.end)) {
    return {
      status: 'rule',
      selectable: false,
      label: 'Di luar jam operasional',
      reason: room.name + ' hanya tersedia pukul ' + rule.start + '–' + rule.end + ' pada hari ' + WEEKDAYS[wd] + '.',
      rule: rule
    };
  }

  if (timeToMin(end) - timeToMin(start) > room.maxHours * 60) {
    return {
      status: 'rule',
      selectable: false,
      label: 'Melebihi durasi',
      reason: 'Durasi maksimum ' + room.name + ' adalah ' + room.maxHours + ' jam per peminjaman.',
      rule: rule
    };
  }

  const block = (room.blocked || []).find(function (b) {
    return b.days.indexOf(wd) !== -1 && overlap(start, end, b.start, b.end);
  });
  if (block) {
    return {
      status: 'blocked',
      selectable: false,
      label: 'Diblokir',
      reason: block.label + ' ' + block.start + '–' + block.end + ' memiliki prioritas akademik.',
      rule: rule,
      block: block
    };
  }

  const conflict = list.find(function (b) {
    return b.roomId === room.id && b.date === dateStr && isHolding(b) &&
      overlap(start, end, b.start, b.end);
  });

  if (conflict) {
    const pending = conflict.status === 'menunggu' || conflict.status === 'perlu-perbaikan';
    return {
      status: pending ? 'pending' : 'booked',
      selectable: false,
      label: pending ? 'Menunggu persetujuan' : 'Terisi',
      reason: pending
        ? 'Ada pengajuan lain yang menunggu keputusan pada ' + conflict.start + '–' + conflict.end + ' (' + conflict.ref + ').'
        : 'Sudah terisi ' + conflict.start + '–' + conflict.end + ' oleh ' + conflict.ref + '.',
      rule: rule,
      conflict: conflict
    };
  }

  return {
    status: 'available',
    selectable: true,
    label: 'Tersedia',
    reason: 'Ruangan dapat dipinjam pada rentang waktu ini.',
    rule: rule,
    block: null
  };
}

/* Blocks inside one day for the schedule board. */
function dayBlocks(room, dateStr, bookings) {
  const list = bookings || getBookings();
  const blocks = [];

  (room.blocked || []).forEach(function (b) {
    if (b.days.indexOf(dayIndex(dateStr)) !== -1) {
      blocks.push({ start: b.start, end: b.end, type: 'blocked', label: b.label });
    }
  });

  list.forEach(function (b) {
    if (b.roomId === room.id && b.date === dateStr && isHolding(b)) {
      blocks.push({
        start: b.start,
        end: b.end,
        type: b.status === 'disetujui' ? 'booked' : 'pending',
        label: b.activity,
        ref: b.ref
      });
    }
  });

  return blocks.sort(function (a, b) { return timeToMin(a.start) - timeToMin(b.start); });
}

function primaryHours(room) {
  const days = Object.keys(room.rules).map(Number).sort(function (a, b) { return a - b; });
  const r = room.rules[days[0]];
  return r ? r.start + '–' + r.end : '—';
}

function roomRuleSummary(room) {
  const days = Object.keys(room.rules).map(Number).sort(function (a, b) { return a - b; });
  const first = room.rules[days[0]];
  const allSame = days.every(function (d) {
    return room.rules[d].start === first.start && room.rules[d].end === first.end;
  });
  let hoursText = first.start + '–' + first.end;
  if (!allSame) {
    const last = room.rules[days[days.length - 1]];
    hoursText = first.start + '–' + first.end + ' (bervariasi)';
    if (last) hoursText = 'Jam bervariasi per hari';
  }
  const closed = WEEKDAYS.filter(function (_, idx) { return !room.rules[idx]; });
  return (allSame ? days.map(function (d) { return WEEKDAYS_SHORT[d]; }).join(' · ') : 'Hari tertentu') +
    ' · ' + hoursText + (closed.length ? ' · tutup ' + closed.map(function (d) { return d.slice(0, 3); }).join('/') : '');
}

function statusClass(status) {
  return 'status status--' + status;
}

/* ---------- Demo data ---------- */

function seedDemoData() {
  if (localStorage.getItem(SEED_KEY)) return;
  const existing = getBookings();
  if (existing.length) { localStorage.setItem(SEED_KEY, '1'); return; }

  const year = new Date().getFullYear();
  const now = new Date().toISOString();
  const base = suggestedDateISO();

  const demo = [
    {
      id: 'seed-1',
      ref: 'IDB-' + year + '-0001',
      applicantType: 'UKM',
      name: 'Ni Made Ayu Lestari',
      nim: '2023010045',
      org: 'UKM Fotografi',
      position: 'Ketua',
      email: 'fotografi@idb.ac.id',
      whatsapp: '081234567801',
      activity: 'Workshop Fotografi Produk',
      reason: 'Pelatihan anggota UKM untuk persiapan pameran karya akhir semester.',
      participants: 24,
      facilities: ['AC', 'Koneksi internet', 'Backdrop', 'Lighting'],
      roomId: 'studio-foto',
      roomName: 'Studio Foto',
      date: base,
      start: '10:00',
      end: '12:00',
      status: 'disetujui',
      createdAt: now,
      history: [{ status: 'menunggu', at: now, by: 'Pemohon', note: 'Pengajuan dibuat.' },
                { status: 'disetujui', at: now, by: 'Staf pengelola', note: 'Disetujui, ruangan siap dipakai.' }]
    },
    {
      id: 'seed-2',
      ref: 'IDB-' + year + '-0002',
      applicantType: 'HMJ',
      name: 'I Putu Bagus Wijaya',
      nim: '2022010012',
      org: 'HMJ Desain Komunikasi Visual',
      position: 'Sekretaris',
      email: 'hmjdkv@idb.ac.id',
      whatsapp: '081234567802',
      activity: 'Rapat Kerja Pengurus',
      reason: 'Koordinasi program kerja semester ganjil bersama seluruh pengurus HMJ.',
      participants: 35,
      facilities: ['AC', 'Proyektor', 'Meja & kursi'],
      roomId: 'aula',
      roomName: 'Aula',
      date: base,
      start: '13:00',
      end: '16:00',
      status: 'menunggu',
      createdAt: now,
      history: [{ status: 'menunggu', at: now, by: 'Pemohon', note: 'Pengajuan dibuat dan slot ditahan sementara.' }]
    },
    {
      id: 'seed-4',
      ref: 'IDB-' + year + '-0004',
      applicantType: 'UKM',
      name: 'Komunitas Desain Produk',
      nim: '2022020031',
      org: 'UKM Desain Produk',
      position: 'Koordinator',
      email: 'desainproduk@idb.ac.id',
      whatsapp: '081234567804',
      activity: 'Gladi Bersih Pameran Karya',
      reason: 'Penataan karya dan gladi bersih sebelum pameran dibuka untuk umum besok pagi.',
      participants: 40,
      facilities: ['AC', 'Tata cahaya', 'Sound system', 'Area pameran'],
      roomId: 'creative-gallery',
      roomName: 'Creative Gallery',
      date: todayISO(),
      start: '13:00',
      end: '15:00',
      status: 'disetujui',
      createdAt: now,
      history: [{ status: 'menunggu', at: now, by: 'Pemohon', note: 'Pengajuan dibuat.' },
                { status: 'disetujui', at: now, by: 'Staf pengelola', note: 'Disetujui untuk gladi bersih.' }]
    },
    {
      id: 'seed-3',
      ref: 'IDB-' + year + '-0003',
      applicantType: 'Dosen',
      name: 'Sinta Kusuma, M.M.',
      nim: 'NIDN-0912',
      org: '',
      position: '',
      email: 'sinta@idb.ac.id',
      whatsapp: '081234567803',
      activity: 'Bimbingan Skripsi Kelompok',
      reason: 'Bimbingan rutin empat mahasiswa bimbingan sebelum ujian akhir semester.',
      participants: 4,
      facilities: ['AC', 'Proyektor', 'Meja bundar'],
      roomId: 'ruang-meeting',
      roomName: 'Ruang Meeting',
      date: base,
      start: '14:00',
      end: '15:30',
      status: 'disetujui',
      createdAt: now,
      history: [{ status: 'menunggu', at: now, by: 'Pemohon', note: 'Pengajuan dibuat.' },
                { status: 'disetujui', at: now, by: 'Staf pengelola', note: 'Prioritas akademik disetujui.' }]
    }
  ];

  saveBookings(demo);
  localStorage.setItem(SEED_KEY, '1');
}
