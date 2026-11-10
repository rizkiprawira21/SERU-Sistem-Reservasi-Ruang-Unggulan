/* SERU — landing page catalog and quick search */

(function () {
  function $(id) { return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', function () {
    const dateEl = $('q-date');
    dateEl.min = minBookingISO();
    dateEl.max = maxBookingISO();
    dateEl.value = suggestedDateISO();

    $('quick-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const date = $('q-date').value;
      const start = $('q-start').value;
      const end = $('q-end').value;
      if (!date || !start || !end) {
        showToast('Lengkapi tanggal dan jam terlebih dahulu.', 'error');
        return;
      }
      window.location.href = 'ketersediaan.html?date=' + encodeURIComponent(date) +
        '&start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end);
    });

    renderCatalog();
    renderRoomGallery();
  });

  function renderRoomGallery() {
    const gallery = $('room-gallery');
    if (!gallery) return;
    gallery.innerHTML = ROOMS.map(function (room) {
      return '<figure>' +
        '<img src="' + room.photo + '" alt="Foto ' + escapeHtml(room.name) + ' di IDB Bali" loading="lazy">' +
        '<figcaption>' + escapeHtml(room.name) + '</figcaption>' +
      '</figure>';
    }).join('');
  }

  function renderCatalog() {
    $('catalog').innerHTML = ROOMS.map(function (room) {
      const facilities = room.facilities.slice(0, 3).map(function (f) {
        return '<span>' + escapeHtml(f) + '</span>';
      }).join('');

      return '<a class="room-tile" href="ketersediaan.html">' +
        '<span class="cat-pill">' + escapeHtml(room.category) + '</span>' +
        '<h3>' + escapeHtml(room.name) + '</h3>' +
        '<p class="room-tile__meta">' + escapeHtml(room.building) + ' · ' + room.capacity + ' orang</p>' +
        '<div class="room-card__facilities">' + facilities +
          (room.facilities.length > 3 ? '<span>+' + (room.facilities.length - 3) + '</span>' : '') +
        '</div>' +
        '<span class="room-tile__link">Cek jadwal →</span>' +
      '</a>';
    }).join('');
  }
})();
