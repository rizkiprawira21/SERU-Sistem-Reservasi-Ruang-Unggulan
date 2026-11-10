/* SERU — interaction layer: header, reveal, parallax, video, progress */

(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initScrollProgress();
    initReveal();
    initHeroParallax();
    initVideoToggle();
  });

  function onScroll(fn) {
    let ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        fn(window.scrollY || window.pageYOffset);
        ticking = false;
      });
    }, { passive: true });
    fn(window.scrollY || window.pageYOffset);
  }

  function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    onScroll(function (y) {
      header.classList.toggle('is-scrolled', y > 24);
    });
  }

  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    onScroll(function () {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, (window.scrollY || 0) / max) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
    });
  }

  function initReveal() {
    if (document.body.classList.contains('app-shell')) return;
    const selectors = [
      '.section__head',
      '.steps-inline',
      '.step-inline',
      '.room-tile',
      '.gallery-strip figure',
      '.staff-band__inner'
    ];
    const items = [];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (el.closest('.hero')) return;
        items.push(el);
      });
    });

    items.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.setProperty('--d', (i % 4) * 70 + 'ms');
    });

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  }

  function initHeroParallax() {
    const hero = document.querySelector('.hero--full');
    const media = hero && hero.querySelector('.hero__media');
    if (!hero || !media || reduceMotion) return;

    onScroll(function (y) {
      const h = hero.offsetHeight || window.innerHeight;
      if (y > h + 100) return;
      const shift = Math.min(y, h) * 0.18;
      media.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0)';
      hero.querySelector('.hero__inner').style.transform =
        'translate3d(0,' + (Math.min(y, h) * 0.06).toFixed(2) + 'px,0)';
      hero.querySelector('.wrap').style.opacity = String(Math.max(0, 1 - y / (h * 0.85)));
    });
  }

  function initVideoToggle() {
    const video = document.getElementById('hero-video');
    const btn = document.getElementById('video-toggle');
    if (!video || !btn) return;

    if (reduceMotion) {
      video.pause();
      btn.classList.add('is-paused');
      btn.setAttribute('aria-label', 'Putar video latar');
    }

    btn.addEventListener('click', function () {
      if (video.paused) {
        video.play();
        btn.classList.remove('is-paused');
        btn.setAttribute('aria-label', 'Jeda video latar');
      } else {
        video.pause();
        btn.classList.add('is-paused');
        btn.setAttribute('aria-label', 'Putar video latar');
      }
    });
  }
})();
