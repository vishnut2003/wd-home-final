/* ============================================
   HOW IT WORKS — page behaviour
   Runs after main.js (reveal, hamburger, sticky header, anchor scroll,
   handleFormSubmit all come from there).
============================================ */
(function () {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.header');
  const rail = document.querySelector('.hiw-rail');
  const railList = document.querySelector('.hiw-rail-list');
  const steps = Array.from(document.querySelectorAll('.hiw-step'));
  if (!steps.length) return;

  const stepperItems = Array.from(document.querySelectorAll('.hiw-stepper-item'));
  const railLinks = Array.from(document.querySelectorAll('.hiw-rail-link'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const total = steps.length;

  /* ── Header height → CSS var (rail offset, scroll margins) ── */
  function setHeaderVar() {
    if (!header) return;
    root.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  setHeaderVar();
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastW) return; // ignore mobile URL-bar height changes
    lastW = window.innerWidth;
    setHeaderVar();
  });
  window.addEventListener('load', setHeaderVar);

  /* ── Active step bookkeeping ── */
  let current = 0;

  function setState(el, n, active) {
    if (!el) return;
    el.classList.toggle('is-active', n === active);
    el.classList.toggle('is-done', n < active);
  }

  function scrollRailTo(link) {
    if (!railList || !link) return;
    if (railList.scrollWidth <= railList.clientWidth + 2) return;
    const left = link.offsetLeft - (railList.clientWidth - link.offsetWidth) / 2;
    if (reduceMotion || typeof railList.scrollTo !== 'function') railList.scrollLeft = left;
    else railList.scrollTo({ left: left, behavior: 'smooth' });
  }

  function activate(n) {
    if (n === current) return;
    current = n;
    steps.forEach((s, i) => setState(s, i + 1, n));
    stepperItems.forEach((it) => setState(it, Number(it.dataset.step), n));
    railLinks.forEach((l) => {
      const k = Number(l.dataset.step);
      setState(l, k, n);
      if (k === n) l.setAttribute('aria-current', 'step'); else l.removeAttribute('aria-current');
    });
    stepperItems.forEach((it) => {
      const a = it.querySelector('a');
      if (!a) return;
      if (Number(it.dataset.step) === n) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    const pct = n > 0 ? ((n - 1) / (total - 1)) * 100 : 0;
    root.style.setProperty('--hiw-progress', pct + '%');
    scrollRailTo(railLinks.find((l) => Number(l.dataset.step) === n));
  }

  /* ── Which step is "on screen": topmost section crossing the 35–45% band ── */
  const visible = new Set();
  function pickActive() {
    if (!visible.size) {
      // Nothing in the band: above the steps → neutral; below them → keep the last state.
      if (steps[0].getBoundingClientRect().top > window.innerHeight * .45) activate(0);
      return;
    }
    let best = null;
    visible.forEach((s) => {
      if (!best || s.getBoundingClientRect().top < best.getBoundingClientRect().top) best = s;
    });
    if (best) activate(Number(best.dataset.step));
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      pickActive();
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    steps.forEach((s) => io.observe(s));
  } else {
    activate(1);
  }

  /* ── Anchor clicks on stepper / rail: offset by header + rail height ── */
  function offsetTop() {
    const h = header ? header.offsetHeight : 0;
    const r = rail ? rail.offsetHeight : 0;
    return h + r + 16;
  }
  document.querySelectorAll('.hiw-stepper-link, .hiw-rail-link').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      const target = href && href.charAt(0) === '#' ? document.querySelector(href) : null;
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - offsetTop();
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', href);
    });
  });

  /* ── CTAs that lead to the form: focus the first field once we arrive ── */
  const firstField = document.getElementById('w-fn');
  document.querySelectorAll('a[href="#hiw-form"]').forEach((a) => {
    a.addEventListener('click', () => {
      if (!firstField) return;
      window.setTimeout(() => { try { firstField.focus({ preventScroll: true }); } catch (err) { /* noop */ } }, 700);
    });
  });
})();
