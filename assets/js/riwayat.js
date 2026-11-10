/* SERU — applicant status and history */

(function () {
  const state = {
    search: '',
    status: '',
    currentId: null
  };

  const els = {};

  function $(id) { return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', function () {
    ['lookup-form', 'lookup-ref', 'lookup-note', 'history-search', 'history-status',
      'history-list', 'history-sub', 'drawer', 'drawer-backdrop', 'drawer-close',
      'drawer-title', 'drawer-ref', 'drawer-body', 'drawer-foot'].forEach(function (id) {
      els[id] = $(id);
    });

    bind();
    render();

    window.addEventListener('seru:bookings', render);
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) render();
    });
  });

  function bind() {
    els['history-search'].addEventListener('input', function () {
      state.search = els['history-search'].value.trim().toLowerCase();
      render();
    });
    els['history-status'].addEventListener('change', function () {
      state.status = els['history-status'].value;
      render();
    });

    els['lookup-form'].addEventListener('submit', function (e) {
      e.preventDefault();
      const ref = els['lookup-ref'].value.trim().toUpperCase();
      if (!ref) {
        els['lookup-note'].textContent = 'Masukkan nomor referensi terlebih dahulu.';
        return;
      }
      const match = getBookings().find(function (b) {
        return String(b.ref).toUpperCase().indexOf(ref) !== -1;
      });
      if (!match) {
        els['lookup-note'].textContent = 'Pengajuan dengan referensi "' + ref + '" tidak ditemukan di perangkat ini.';
        showToast('Pengajuan tidak ditemukan.', 'error');
        return;
      }
      els['lookup-note'].textContent = 'Pengajuan ditemukan: ' + match.ref + '.';
      openDrawer(match.id);
    });

    els['drawer-close'].addEventListener('click', closeDrawer);
    els['drawer-backdrop'].addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });

    els['history-list'].addEventListener('click', function (e) {
      const open = e.target.closest('[data-open]');
      if (open) openDrawer(open.getAttribute('data-open'));
    });

    els['drawer-foot'].addEventListener('click', function (e) {
      const cancel = e.target.closest('[data-cancel]');
      if (cancel) cancelBooking(cancel.getAttribute('data-cancel'));
    });
  }

  function sortedBookings() {
    const priority = { menunggu: 0, 'perlu-perbaikan': 1, disetujui: 2, ditolak: 3, dibatalkan: 4, selesai: 5 };
    return getBookings().slice().sort(function (a, b) {
      const pa = priority[a.status] == null ? 9 : priority[a.status];
      const pb = priority[b.status] == null ? 9 : priority[b.status];
      if (pa !== pb) return pa - pb;
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.start < b.start ? -1 : 1;
    });
  }

  function render() {
    const all = sortedBookings();
    const filtered = all.filter(function (b) {
      if (state.status && b.status !== state.status) return false;
      if (state.search) {
        const hay = [b.ref, b.name, b.activity, b.roomName, b.org].join(' ').toLowerCase();
        if (hay.indexOf(state.search) === -1) return false;
      }
      return true;
    });

    const user = getCurrentUser();
    els['history-sub'].textContent = all.length + ' pengajuan tersimpan' +
      (user ? ' · masuk sebagai ' + user.name : ' · masuk untuk menyimpan identitas otomatis');

    if (!filtered.length) {
      els['history-list'].innerHTML = '<div class="empty-note">Belum ada pengajuan pada filter ini. ' +
        '<a href="ketersediaan.html">Cari ruangan kosong</a> untuk mulai meminjam.</div>';
      return;
    }

    els['history-list'].innerHTML = filtered.map(historyItem).join('');
  }

  function historyItem(b) {
    const room = roomById(b.roomId);
    const cancel = canCancel(b)
      ? '<button class="btn btn--sm btn--outline" type="button" data-open="' + b.id + '">Detail</button>' +
        '<button class="btn btn--sm btn--danger-soft" type="button" data-cancel="' + b.id + '">Batalkan</button>'
      : '<button class="btn btn--sm btn--outline" type="button" data-open="' + b.id + '">Detail</button>';

    return '<article class="history-item">' +
      '<div class="history-item__main" data-open="' + b.id + '" role="button" tabindex="0" aria-label="Buka detail ' + escapeHtml(b.ref) + '">' +
        '<div class="history-item__top">' +
          '<span class="queue-item__ref">' + escapeHtml(b.ref) + '</span>' +
          '<span class="' + statusClass(b.status) + '">' + escapeHtml(STATUS_LABELS[b.status] || b.status) + '</span>' +
        '</div>' +
        '<h3 class="history-item__title">' + escapeHtml(b.activity) + '</h3>' +
        '<div class="queue-item__meta">' +
          '<span>' + escapeHtml(room ? room.name : b.roomName) + '</span>' +
          '<span>' + escapeHtml(formatDate(b.date)) + '</span>' +
          '<span>' + escapeHtml(b.start + '–' + b.end) + '</span>' +
          '<span>' + escapeHtml(b.name) + '</span>' +
        '</div>' +
        '<p class="history-item__hint">' + escapeHtml(STATUS_HINTS[b.status] || '') + '</p>' +
      '</div>' +
      '<div class="queue-item__actions">' + cancel + '</div>' +
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
    els['drawer-close'].focus();
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

    const history = (b.history || []).slice().reverse().map(function (h) {
      return '<li><strong>' + escapeHtml(STATUS_LABELS[h.status] || h.status) + '</strong> · ' +
        escapeHtml(h.by || 'Sistem') + ' · ' + escapeHtml(relativeFrom(h.at)) +
        (h.note ? '<br>' + escapeHtml(h.note) : '') + '</li>';
    }).join('');

    return '<div class="status-banner status-banner--' + b.status + '">' +
        '<strong>' + escapeHtml(STATUS_LABELS[b.status] || b.status) + '</strong>' +
        '<span>' + escapeHtml(STATUS_HINTS[b.status] || '') + '</span>' +
      '</div>' +
      '<div class="detail-block">' +
        '<h4>Ringkasan</h4>' +
        '<ul class="detail-list">' +
          '<li><span>Kegiatan</span><span>' + escapeHtml(b.activity) + '</span></li>' +
          '<li><span>Ruangan</span><span>' + escapeHtml(room ? room.name : b.roomName) + '</span></li>' +
          '<li><span>Hari &amp; tanggal</span><span>' + escapeHtml(formatDate(b.date)) + '</span></li>' +
          '<li><span>Waktu</span><span>' + escapeHtml(b.start + '–' + b.end) + '</span></li>' +
          '<li><span>Peserta</span><span>' + escapeHtml(String(b.participants)) + ' orang</span></li>' +
          '<li><span>Pemohon</span><span>' + escapeHtml(b.name) + ' (' + escapeHtml(b.applicantType) + ')</span></li>' +
          (b.org ? '<li><span>Organisasi</span><span>' + escapeHtml(b.org) + '</span></li>' : '') +
          '<li><span>Email</span><span>' + escapeHtml(b.email) + '</span></li>' +
        '</ul>' +
      '</div>' +
      '<div class="detail-block">' +
        '<h4>Keperluan</h4>' +
        '<p>' + escapeHtml(b.reason) + '</p>' +
      '</div>' +
      '<div class="detail-block">' +
        '<h4>Fasilitas</h4>' +
        '<div class="chip-list">' + facilityText + '</div>' +
      '</div>' +
      (history ? '<div class="detail-block"><h4>Riwayat status</h4><ul class="timeline">' + history + '</ul></div>' : '');
  }

  function drawerFoot(b) {
    let html = '<a class="btn btn--outline" href="ketersediaan.html">Cari ruangan</a>';
    if (canCancel(b)) {
      html += '<button class="btn btn--danger-soft" type="button" data-cancel="' + b.id + '">Batalkan pengajuan</button>';
    }
    return html;
  }

  function cancelBooking(id) {
    const b = getBookings().find(function (x) { return x.id === id; });
    if (!b) return;
    if (!canCancel(b)) {
      showToast('Pengajuan ini sudah tidak dapat dibatalkan.', 'error');
      return;
    }
    if (!window.confirm('Batalkan pengajuan ' + b.ref + '? Slot ruangan akan dibuka kembali untuk orang lain.')) return;

    updateBooking(id, {
      status: 'dibatalkan',
      history: (b.history || []).concat([{
        status: 'dibatalkan',
        at: new Date().toISOString(),
        by: b.name,
        note: 'Dibatalkan oleh pemohon. Slot ruangan dibuka kembali.'
      }])
    });
    closeDrawer();
    render();
    showToast('Pengajuan ' + b.ref + ' dibatalkan.', 'success');
  }
})();
