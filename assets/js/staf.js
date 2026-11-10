/* IDB Space — staff dashboard */

(function () {
  const state = {
    tab: 'semua',
    search: '',
    room: '',
    date: '',
    currentId: null
  };

  const els = {};

  function $(id) { return document.getElementById(id); }

  const STATUS_PRIORITY = {
    menunggu: 0,
    'perlu-perbaikan': 1,
    disetujui: 2,
    ditolak: 3,
    dibatalkan: 4,
    selesai: 5
  };

  document.addEventListener('DOMContentLoaded', function () {
    ['live-status', 'stat-menunggu', 'stat-perbaikan', 'stat-disetujui', 'stat-ditolak', 'stat-today',
      'today-date', 'today-list', 'tabs', 'search', 'filter-room', 'filter-date', 'reset-filter', 'queue',
      'drawer', 'drawer-backdrop', 'drawer-close', 'drawer-title', 'drawer-ref',
      'drawer-body', 'drawer-foot', 'admin-gate', 'dash-content'].forEach(function (id) { els[id] = $(id); });

    if (typeof isAdmin === 'function' && !isAdmin()) {
      els['admin-gate'].hidden = false;
      els['dash-content'].hidden = true;
      return;
    }
    els['admin-gate'].hidden = true;
    els['dash-content'].hidden = false;

    const user = getCurrentUser();
    if (user && els['live-status']) {
      els['live-status'].textContent = 'Terhubung · ' + user.name;
    }

    ROOMS.forEach(function (room) {
      const opt = document.createElement('option');
      opt.value = room.id;
      opt.textContent = room.name;
      els['filter-room'].appendChild(opt);
    });

    bind();
    render();

    setInterval(render, 2000);
    window.addEventListener('seru:bookings', render);
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) render();
    });
  });

  function bind() {
    els.tabs.addEventListener('click', function (e) {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      state.tab = btn.getAttribute('data-tab');
      Array.prototype.forEach.call(els.tabs.querySelectorAll('.tab'), function (t) {
        t.classList.toggle('is-active', t === btn);
      });
      render();
    });

    els.search.addEventListener('input', function () {
      state.search = els.search.value.trim().toLowerCase();
      render();
    });
    els['filter-room'].addEventListener('change', function () {
      state.room = els['filter-room'].value;
      render();
    });
    els['filter-date'].addEventListener('change', function () {
      state.date = els['filter-date'].value;
      render();
    });
    els['reset-filter'].addEventListener('click', function () {
      state.search = '';
      state.room = '';
      state.date = '';
      els.search.value = '';
      els['filter-room'].value = '';
      els['filter-date'].value = '';
      render();
    });

    els['drawer-close'].addEventListener('click', closeDrawer);
    els['drawer-backdrop'].addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });

    els.queue.addEventListener('click', function (e) {
      const open = e.target.closest('[data-open]');
      const quick = e.target.closest('[data-quick-approve]');
      if (quick) {
        e.stopPropagation();
        quickApprove(quick.getAttribute('data-quick-approve'));
        return;
      }
      if (open) openDrawer(open.getAttribute('data-open'));
    });

    els['today-list'].addEventListener('click', function (e) {
      const open = e.target.closest('[data-open]');
      if (open) openDrawer(open.getAttribute('data-open'));
    });

    els['drawer-foot'].addEventListener('click', function (e) {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      decide(action.getAttribute('data-action'));
    });
  }

  function sortedBookings() {
    return getBookings().slice().sort(function (a, b) {
      const pa = STATUS_PRIORITY[a.status] == null ? 9 : STATUS_PRIORITY[a.status];
      const pb = STATUS_PRIORITY[b.status] == null ? 9 : STATUS_PRIORITY[b.status];
      if (pa !== pb) return pa - pb;
      if (a.status === 'menunggu' || a.status === 'perlu-perbaikan') {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.start < b.start ? -1 : 1;
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }

  function render() {
    const all = sortedBookings();

    const counts = { semua: all.length, menunggu: 0, 'perlu-perbaikan': 0, disetujui: 0, ditolak: 0 };
    all.forEach(function (b) {
      if (counts[b.status] != null) counts[b.status]++;
    });
    els['stat-menunggu'].textContent = counts.menunggu;
    els['stat-perbaikan'].textContent = counts['perlu-perbaikan'];
    els['stat-disetujui'].textContent = counts.disetujui;
    els['stat-ditolak'].textContent = counts.ditolak;
    Array.prototype.forEach.call(els.tabs.querySelectorAll('[data-count]'), function (el) {
      el.textContent = counts[el.getAttribute('data-count')] || 0;
    });

    renderToday(all);

    const filtered = all.filter(function (b) {
      if (state.tab !== 'semua' && b.status !== state.tab) return false;
      if (state.room && b.roomId !== state.room) return false;
      if (state.date && b.date !== state.date) return false;
      if (state.search) {
        const hay = [b.ref, b.name, b.activity, b.org, b.roomName].join(' ').toLowerCase();
        if (hay.indexOf(state.search) === -1) return false;
      }
      return true;
    });

    if (!filtered.length) {
      els.queue.innerHTML = '<div class="empty-note">Belum ada pengajuan pada filter ini.</div>';
      return;
    }

    els.queue.innerHTML = filtered.map(queueItem).join('');
  }

  function renderToday(all) {
    const today = todayISO();
    els['today-date'].textContent = formatDate(today) + ' · WITA';

    const todayBookings = all.filter(function (b) {
      return b.date === today && (b.status === 'disetujui' || b.status === 'menunggu');
    }).sort(function (a, b) {
      return a.start < b.start ? -1 : 1;
    });

    els['stat-today'].textContent = todayBookings.filter(function (b) { return b.status === 'disetujui'; }).length;

    if (!todayBookings.length) {
      els['today-list'].innerHTML = '<div class="today-empty">Tidak ada peminjaman terjadwal hari ini.</div>';
      return;
    }

    els['today-list'].innerHTML = todayBookings.map(function (b) {
      return '<button class="today-row" type="button" data-open="' + b.id + '">' +
        '<span class="today-row__time">' + escapeHtml(b.start + '–' + b.end) + '</span>' +
        '<span class="today-row__main"><strong>' + escapeHtml(b.roomName) + '</strong>' +
          '<span>' + escapeHtml(b.activity) + ' · ' + escapeHtml(b.name) + '</span></span>' +
        '<span class="' + statusClass(b.status) + '">' + escapeHtml(STATUS_LABELS[b.status]) + '</span>' +
      '</button>';
    }).join('');
  }

  function isUrgent(b) {
    if (b.status !== 'menunggu') return false;
    const dt = new Date(b.date + 'T' + b.start + ':00');
    const hours = (dt.getTime() - Date.now()) / 3600000;
    return hours >= 0 && hours <= 24;
  }

  function queueItem(b) {
    const room = roomById(b.roomId);
    const actions = b.status === 'menunggu'
      ? '<button class="btn btn--sm btn--gold" type="button" data-quick-approve="' + b.id + '">Setujui</button>' +
        '<button class="btn btn--sm btn--outline" type="button" data-open="' + b.id + '">Detail</button>'
      : '<button class="btn btn--sm btn--outline" type="button" data-open="' + b.id + '">Buka detail</button>';

    return '<article class="queue-item">' +
      '<div class="queue-item__main" data-open="' + b.id + '" tabindex="0" role="button" aria-label="Buka detail ' + escapeHtml(b.ref) + '">' +
        '<div class="queue-item__top">' +
          '<span class="queue-item__ref">' + escapeHtml(b.ref) + '</span>' +
          '<span class="' + statusClass(b.status) + '">' + escapeHtml(STATUS_LABELS[b.status] || b.status) + '</span>' +
          (isUrgent(b) ? '<span class="urgent">Kurang dari 24 jam</span>' : '') +
        '</div>' +
        '<div class="queue-item__title">' + escapeHtml(b.activity) +
          (b.org ? ' · ' + escapeHtml(b.org) : '') + '</div>' +
        '<div class="queue-item__meta">' +
          '<span>' + escapeHtml(b.name) + ' (' + escapeHtml(b.applicantType) + ')</span>' +
          '<span>' + escapeHtml(room ? room.name : b.roomName) + '</span>' +
          '<span>' + escapeHtml(formatDate(b.date)) + '</span>' +
          '<span>' + escapeHtml(b.start + '–' + b.end) + '</span>' +
          '<span>' + escapeHtml(relativeFrom(b.createdAt)) + '</span>' +
        '</div>' +
        '<div class="queue-item__reason">' + escapeHtml(b.reason) + '</div>' +
      '</div>' +
      '<div class="queue-item__actions">' + actions + '</div>' +
    '</article>';
  }

  function openDrawer(id) {
    const b = getBookings().find(function (x) { return x.id === id; });
    if (!b) return;
    state.currentId = id;

    els['drawer-title'].textContent = b.activity;
    els['drawer-ref'].textContent = b.ref + ' · ' + (STATUS_LABELS[b.status] || b.status);
    els['drawer-body'].innerHTML = drawerBody(b);
    els['drawer-foot'].innerHTML = drawerFoot(b);

    els.drawer.classList.add('is-open');
    els['drawer-backdrop'].classList.add('is-open');
    els.drawer.setAttribute('aria-hidden', 'false');
    els.drawer.removeAttribute('inert');
    document.body.style.overflow = 'hidden';
    const focusable = els['drawer-close'];
    if (focusable) focusable.focus();
  }

  function closeDrawer() {
    state.currentId = null;
    els.drawer.classList.remove('is-open');
    els['drawer-backdrop'].classList.remove('is-open');
    els.drawer.setAttribute('aria-hidden', 'true');
    els.drawer.setAttribute('inert', '');
    document.body.style.overflow = '';
  }

  function drawerBody(b) {
    const room = roomById(b.roomId);
    const facilityText = (b.facilities && b.facilities.length)
      ? b.facilities.map(function (f) { return '<span>' + escapeHtml(f) + '</span>'; }).join('')
      : '<span>Tidak ada</span>';

    const check = verify(b);

    const history = (b.history || []).slice().reverse().map(function (h) {
      return '<li><strong>' + escapeHtml(STATUS_LABELS[h.status] || h.status) + '</strong> · ' +
        escapeHtml(h.by || 'Sistem') + ' · ' + escapeHtml(relativeFrom(h.at)) +
        (h.note ? '<br>' + escapeHtml(h.note) : '') + '</li>';
    }).join('');

    return '<div class="detail-block">' +
        '<h4>Pemohon</h4>' +
        '<ul class="detail-list">' +
          '<li><span>Nama</span><span>' + escapeHtml(b.name) + '</span></li>' +
          '<li><span>Jenis</span><span>' + escapeHtml(b.applicantType) + '</span></li>' +
          (b.org ? '<li><span>Organisasi</span><span>' + escapeHtml(b.org) + '</span></li>' : '') +
          (b.position ? '<li><span>Jabatan</span><span>' + escapeHtml(b.position) + '</span></li>' : '') +
          '<li><span>NIM / NIDN</span><span>' + escapeHtml(b.nim) + '</span></li>' +
          '<li><span>Email</span><span>' + escapeHtml(b.email) + '</span></li>' +
          '<li><span>WhatsApp</span><span>' + escapeHtml(b.whatsapp) + '</span></li>' +
        '</ul>' +
      '</div>' +
      '<div class="detail-block">' +
        '<h4>Jadwal</h4>' +
        '<ul class="detail-list">' +
          '<li><span>Ruangan</span><span>' + escapeHtml(room ? room.name : b.roomName) + '</span></li>' +
          '<li><span>Hari &amp; tanggal</span><span>' + escapeHtml(formatDate(b.date)) + '</span></li>' +
          '<li><span>Waktu</span><span>' + escapeHtml(b.start + '–' + b.end) + '</span></li>' +
          '<li><span>Peserta</span><span>' + escapeHtml(String(b.participants)) + ' orang</span></li>' +
        '</ul>' +
      '</div>' +
      '<div class="detail-block">' +
        '<h4>Kegiatan &amp; alasan</h4>' +
        '<p>' + escapeHtml(b.reason) + '</p>' +
      '</div>' +
      '<div class="detail-block">' +
        '<h4>Fasilitas dipinjam</h4>' +
        '<div class="chip-list">' + facilityText + '</div>' +
      '</div>' +
      '<div class="detail-block">' +
        '<h4>Pemeriksaan otomatis</h4>' +
        '<div class="rule-check' + (check.ok ? '' : ' is-bad') + '">' + escapeHtml(check.message) + '</div>' +
      '</div>' +
      (history ? '<div class="detail-block"><h4>Riwayat</h4><ul class="timeline">' + history + '</ul></div>' : '') +
      (canDecide(b)
        ? '<div class="detail-block"><h4>Catatan keputusan</h4>' +
            '<textarea class="textarea" id="decision-note" placeholder="Opsional saat menyetujui; wajib saat menolak atau meminta perbaikan."></textarea>' +
          '</div>'
        : '');
  }

  function drawerFoot(b) {
    if (!canDecide(b)) {
      return '<button class="btn btn--outline" type="button" onclick="document.getElementById(\'drawer-close\').click()">Tutup</button>';
    }
    return '<button class="btn btn--primary" type="button" data-action="disetujui">Setujui</button>' +
      '<button class="btn btn--subtle" type="button" data-action="perlu-perbaikan">Minta perbaikan</button>' +
      '<button class="btn btn--ghost" type="button" data-action="ditolak" style="color:var(--danger);border-color:var(--line-strong);background:#fff;">Tolak</button>';
  }

  function canDecide(b) {
    return b.status === 'menunggu' || b.status === 'perlu-perbaikan';
  }

  function verify(b) {
    const room = roomById(b.roomId);
    if (!room) return { ok: false, message: 'Ruangan tidak ditemukan.' };
    const rule = ruleFor(room, b.date);
    if (!rule) {
      return { ok: false, message: 'Aturan ruangan tidak mengizinkan hari ' + dayName(b.date) + '.' };
    }
    if (timeToMin(b.start) < timeToMin(rule.start) || timeToMin(b.end) > timeToMin(rule.end)) {
      return { ok: false, message: 'Jadwal di luar jam ruangan (' + rule.start + '–' + rule.end + ').' };
    }
    const conflict = getBookings().find(function (x) {
      return x.id !== b.id && x.roomId === b.roomId && x.date === b.date &&
        isHolding(x) && overlap(b.start, b.end, x.start, x.end);
    });
    if (conflict) {
      return { ok: false, message: 'Bentrok dengan ' + conflict.ref + ' (' + conflict.start + '–' + conflict.end + ').' };
    }
    return { ok: true, message: 'Lolos aturan hari/jam dan tidak ada konflik jadwal.' };
  }

  function decide(status) {
    const b = getBookings().find(function (x) { return x.id === state.currentId; });
    if (!b) return;
    const noteEl = document.getElementById('decision-note');
    const note = noteEl ? noteEl.value.trim() : '';

    if ((status === 'ditolak' || status === 'perlu-perbaikan') && !note) {
      showToast('Catatan wajib diisi untuk ' + (status === 'ditolak' ? 'penolakan' : 'permintaan perbaikan') + '.', 'error');
      if (noteEl) noteEl.focus();
      return;
    }

    applyDecision(b, status, note);
  }

  function quickApprove(id) {
    const b = getBookings().find(function (x) { return x.id === id; });
    if (!b) return;
    const check = verify(b);
    if (!check.ok) {
      openDrawer(id);
      showToast('Pengajuan perlu diperiksa: ' + check.message, 'error');
      return;
    }
    applyDecision(b, 'disetujui', '');
  }

  function applyDecision(b, status, note) {
    updateBooking(b.id, {
      status: status,
      history: (b.history || []).concat([{
        status: status,
        at: new Date().toISOString(),
        by: 'Staf pengelola',
        note: note || ''
      }])
    });
    closeDrawer();
    render();
    const label = STATUS_LABELS[status] || status;
    showToast(b.ref + ' · ' + label + '.', status === 'ditolak' ? 'error' : 'success');
  }
})();
