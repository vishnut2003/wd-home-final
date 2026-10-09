/* ============================================
   Walls & Dreams — Main JavaScript
============================================ */

'use strict';

/* ============================================
   SCROLL ANIMATION (Intersection Observer)
============================================ */
(function () {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-animate]').forEach((el, i) => {
    // Stagger siblings in the same grid
    const parent = el.parentElement;
    const siblings = Array.from(parent.children).filter(c => c.hasAttribute('data-animate'));
    const idx = siblings.indexOf(el);
    el.style.transitionDelay = `${idx * 80}ms`;
    io.observe(el);
  });
})();

/* ============================================
   WHY US CAROUSEL
============================================ */
(function () {
  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('[data-carousel-track]');
    const prevBtn = carousel.querySelector('[data-carousel-prev]');
    const nextBtn = carousel.querySelector('[data-carousel-next]');
    const dotsContainer = carousel.querySelector('[data-carousel-dots]');
    const cards = Array.from(track.children);
    if (!cards.length) return;

    // Mobile-only carousels (data-carousel-mobile): above 720px the track is a
    // plain CSS grid and must stay untouched — no dots, no drag handlers, no
    // scrollTo. Wiring is attached the first time the phone query matches.
    const mobileOnly = carousel.hasAttribute('data-carousel-mobile');
    const phoneQuery = window.matchMedia('(max-width: 720px)');
    const isActive = () => !mobileOnly || phoneQuery.matches;

    const getCardsPerView = () => {
      if (mobileOnly) return 1;
      const w = window.innerWidth;
      if (w >= 1101) return 3;
      if (w >= 721) return 2;
      return 1;
    };
    const getGap = () => {
      return parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    };
    const getPageCount = () => Math.max(1, Math.ceil(cards.length / getCardsPerView()));
    const getPageWidth = () => {
      const cardW = cards[0].getBoundingClientRect().width;
      const gap = getGap();
      return (cardW + gap) * getCardsPerView();
    };
    const getCurrentPage = () => Math.round(track.scrollLeft / (getPageWidth() || 1));

    function buildDots() {
      dotsContainer.innerHTML = '';
      const count = getPageCount();
      for (let i = 0; i < count; i++) {
        const dot = document.createElement('button');
        dot.className = 'why-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
      }
    }

    function goTo(page) {
      const max = getPageCount() - 1;
      const target = Math.max(0, Math.min(page, max));
      track.scrollTo({ left: target * getPageWidth(), behavior: 'smooth' });
    }

    function update() {
      const current = getCurrentPage();
      const last = getPageCount() - 1;
      dotsContainer.querySelectorAll('.why-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === current);
      });
      prevBtn.disabled = current <= 0;
      nextBtn.disabled = current >= last;
    }

    function init() {
      prevBtn.addEventListener('click', () => goTo(getCurrentPage() - 1));
      nextBtn.addEventListener('click', () => goTo(getCurrentPage() + 1));

      let ticking = false;
      track.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => { update(); ticking = false; });
          ticking = true;
        }
      }, { passive: true });

      // Drag to scroll
      let isDown = false;
      let startX = 0;
      let startScroll = 0;
      let moved = 0;
      const DRAG_THRESHOLD = 6;

      track.addEventListener('mousedown', (e) => {
        // A desktop grid (after a resize across 720px) must keep native text
        // selection and link clicks.
        if (!isActive()) return;
        isDown = true;
        moved = 0;
        startX = e.pageX;
        startScroll = track.scrollLeft;
        track.classList.add('is-dragging');
      });
      track.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const dx = e.pageX - startX;
        moved = Math.abs(dx);
        track.scrollLeft = startScroll - dx;
        e.preventDefault();
      });
      const endDrag = () => {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('is-dragging');
        if (moved < DRAG_THRESHOLD) return;
        const pageW = getPageWidth();
        const target = Math.round(track.scrollLeft / pageW);
        track.scrollTo({ left: target * pageW, behavior: 'smooth' });
      };
      track.addEventListener('mouseup', endDrag);
      track.addEventListener('mouseleave', endDrag);
      track.addEventListener('click', (e) => {
        if (moved >= DRAG_THRESHOLD) { e.preventDefault(); e.stopPropagation(); }
      }, true);
      track.addEventListener('dragstart', (e) => e.preventDefault());

      // Touch support
      let touchStartX = 0;
      let touchStartScroll = 0;
      track.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartScroll = track.scrollLeft;
      }, { passive: true });
      track.addEventListener('touchend', () => {
        const pageW = getPageWidth();
        const target = Math.round(track.scrollLeft / pageW);
        track.scrollTo({ left: target * pageW, behavior: 'smooth' });
      }, { passive: true });

      let resizeTimer;
      let lastWidth = window.innerWidth;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          // Phone browsers fire resize when the URL bar shows/hides (height only);
          // rebuilding then would yank the carousel back to slide 1 mid-scroll.
          if (window.innerWidth === lastWidth) return;
          lastWidth = window.innerWidth;
          buildDots();
          goTo(0);
          update();
        }, 150);
      });

      buildDots();
      update();

      if (mobileOnly) initAutoplay();
    }

    // Autoplay for the mobile carousels: one card every 2s, wrapping from the
    // last card back to the first. It only runs while the carousel is on screen
    // at phone width, holds while a finger or mouse is down on the track, and
    // restarts its 2s count after any swipe, arrow or dot tap.
    function initAutoplay() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const AUTOPLAY_MS = 2000;
      let timer = null;
      let inView = false;
      let held = false;

      const stop = () => { clearInterval(timer); timer = null; };
      const start = () => {
        stop();
        if (!inView || held || !isActive() || document.hidden) return;
        timer = setInterval(() => {
          const next = getCurrentPage() + 1;
          goTo(next > getPageCount() - 1 ? 0 : next);
        }, AUTOPLAY_MS);
      };
      const hold = () => { held = true; stop(); };
      const release = () => { held = false; start(); };

      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        start();
      }, { threshold: 0.5 }).observe(track);

      track.addEventListener('touchstart', hold, { passive: true });
      track.addEventListener('touchend', release, { passive: true });
      track.addEventListener('touchcancel', release, { passive: true });
      track.addEventListener('mousedown', hold);
      track.addEventListener('mouseup', release);
      track.addEventListener('mouseleave', () => { if (held) release(); });
      [prevBtn, nextBtn, dotsContainer].forEach((el) => el.addEventListener('click', start));
      document.addEventListener('visibilitychange', start);
      phoneQuery.addEventListener('change', start);
    }

    if (isActive()) {
      init();
    } else {
      const onChange = (e) => {
        if (!e.matches) return;
        phoneQuery.removeEventListener('change', onChange);
        init();
      };
      phoneQuery.addEventListener('change', onChange);
    }
  });
})();

/* ============================================
   PACKAGES CAROUSEL
============================================ */
// Infinite 1-card-step carousel for #packages. Three clones of each end are
// prepended/appended so any page the user can see also exists one step past the
// real cards; when a transition lands on a clone page the track is jumped
// (transition: none) onto the identical real page. Autoplay 10 s, only while on
// screen, off under prefers-reduced-motion and on a hidden tab; it keeps running
// under a hovering pointer and stops for good at the first click/tap/drag on the
// carousel (client request 2026-10-09). Card widths come from CSS; the step
// (card width + gap) is measured and re-measured on width-only resizes.
(function () {
  const root = document.querySelector('[data-pkg-carousel]');
  if (!root) return;
  const viewport = root.querySelector('[data-pkg-viewport]');
  const track = root.querySelector('[data-pkg-track]');
  const prevBtn = root.querySelector('[data-pkg-prev]');
  const nextBtn = root.querySelector('[data-pkg-next]');
  const dotsEl = root.querySelector('[data-pkg-dots]');
  if (!viewport || !track || !prevBtn || !nextBtn || !dotsEl) return;

  const cards = Array.from(track.children);
  const N = cards.length;
  if (N < 2) return;

  const CLONES = 3;            // = max cards per view: one full page each side
  const AUTOPLAY_MS = 10000;
  const SWIPE_PX = 40;
  const CLICK_CANCEL_PX = 8;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- clones ---- */
  const makeClone = (i) => {
    const c = cards[i].cloneNode(true);
    c.classList.add('pkg-clone');
    c.removeAttribute('data-animate');
    c.setAttribute('aria-hidden', 'true');
    c.dataset.pkgClone = String(i);
    c.querySelectorAll('a, button').forEach((el) => { el.tabIndex = -1; });
    return c;
  };
  const head = [];
  const tail = [];
  for (let k = 0; k < CLONES; k++) {
    tail.push(makeClone(k % N));
    head.unshift(makeClone(((N - 1 - k) % N + N) % N));
  }
  track.prepend(...head);
  track.append(...tail);
  const slots = Array.from(track.children);   // CLONES + N + CLONES

  /* ---- geometry ---- */
  let pos = CLONES;                            // slot index of the left-most visible card
  let step = 0;
  const measure = () => {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    step = slots[0].getBoundingClientRect().width + gap;
  };
  const realIndex = (p) => (((p - CLONES) % N) + N) % N;
  const render = (animate) => {
    if (!animate) track.style.transition = 'none';
    track.style.transform = `translate3d(${-pos * step}px, 0, 0)`;
    if (!animate) { void track.offsetWidth; track.style.transition = ''; }
  };

  /* ---- dots ---- */
  const dots = [];
  const buildDots = () => {
    dotsEl.replaceChildren();
    dots.length = 0;
    for (let i = 0; i < N; i++) {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'why-dot';
      d.setAttribute('aria-label', `Go to package ${i + 1}`);
      d.addEventListener('click', () => { goTo(i); start(); });
      dotsEl.appendChild(d);
      dots.push(d);
    }
  };
  const updateDots = () => {
    const cur = realIndex(pos);
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  };

  /* ---- movement + seamless wrap ---- */
  let busy = false;
  let settleTimer = 0;
  const settle = () => {
    if (!busy) return;
    busy = false;
    clearTimeout(settleTimer);
    if (pos >= CLONES + N) { pos -= N; render(false); }      // clone page -> same pixels, real cards
    else if (pos < CLONES) { pos += N; render(false); }
  };
  track.addEventListener('transitionend', (e) => {
    if (e.target === track && e.propertyName === 'transform') settle();
  });
  const moveBy = (delta) => {
    if (busy || !delta) return;
    const target = pos + delta;
    if (target < 0 || target >= slots.length) return;
    busy = true;
    pos = target;
    render(true);
    updateDots();
    const dur = parseFloat(getComputedStyle(track).transitionDuration) || 0;
    if (!dur) { settle(); return; }                           // reduced motion: no transitionend
    settleTimer = setTimeout(settle, dur * 1000 + 100);       // safety if transitionend is lost
  };
  const next = () => moveBy(1);
  const prev = () => moveBy(-1);
  const goTo = (i) => moveBy(CLONES + i - pos);

  prevBtn.addEventListener('click', () => { prev(); start(); });
  nextBtn.addEventListener('click', () => { next(); start(); });

  /* ---- swipe / drag (pointer events; click is cancelled only after a real drag) ---- */
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let dx = 0;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (busy) return;
    dragging = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    dx = 0;
  });
  const endDrag = (e, cancelled) => {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    track.classList.remove('is-dragging');
    const dir = !cancelled && Math.abs(dx) >= SWIPE_PX ? (dx < 0 ? 1 : -1) : 0;
    if (dir) moveBy(dir); else render(true);                  // snap back
    setTimeout(() => { dx = 0; }, 0);                         // after the click has been judged
  };
  window.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    dx = e.clientX - startX;
    // Only a real drag disables the cards' pointer events; adding the class on
    // pointerdown would make every plain click land on the track instead of the link.
    if (Math.abs(dx) > CLICK_CANCEL_PX) track.classList.add('is-dragging');
    track.style.transform = `translate3d(${-pos * step + dx}px, 0, 0)`;
  });
  window.addEventListener('pointerup', (e) => endDrag(e, false));
  window.addEventListener('pointercancel', (e) => endDrag(e, true));
  track.addEventListener('click', (e) => {
    if (Math.abs(dx) > CLICK_CANCEL_PX) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  track.addEventListener('dragstart', (e) => e.preventDefault());

  /* ---- autoplay ---- */
  let timer = 0;
  let inView = false;
  let stopped = false;                                        // first user interaction ends autoplay
  const canPlay = () => inView && !stopped && !document.hidden && !reduceMotion.matches;
  function stop() { clearTimeout(timer); timer = 0; }
  function start() {                                          // (re)starts the 10 s count
    stop();
    if (!canPlay()) return;
    timer = setTimeout(() => { next(); start(); }, AUTOPLAY_MS);
  }

  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    start();
  }, { threshold: 0.5 }).observe(viewport);
  // Any click, tap or drag on the carousel (cards, arrows, dots) stops autoplay until
  // the page is reloaded. Hovering does not.
  root.addEventListener('pointerdown', () => { stopped = true; stop(); }, true);
  document.addEventListener('visibilitychange', start);
  reduceMotion.addEventListener('change', start);

  /* ---- width-only resize (phone URL bar fires height-only resizes) ---- */
  let lastW = window.innerWidth;
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      measure();
      render(false);
    }, 120);
  });

  buildDots();
  measure();
  render(false);
  updateDots();
})();

/* ============================================
   FAQ ACCORDION
============================================ */
(function () {
  document.querySelectorAll('.faq-q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item').forEach((i) => {
        i.classList.remove('open');
        i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      // Open clicked if it wasn't open
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();

/* ============================================
   MOBILE HAMBURGER NAV
============================================ */
(function () {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav');
  if (!hamburger || !nav) return;

  hamburger.addEventListener('click', () => {
    const expanded = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('open', !expanded);
  });

  // Close nav when a link is clicked
  nav.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !nav.contains(e.target)) {
      hamburger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    }
  });
})();

/* ============================================
   STICKY HEADER — shadow on scroll
============================================ */
(function () {
  const header = document.querySelector('.header');
  if (!header) return;
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 60) {
      header.style.boxShadow = '0 4px 24px rgba(10,10,10,.08)';
    } else {
      header.style.boxShadow = 'none';
    }
    lastY = y;
  }, { passive: true });
})();

/* ============================================
   WD CLIENT JOURNEY — Horizontal Carousel
============================================ */
(function () {
  const track      = document.getElementById('cjTrack');
  const prevBtn    = document.getElementById('cjPrev');
  const nextBtn    = document.getElementById('cjNext');
  const dotsCont   = document.getElementById('cjDots');
  const counterEl  = document.getElementById('cjCurrent');
  if (!track) return;

  const cards = Array.from(track.querySelectorAll('.cj-card'));
  const total = cards.length;
  let current = 0;

  /* How many cards fit on screen */
  function visibleCount() {
    const w = window.innerWidth;
    if (w >= 1101) return 3;
    if (w >= 721)  return 2;
    return 1;
  }

  /* Max scroll index */
  function maxIndex() {
    return Math.max(0, total - visibleCount());
  }

  /* Slide to a given card index */
  function goTo(index) {
    current = Math.max(0, Math.min(index, maxIndex()));

    /* Pixel offset: card width + gap (20px) */
    const cardW  = cards[0].offsetWidth;
    const gap    = 20;
    track.style.transform = `translateX(-${current * (cardW + gap)}px)`;

    /* Update dots */
    dotsCont.querySelectorAll('.cj-ndot').forEach((dot, i) => {
      dot.classList.toggle('cj-ndot--active', i === current);
    });

    /* Update counter */
    if (counterEl) counterEl.textContent = current + 1;

    /* Disable boundary buttons */
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current >= maxIndex();
  }

  /* Button clicks */
  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  /* Dot clicks */
  dotsCont.querySelectorAll('.cj-ndot').forEach((dot, i) => {
    dot.addEventListener('click', () => goTo(i));
  });

  /* Resize — recalculate without losing position */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => goTo(current), 120);
  });

  /* ── Mouse drag ── */
  let dragStartX = 0;
  let isDragging = false;

  track.addEventListener('mousedown', (e) => {
    dragStartX = e.clientX;
    isDragging = true;
    track.classList.add('is-dragging');
  });
  window.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');
    const diff = e.clientX - dragStartX;
    if (Math.abs(diff) > 50) goTo(diff < 0 ? current + 1 : current - 1);
  });

  /* ── Touch swipe ── */
  let touchStartX = 0;
  track.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  track.addEventListener('touchend', (e) => {
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 40) goTo(diff < 0 ? current + 1 : current - 1);
  }, { passive: true });

  /* ── Keyboard support (when section is focused) ── */
  track.closest('.cj').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { resetAutoPlay(); goTo(current + 1); }
    if (e.key === 'ArrowLeft')  { resetAutoPlay(); goTo(current - 1); }
  });

  /* ─────────────────────────────────────────────
     AUTO-PLAY
     • Advances every 3 s
     • Wraps back to 0 after the last card
     • Keeps scrolling on hover; pauses only on touch / hidden tab
     • Progress bar fills over each interval
  ───────────────────────────────────────────── */
  const AUTO_DELAY = 3000; // ms per slide
  let autoTimer   = null;
  let touching    = false;  // active touch interaction

  /* Inject a thin progress bar under the nav counter */
  const progressBar = document.createElement('div');
  progressBar.className = 'cj-auto-bar';
  progressBar.innerHTML = '<div class="cj-auto-fill"></div>';
  dotsCont.closest('.cj-nav').appendChild(progressBar);
  const autoFill = progressBar.querySelector('.cj-auto-fill');

  function startFill() {
    autoFill.style.transition = 'none';
    autoFill.style.width = '0%';
    /* Force reflow so the next transition starts from 0 */
    void autoFill.offsetWidth;
    autoFill.style.transition = `width ${AUTO_DELAY}ms linear`;
    autoFill.style.width = '100%';
  }
  function stopFill() {
    autoFill.style.transition = 'none';
    autoFill.style.width = '0%';
  }

  function nextAuto() {
    /* Wrap back to 0 when we reach the end */
    const next = current >= maxIndex() ? 0 : current + 1;
    goTo(next);
    startFill();
  }

  function isPaused() {
    return touching || document.hidden;
  }

  function startAutoPlay() {
    clearInterval(autoTimer);
    if (isPaused()) return;            // never advance while paused
    autoTimer = setInterval(nextAuto, AUTO_DELAY);
    startFill();
  }

  function stopAutoPlay() {
    clearInterval(autoTimer);
    autoTimer = null;
    stopFill();
  }

  function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  /* ── Pause on touch (so a swipe isn't fighting the auto-advance) ── */
  track.addEventListener('touchstart', () => {
    touching = true;
    stopAutoPlay();
  }, { passive: true });
  track.addEventListener('touchend', () => {
    touching = false;
    setTimeout(startAutoPlay, 600); // brief delay after swipe
  }, { passive: true });

  /* Manual nav resets the timer */
  prevBtn.addEventListener('click', resetAutoPlay, { capture: true });
  nextBtn.addEventListener('click', resetAutoPlay, { capture: true });
  dotsCont.querySelectorAll('.cj-ndot').forEach(dot => {
    dot.addEventListener('click', resetAutoPlay, { capture: true });
  });

  /* Pause when tab is hidden, resume when visible */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoPlay();
    else                 startAutoPlay(); // startAutoPlay self-guards via isPaused()
  });

  /* Init */
  goTo(0);
  startAutoPlay();
})();

/* ============================================
   FORM SUBMISSION HANDLER
============================================ */
function handleFormSubmit(form) {
  const btn = form.querySelector('.hf-submit');
  const originalText = btn.innerHTML;

  // Visual feedback
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite">
      <circle cx="12" cy="12" r="10" stroke-opacity=".25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white"/>
    </svg>
    Submitting...
  `;
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Submitted! We'll be in touch.
    `;
    btn.style.background = '#6B7F4A';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
      btn.disabled = false;
      form.reset();
    }, 3500);
  }, 1200);
}

/* CSS animation for spinner */
(function () {
  const style = document.createElement('style');
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
})();

/* ============================================
   SMOOTH ANCHOR SCROLL (offset for sticky header)
============================================ */
(function () {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function(e) {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const headerH = document.querySelector('.header')?.offsetHeight || 0;
      const y = target.getBoundingClientRect().top + window.scrollY - headerH - 20;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
})();

/* ============================================
   HERO BACKGROUND — Indian Family Image Loader
   Tries primary saved image, falls back to
   luxury home exterior if not yet available
============================================ */
(function () {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;
  const img = new Image();
  img.onload = function () { /* primary loaded fine — CSS already set */ };
  img.onerror = function () {
    /* fallback: luxury modern home exterior */
    heroBg.style.backgroundImage = "url('https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=2400&fit=crop')";
    heroBg.style.backgroundPosition = 'center center';
  };
  img.src = 'images/hero-family.jpg';
})();

/* ============================================
   BEYOND CARDS — Auto-fading photo slideshow
   Crossfades the images inside each project card
   visual. Staggered so the three cards don't flip
   in unison; pauses when the tab is hidden.
============================================ */
(function () {
  const groups = document.querySelectorAll('[data-slides]');
  if (!groups.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const DELAY = 3500; // ms each image stays visible

  groups.forEach((group, gi) => {
    const slides = Array.from(group.querySelectorAll('.beyond-card-photo'));
    if (slides.length < 2) return;

    let i = slides.findIndex((s) => s.classList.contains('is-active'));
    if (i < 0) { i = 0; slides[0].classList.add('is-active'); }
    let timer = null;

    const advance = () => {
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-active');
    };
    const start = () => { if (!timer) timer = setInterval(advance, DELAY); };
    const stop = () => { clearInterval(timer); timer = null; };

    // Stagger each card's start so they cycle out of sync
    setTimeout(start, gi * 1100);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
  });
})();
