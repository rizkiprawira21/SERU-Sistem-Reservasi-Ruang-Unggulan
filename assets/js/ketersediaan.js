/* SERU — availability explorer */

(function () {
  const state = {
    date: '',
    start: '09:00',
    end: '12:00',
    category: '',
    capacity: 0,
    facility: ''
  };

  const DAY_START = 8 * 60;
  const DAY_END = 21 * 60;

  function $(id) { return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const dateEl = $('f-date');
    dateEl.min = minBookingISO();
    dateEl.max = maxBookingISO();
    const qDate = params.get('date');
    dateEl.value = (qDate && qDate >= dateEl.min && qDate <= dateEl.max) ? qDate : suggestedDateISO();
    if (params.get('start')) $('f-start').value = params.get('start');
    if (params.get('end')) $('f-end').value = params.get('end');
    state.date = dateEl.value;

    const catSelect = $('f-cat');
    CATEGORIES.forEach(function (c) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      catSelect.appendChild(opt);
    });

    const facSelect = $('f-fac');
    FACILITY_OPTIONS.forEach(function (f) {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      facSelect.appendChild(opt);
    });

    const qCat = params.get('cat');
    if (qCat) {
      catSelect.value = qCat;
      facSelect.value = '';
    }

    $('filter-note').textContent = 'Pengajuan paling cepat H-2 dan paling lambat 30 hari sebelum kegiatan.';

    ['f-date', 'f-start', 'f-end', 'f-cat', 'f-cap', 'f-fac'].forEach(function (id) {
      $(id).addEventListener('change', readFilters);
    });
    $('f-submit').addEventListener('click', function () {
      readFilters();
      render();
    });

    readFilters();
    render();
  });

  function readFilters() {
    state.date = $('f-date').value;
    state.start = $('f-start').value;
    state.end = $('f-end').value;
    state.category = $('f-cat').value;
    state.capacity = Number($('f-cap').value) || 0;
    state.facility = $('f-fac').value;
  }

  function render() {
    if (!state.date) return;
    const bookings = getBookings();
    const rooms = ROOMS.filter(function (room) {
      if (state.category && room.category !== state.category) return false;
      if (state.capacity && room.capacity < state.capacity) return false;
      if (state.facility && room.facilities.indexOf(state.facility) === -1) return false;
      return true;
    });

    const available = rooms.filter(function (room) {
      return getAvailability(room, state.date, state.start, state.end, bookings).selectable;
    }).length;

    $('rooms-title').textContent = available + ' ruangan tersedia';
    $('rooms-sub').textContent = formatDate(state.date) + ' · ' + state.start + '–' + state.end +
      (rooms.length !== ROOMS.length ? ' · ' + rooms.length + ' ruangan cocok filter' : '');

    renderRooms(rooms, bookings);
    renderSchedule(rooms, bookings);
  }

  function renderRooms(rooms, bookings) {
    const grid = $('rooms-grid');
    grid.innerHTML = '';

    if (!rooms.length) {
      grid.innerHTML = '<div class="empty-note" style="grid-column:1/-1;">Tidak ada ruangan yang cocok dengan filter. Coba longgarkan kapasitas atau fasilitas.</div>';
      return;
    }

    rooms.forEach(function (room) {
      const availability = getAvailability(room, state.date, state.start, state.end, bookings);
      const card = document.createElement('article');
      card.className = 'room-card ' + (availability.selectable ? 'is-available' : 'is-blocked');

      const facilities = room.facilities.map(function (f) {
        return '<span>' + escapeHtml(f) + '</span>';
      }).join('');

      card.innerHTML =
        '<div class="room-card__top">' +
          '<div>' +
            '<p class="room-card__name">' + escapeHtml(room.name) + '</p>' +
            '<span class="room-card__kind">' + escapeHtml(room.category) + ' · ' + escapeHtml(room.building) + ', ' + escapeHtml(room.floor) + '</span>' +
          '</div>' +
          '<span class="status status--' + availability.status + '">' + escapeHtml(availability.label) + '</span>' +
        '</div>' +
        '<div class="room-card__facts">' +
          '<span><b>' + room.capacity + '</b> orang</span>' +
          '<span><b>' + room.maxHours + '</b> jam maks.</span>' +
          '<span>' + escapeHtml(primaryHours(room)) + '</span>' +
        '</div>' +
        '<div class="room-card__facilities">' + facilities + '</div>' +
        '<div class="room-card__foot">' +
          '<span class="room-card__reason">' + escapeHtml(availability.reason) + '</span>' +
          (availability.selectable
            ? '<a class="btn btn--sm btn--primary" href="pinjam.html?room=' + encodeURIComponent(room.id) +
              '&date=' + encodeURIComponent(state.date) + '&start=' + encodeURIComponent(state.start) +
              '&end=' + encodeURIComponent(state.end) + '">Pilih ruangan</a>'
            : '<button class="btn btn--sm btn--subtle" type="button" disabled>Tidak bisa dipilih</button>') +
        '</div>';

      grid.appendChild(card);
    });
  }

  function renderSchedule(rooms, bookings) {
    const el = $('schedule');
    $('schedule-sub').textContent = 'Pemakaian ruangan pada ' + formatDate(state.date) + ', pukul 08.00–21.00 WITA.';

    let head = '<div class="schedule__head"><div class="schedule__corner">Ruangan</div><div class="schedule__ticks">';
    for (let h = 8; h <= 21; h += 2) {
      const left = ((h * 60 - DAY_START) / (DAY_END - DAY_START)) * 100;
      head += '<span style="left:' + left + '%">' + String(h).padStart(2, '0') + '.00</span>';
    }
    head += '</div></div>';

    const rows = rooms.map(function (room) {
      const blocks = dayBlocks(room, state.date, bookings);
      const rule = ruleFor(room, state.date);
      let inner = '';

      if (!rule) {
        inner = '<div class="sched-closed">Tutup pada hari ini</div>';
      } else {
        if (timeToMin(rule.start) > DAY_START) {
          inner += '<div class="sched-closed" style="width:' + pct(DAY_START, timeToMin(rule.start)) + '%">Tutup</div>';
        }
        blocks.forEach(function (b) {
          const left = ((Math.max(DAY_START, timeToMin(b.start)) - DAY_START) / (DAY_END - DAY_START)) * 100;
          const width = ((Math.min(DAY_END, timeToMin(b.end)) - Math.max(DAY_START, timeToMin(b.start))) / (DAY_END - DAY_START)) * 100;
          inner += '<button class="sched-block sched-block--' + b.type + '" type="button" style="left:' + left + '%;width:' + width + '%" ' +
            'title="' + escapeHtml(b.label + ' ' + b.start + '–' + b.end) + '">' +
            '<span>' + escapeHtml(b.label) + '</span><small>' + escapeHtml(b.start + '–' + b.end) + '</small></button>';
        });
        if (timeToMin(rule.end) < DAY_END) {
          const left = ((timeToMin(rule.end) - DAY_START) / (DAY_END - DAY_START)) * 100;
          inner += '<div class="sched-closed" style="left:' + left + '%;width:' + (100 - left) + '%">Tutup</div>';
        }
      }

      return '<div class="schedule__row">' +
        '<div class="schedule__label"><strong>' + escapeHtml(room.name) + '</strong><span>' + escapeHtml(room.category) + '</span></div>' +
        '<div class="schedule__track">' + inner + '</div>' +
      '</div>';
    }).join('');

    el.innerHTML = head + '<div class="schedule__rows">' + rows + '</div>';

    Array.prototype.forEach.call(el.querySelectorAll('.sched-block'), function (btn) {
      btn.addEventListener('click', function () { showToast(btn.title, ''); });
    });
  }

  function pct(fromMin, toMin) {
    return ((toMin - fromMin) / (DAY_END - DAY_START)) * 100;
  }
})();
