/* SERU — applicant booking flow */

(function () {
  const state = {
    scheduleChecked: false,
    selectedRoomId: null,
    date: '',
    start: '',
    end: ''
  };

  const els = {};
  let facilitiesChosen = [];

  function $(id) { return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', function () {
    els.bookingForm = $('booking-form');
    els.formError = $('form-error');
    els.applicantType = $('applicantType');
    els.name = $('name');
    els.nim = $('nim');
    els.org = $('org');
    els.position = $('position');
    els.email = $('email');
    els.whatsapp = $('whatsapp');
    els.date = $('date');
    els.start = $('start');
    els.end = $('end');
    els.dayHint = $('day-hint');
    els.dateWindowHint = $('date-window-hint');
    els.checkBtn = $('check-btn');
    els.checkHint = $('check-hint');
    els.roomsCard = $('rooms-card');
    els.roomsGrid = $('rooms-grid');
    els.roomsSubtitle = $('rooms-subtitle');
    els.detailCard = $('detail-card');
    els.selectedRoomLabel = $('selected-room-label');
    els.activity = $('activity');
    els.reason = $('reason');
    els.reasonHint = $('reason-hint');
    els.participants = $('participants');
    els.facilityPicker = $('facility-picker');
    els.agreement = $('agreement');
    els.submitBtn = $('submit-btn');
    els.successCard = $('success-card');
    els.successRef = $('success-ref');
    els.successRecap = $('success-recap');
    els.newBooking = $('new-booking');
    els.sumType = $('sum-type');
    els.sumName = $('sum-name');
    els.sumDate = $('sum-date');
    els.sumTime = $('sum-time');
    els.sumRoom = $('sum-room');
    els.sumFacilities = $('sum-facilities');
    els.orgField = $('org-field');
    els.positionField = $('position-field');
    els.stepper = $('stepper');
    els.sessionBar = $('session-bar');
    els.sessionName = $('session-name');

    const min = minBookingISO();
    const max = maxBookingISO();
    els.date.min = min;
    els.date.max = max;
    els.dateWindowHint.textContent = 'Pengajuan ' + formatDateShort(min) + ' hingga ' + formatDateShort(max) + ' (H-2 s.d. 30 hari).';

    renderFacilities([]);
    bind();
    prefillUser();
    updateIdentityFields();
    updateCheckState();
    updateStepper(1);
    prefillFromQuery(min, max);
  });

  function bind() {
    els.applicantType.addEventListener('change', function () {
      updateIdentityFields();
      updateSummary();
    });
    els.name.addEventListener('input', updateSummary);

    [els.date, els.start, els.end].forEach(function (input) {
      input.addEventListener('change', onScheduleChange);
    });
    [els.date, els.start, els.end].forEach(function (input) {
      input.addEventListener('input', updateCheckState);
    });

    els.checkBtn.addEventListener('click', function () { checkAvailability(true); });
    els.bookingForm.addEventListener('submit', submitBooking);
    els.newBooking.addEventListener('click', function () { window.location.reload(); });
    els.reason.addEventListener('input', function () {
      const n = els.reason.value.trim().length;
      els.reasonHint.textContent = n < 20
        ? 'Minimal 20 karakter (' + n + '/20).'
        : 'Panjang alasan sudah memadai.';
      els.reasonHint.style.color = n >= 20 ? 'var(--green)' : '';
    });
  }

  function prefillUser() {
    const user = getCurrentUser();
    if (!user) return;
    els.sessionBar.hidden = false;
    els.sessionName.textContent = user.name + ' · ' + user.type;
    if (user.type && APPLICANT_TYPES.indexOf(user.type) !== -1) {
      els.applicantType.value = user.type;
    }
    if (user.name) els.name.value = user.name;
    if (user.identity) els.nim.value = user.identity;
    if (user.email) els.email.value = user.email;
    if (user.whatsapp) els.whatsapp.value = user.whatsapp;
    if (user.org) els.org.value = user.org;
    if (user.position) els.position.value = user.position;
    updateSummary();
  }

  function prefillFromQuery(min, max) {
    const params = new URLSearchParams(window.location.search);
    const date = params.get('date');
    const start = params.get('start');
    const end = params.get('end');
    const room = params.get('room');

    if (date && date >= min && date <= max) els.date.value = date;
    if (start) els.start.value = start;
    if (end) els.end.value = end;
    if (date) els.dayHint.textContent = 'Hari: ' + dayName(date);

    if (els.date.value && els.start.value && els.end.value) {
      checkAvailability(false);
      if (room && roomById(room)) {
        const avail = getAvailability(roomById(room), els.date.value, els.start.value, els.end.value, getBookings());
        if (avail.selectable) selectRoom(room, false);
      }
    }
  }

  function updateIdentityFields() {
    const type = els.applicantType.value;
    const isOrg = type === 'UKM' || type === 'HMJ';
    els.orgField.hidden = !isOrg;
    els.positionField.hidden = !isOrg;
    els.org.required = isOrg;
    els.sumType.textContent = type;
  }

  function onScheduleChange() {
    const changed = els.date.value !== state.date ||
      els.start.value !== state.start ||
      els.end.value !== state.end;

    state.scheduleChecked = false;
    state.selectedRoomId = null;
    els.roomsCard.hidden = true;
    els.detailCard.hidden = true;
    els.roomsGrid.innerHTML = '';

    if (els.date.value) {
      els.dayHint.textContent = 'Hari: ' + dayName(els.date.value);
    } else {
      els.dayHint.textContent = 'Hari terisi otomatis.';
    }

    if (changed) {
      els.checkHint.textContent = 'Tekan cek ketersediaan untuk memperbarui daftar.';
    }
    updateCheckState();
    updateSummary();
    updateStepper(1);
  }

  function updateCheckState() {
    const ready = !!(els.date.value && els.start.value && els.end.value);
    els.checkBtn.disabled = !ready;
    if (!ready) {
      els.checkHint.textContent = 'Lengkapi tanggal dan jam terlebih dahulu.';
    } else if (!state.scheduleChecked) {
      els.checkHint.textContent = 'Jadwal siap diperiksa.';
    }
  }

  function readSchedule() {
    state.date = els.date.value;
    state.start = els.start.value;
    state.end = els.end.value;
  }

  function validateSchedule() {
    if (!els.date.value || !els.start.value || !els.end.value) {
      return 'Lengkapi tanggal, jam mulai, dan jam selesai terlebih dahulu.';
    }
    if (els.date.value < minBookingISO()) {
      return 'Pengajuan paling cepat H-2 (' + formatDateShort(minBookingISO()) + ').';
    }
    if (els.date.value > maxBookingISO()) {
      return 'Pengajuan paling lambat 30 hari ke depan (' + formatDateShort(maxBookingISO()) + ').';
    }
    if (timeToMin(els.end.value) <= timeToMin(els.start.value)) {
      return 'Jam selesai harus lebih akhir daripada jam mulai.';
    }
    return null;
  }

  function checkAvailability(scroll) {
    hideError();
    const error = validateSchedule();
    if (error) { showError(error); return; }

    readSchedule();
    state.scheduleChecked = true;
    state.selectedRoomId = null;
    els.detailCard.hidden = true;
    els.roomsCard.hidden = false;
    renderRooms();
    updateCheckState();
    updateSummary();
    updateStepper(2);
    if (scroll !== false) els.roomsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderRooms() {
    const bookings = getBookings();
    els.roomsSubtitle.textContent = formatDate(state.date) + ' · ' + state.start + '–' + state.end;
    els.roomsGrid.innerHTML = '';

    ROOMS.forEach(function (room) {
      const availability = getAvailability(room, state.date, state.start, state.end, bookings);
      const isSelected = state.selectedRoomId === room.id;
      const card = document.createElement('article');
      card.className = 'room-card ' +
        (availability.selectable ? 'is-available' : 'is-blocked') +
        (isSelected ? ' is-selected' : '');
      card.setAttribute('aria-label', room.name + ': ' + availability.label);

      const facilities = room.facilities.map(function (f) {
        return '<span>' + escapeHtml(f) + '</span>';
      }).join('');

      card.innerHTML =
        '<div class="room-card__top">' +
          '<div>' +
            '<p class="room-card__name">' + escapeHtml(room.name) + '</p>' +
            '<span class="room-card__kind">' + escapeHtml(room.category) + ' · ' + escapeHtml(room.building) + ', ' + escapeHtml(room.floor) + ' · ' + room.capacity + ' orang</span>' +
          '</div>' +
          '<span class="status status--' + availability.status + '">' + escapeHtml(availability.label) + '</span>' +
        '</div>' +
        '<div class="room-card__facilities">' + facilities + '</div>' +
        '<div class="room-card__foot">' +
          '<span class="room-card__reason">' + escapeHtml(availability.reason) + '</span>' +
          '<button class="btn btn--sm ' + (availability.selectable ? 'btn--primary' : 'btn--subtle') + '" ' +
            (availability.selectable ? '' : 'disabled') +
            ' data-room="' + room.id + '">' +
            (availability.selectable ? (isSelected ? 'Dipilih' : 'Pilih ruangan') : 'Tidak bisa dipilih') +
          '</button>' +
        '</div>';

      els.roomsGrid.appendChild(card);
    });

    Array.prototype.forEach.call(els.roomsGrid.querySelectorAll('button[data-room]'), function (btn) {
      if (btn.disabled) return;
      btn.addEventListener('click', function () { selectRoom(btn.getAttribute('data-room'), true); });
    });
  }

  function selectRoom(roomId, scroll) {
    state.selectedRoomId = roomId;
    const room = roomById(roomId);
    facilitiesChosen = [];
    renderFacilities(room.facilities);
    renderRooms();

    els.detailCard.hidden = false;
    els.selectedRoomLabel.textContent = room.name + ' · ' + formatDate(state.date) + ' · ' + state.start + '–' + state.end;
    updateSummary();
    updateStepper(3);
    if (scroll !== false) els.detailCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderFacilities(options) {
    const list = options || FACILITY_OPTIONS;
    els.facilityPicker.innerHTML = '';
    list.forEach(function (facility) {
      const label = document.createElement('label');
      label.className = 'facility-option';
      label.innerHTML = '<input type="checkbox" value="' + escapeHtml(facility) + '"> <span>' + escapeHtml(facility) + '</span>';
      els.facilityPicker.appendChild(label);
    });
    Array.prototype.forEach.call(els.facilityPicker.querySelectorAll('input'), function (input) {
      input.addEventListener('change', function () {
        facilitiesChosen = Array.prototype.slice.call(
          els.facilityPicker.querySelectorAll('input:checked')
        ).map(function (i) { return i.value; });
        updateSummary();
      });
    });
  }

  function updateSummary() {
    els.sumType.textContent = els.applicantType.value;
    els.sumName.textContent = els.name.value.trim() || '—';
    els.sumDate.textContent = els.date.value ? formatDate(els.date.value) : '—';
    els.sumTime.textContent = (els.start.value && els.end.value)
      ? els.start.value + '–' + els.end.value
      : '—';
    const room = state.selectedRoomId ? roomById(state.selectedRoomId) : null;
    els.sumRoom.textContent = room ? room.name : 'Belum dipilih';
    els.sumFacilities.textContent = facilitiesChosen.length ? facilitiesChosen.join(', ') : '—';
  }

  function updateStepper(active) {
    const items = els.stepper.querySelectorAll('.stepper__item');
    Array.prototype.forEach.call(items, function (item) {
      const step = Number(item.getAttribute('data-step'));
      item.classList.remove('is-active', 'is-done');
      if (step < active) item.classList.add('is-done');
      if (step === active) item.classList.add('is-active');
    });
  }

  function showError(message) {
    els.formError.textContent = message;
    els.formError.classList.add('is-visible');
  }

  function hideError() {
    els.formError.classList.remove('is-visible');
    els.formError.textContent = '';
  }

  function collectAndValidate() {
    const type = els.applicantType.value;
    const isOrg = type === 'UKM' || type === 'HMJ';

    if (!els.name.value.trim()) return { error: 'Nama lengkap wajib diisi.', focus: els.name };
    if (!els.nim.value.trim()) return { error: 'NIM / NIDN / NIP wajib diisi.', focus: els.nim };
    if (isOrg && !els.org.value.trim()) return { error: 'Nama UKM / HMJ wajib diisi.', focus: els.org };
    if (!els.email.value.trim()) return { error: 'Email wajib diisi.', focus: els.email };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(els.email.value.trim())) return { error: 'Format email belum benar.', focus: els.email };
    if (!els.whatsapp.value.trim()) return { error: 'Nomor WhatsApp wajib diisi.', focus: els.whatsapp };
    if (!/^[0-9+\-\s()]{8,}$/.test(els.whatsapp.value.trim())) return { error: 'Nomor WhatsApp belum valid (minimal 8 angka).', focus: els.whatsapp };
    if (!state.selectedRoomId) return { error: 'Pilih ruangan terlebih dahulu.', focus: null };
    if (!els.activity.value.trim()) return { error: 'Nama kegiatan wajib diisi.', focus: els.activity };
    if (els.reason.value.trim().length < 20) return { error: 'Alasan peminjaman wajib diisi minimal 20 karakter.', focus: els.reason };
    if (!els.participants.value || Number(els.participants.value) < 1) return { error: 'Jumlah peserta wajib diisi.', focus: els.participants };
    if (!els.agreement.checked) return { error: 'Centang pernyataan sebelum mengirim pengajuan.', focus: els.agreement };

    const room = roomById(state.selectedRoomId);
    if (Number(els.participants.value) > room.capacity) {
      return { error: 'Jumlah peserta melebihi kapasitas ' + room.name + ' (' + room.capacity + ' orang).', focus: els.participants };
    }

    return {
      data: {
        applicantType: type,
        name: els.name.value.trim(),
        nim: els.nim.value.trim(),
        org: isOrg ? els.org.value.trim() : '',
        position: isOrg ? els.position.value.trim() : '',
        email: els.email.value.trim(),
        whatsapp: els.whatsapp.value.trim(),
        activity: els.activity.value.trim(),
        reason: els.reason.value.trim(),
        participants: Number(els.participants.value),
        facilities: facilitiesChosen.slice()
      }
    };
  }

  function submitBooking(event) {
    event.preventDefault();
    hideError();

    const scheduleError = validateSchedule();
    if (scheduleError) { showError(scheduleError); return; }

    const result = collectAndValidate();
    if (result.error) {
      showError(result.error);
      if (result.focus) result.focus.focus();
      return;
    }

    const room = roomById(state.selectedRoomId);
    const fresh = getAvailability(room, state.date, state.start, state.end, getBookings());
    if (!fresh.selectable) {
      showError('Ruangan tidak tersedia lagi pada rentang waktu tersebut. ' + fresh.reason);
      renderRooms();
      return;
    }

    const list = getBookings();
    const now = new Date().toISOString();
    const booking = Object.assign({}, result.data, {
      id: 'bk-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      ref: nextRef(list),
      roomId: room.id,
      roomName: room.name,
      date: state.date,
      start: state.start,
      end: state.end,
      status: 'menunggu',
      createdAt: now,
      history: [{ status: 'menunggu', at: now, by: 'Pemohon', note: 'Pengajuan dibuat dan slot ditahan sementara.' }]
    });

    addBooking(booking);
    showSuccess(booking);
  }

  function showSuccess(booking) {
    els.bookingForm.hidden = true;
    els.successCard.hidden = false;
    els.successRef.textContent = booking.ref;

    const facilityText = booking.facilities.length ? booking.facilities.join(', ') : 'Tidak meminta fasilitas tambahan';
    els.successRecap.innerHTML =
      recapRow('Jenis pemohon', booking.applicantType) +
      recapRow('Pemohon', booking.name) +
      recapRow('Kegiatan', booking.activity) +
      recapRow('Ruangan', booking.roomName) +
      recapRow('Hari & tanggal', formatDate(booking.date)) +
      recapRow('Waktu', booking.start + '–' + booking.end) +
      recapRow('Peserta', booking.participants + ' orang') +
      recapRow('Fasilitas', facilityText) +
      recapRow('Status', STATUS_LABELS[booking.status]);

    updateStepper(5);
    Array.prototype.forEach.call(els.stepper.querySelectorAll('.stepper__item'), function (item) {
      item.classList.add('is-done');
      item.classList.remove('is-active');
    });
    els.successCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Pengajuan ' + booking.ref + ' berhasil dikirim.', 'success');
  }

  function recapRow(label, value) {
    return '<div class="recap__row"><span>' + escapeHtml(label) + '</span><span>' + escapeHtml(value) + '</span></div>';
  }
})();
