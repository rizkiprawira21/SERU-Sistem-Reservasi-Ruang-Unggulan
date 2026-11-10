/* SERU — shared UI helpers */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type) {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' toast--' + type : '');
  toast.textContent = message;
  wrap.appendChild(toast);
  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity .25s ease, transform .25s ease';
    setTimeout(function () { toast.remove(); }, 260);
  }, 3200);
}

/* Auto-advancing, looping background slideshow with fade. */
function initSlideshow(root) {
  const hero = root || document.querySelector('.hero');
  if (!hero) return;
  const slides = Array.prototype.slice.call(hero.querySelectorAll('.hero__slide'));
  if (!slides.length) return;

  let failed = 0;
  slides.forEach(function (img) {
    const photo = img.getAttribute('data-photo');
    if (photo) {
      const probe = new Image();
      probe.addEventListener('load', function () {
        img.setAttribute('src', photo);
      });
      probe.src = photo;
    }
    img.addEventListener('error', function () {
      failed++;
      img.style.display = 'none';
      if (failed >= slides.length) hero.classList.add('has-no-photo');
    });
    if (img.complete && img.naturalWidth === 0) {
      img.dispatchEvent(new Event('error'));
    }
  });

  let index = 0;
  slides[0].classList.add('is-active');

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  setInterval(function () {
    const current = slides[index];
    if (current) current.classList.remove('is-active');
    index = (index + 1) % slides.length;
    const next = slides[index];
    if (next) next.classList.add('is-active');
  }, 5000);
}

/* Minutes elapsed helper for queue waiting time. */
function relativeFrom(iso) {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'baru saja';
  if (mins < 60) return mins + ' menit lalu';
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + ' jam lalu';
  const days = Math.round(hours / 24);
  return days + ' hari lalu';
}

/* Header session state: swap "Masuk" for the signed-in user's name. */
function renderAuthUI() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  document.querySelectorAll('[data-auth-link]').forEach(function (link) {
    if (user) {
      link.textContent = user.role === 'admin' ? 'Dashboard Staf' : 'Akun Saya';
      link.href = user.role === 'admin' ? 'staf.html' : 'riwayat.html';
      if (!link.parentElement.querySelector('.logout-link')) {
        const out = document.createElement('a');
        out.href = '#';
        out.className = 'logout-link';
        out.textContent = 'Keluar';
        out.addEventListener('click', function (event) {
          event.preventDefault();
          logoutUser();
          window.location.href = 'index.html';
        });
        link.after(out);
      }
    } else {
      link.textContent = 'Masuk';
      link.href = 'masuk.html';
      const existing = link.parentElement.querySelector('.logout-link');
      if (existing) existing.remove();
    }
  });
  document.querySelectorAll('[data-user-name]').forEach(function (el) {
    el.textContent = user ? user.name.split(' ')[0] : '';
  });
}

function initMobileNav() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const wrap = header.querySelector('.wrap');
  const nav = header.querySelector('.site-nav');
  if (!wrap || !nav || wrap.querySelector('.nav-toggle')) return;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-toggle';
  toggle.setAttribute('aria-label', 'Buka menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  wrap.appendChild(toggle);

  function close() {
    nav.classList.remove('is-open');
    header.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Buka menu');
  }

  toggle.addEventListener('click', function () {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  });

  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', close);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') close();
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 980) close();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  if (typeof seedDemoData === 'function') seedDemoData();
  initSlideshow();
  initMobileNav();
  renderAuthUI();
});
