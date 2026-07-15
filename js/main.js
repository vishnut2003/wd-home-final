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

    const getCardsPerView = () => {
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
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        buildDots();
        goTo(0);
        update();
      }, 150);
    });

    buildDots();
    update();
  });
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
     • Advances every 3.5 s
     • Wraps back to 0 after the last card
     • Pauses on hover / touch / focus
     • Progress bar fills over each interval
  ───────────────────────────────────────────── */
  const AUTO_DELAY = 3500; // ms per slide
  let autoTimer   = null;
  let paused      = false;

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

  function startAutoPlay() {
    if (paused) return;
    clearInterval(autoTimer);
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

  /* Pause on hover */
  const section = track.closest('.cj');
  section.addEventListener('mouseenter', () => { paused = true;  stopAutoPlay(); });
  section.addEventListener('mouseleave', () => { paused = false; startAutoPlay(); });

  /* Pause on touch */
  track.addEventListener('touchstart', () => { paused = true; stopAutoPlay(); }, { passive: true });
  track.addEventListener('touchend',   () => {
    paused = false;
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
    if (document.hidden) { stopAutoPlay(); }
    else if (!paused)    { startAutoPlay(); }
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
